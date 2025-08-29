import {
  Component, OnDestroy, OnInit, AfterViewInit, ViewChild, ElementRef, signal
} from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs';
import { debounceTime, map, startWith, takeUntil } from 'rxjs/operators';
import { Product } from '../../models/product';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../../shop/services/cart.service';
import { NotificationsService } from '../../../core/services/notifications.service';

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss']
})
export class ProductListComponent implements OnInit, OnDestroy, AfterViewInit {
  public Math = Math;

  // hero
  heroUrl = 'https://img.freepik.com/free-photo/flat-lay-musical-background-with-black-white-headphones_169016-52173.jpg?semt=ais_hybrid&w=740&q=80';
  onHeroError() { this.heroUrl = this.fallback; }
  fallback = 'assets/placeholder-product.png';

  // filters
  categories$: Observable<string[]> = this.productSvc.getCategories();
  form = this.fb.group({
    q: [''],
    category: ['All'],
    minPrice: [''],
    maxPrice: [''],
    minRating: ['0'],
    sort: ['relevance']
  });

  // data
  products$ = this.productSvc.products$;
  filtered$!: Observable<Product[]>;

  // Today’s Deals
  deals$: Observable<Product[]> = this.products$.pipe(
    map(items => items
      .filter(p => (p as any).oldPrice && p.price < (p as any).oldPrice)
      .sort((a, b) => this.discount(b) - this.discount(a))
      .slice(0, 10))
  );
  isDealsMode = false;

  // pagination
  private readonly pageSize = 12;
  private showN$ = new BehaviorSubject<number>(this.pageSize);
  visible$!: Observable<Product[]>;
  hasMore$!: Observable<boolean>;

  @ViewChild('ioSentinel', { static: false }) ioSentinel?: ElementRef<HTMLDivElement>;
  private io?: IntersectionObserver;
  private ioBusy = false;

  loading = signal(true);
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private productSvc: ProductService,
    private cartSvc: CartService,
    private notify: NotificationsService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // init from query params
    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(m => {
        this.isDealsMode = m.has('deal');
        const v = {
          q: m.get('q') ?? '',
          category: m.get('category') ?? 'All',
          minPrice: m.get('minPrice') ?? '',
          maxPrice: m.get('maxPrice') ?? '',
          minRating: m.get('minRating') ?? '0',
          sort: m.get('sort') ?? 'relevance'
        };
        this.form.patchValue(v, { emitEvent: false });
        this.resetPaging();
      });

    this.filtered$ = combineLatest([
      this.products$,
      this.form.valueChanges.pipe(startWith(this.form.value), debounceTime(120))
    ]).pipe(
      map(([items, f]) => {
        const q = (f.q || '').toLowerCase().trim();
        const cat = f.category || 'All';
        const minP = f.minPrice ? Number(f.minPrice) : -Infinity;
        const maxP = f.maxPrice ? Number(f.maxPrice) : Infinity;
        const minR = f.minRating ? Number(f.minRating) : 0;

        let out = items.filter(p => {
          const matchesQ = !q || p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
          const matchesCat = cat === 'All' || p.category === cat;
          const matchesPrice = p.price >= minP && p.price <= maxP;
          const matchesRating = p.rating >= minR;
          return matchesQ && matchesCat && matchesPrice && matchesRating;
        });

        if (this.isDealsMode) {
          out = out.filter(p => (p as any).oldPrice && p.price < (p as any).oldPrice);
        }

        switch (f.sort) {
          case 'priceAsc':  out = out.sort((a, b) => a.price - b.price); break;
          case 'priceDesc': out = out.sort((a, b) => b.price - a.price); break;
          case 'newest':    out = out.sort((a, b) => b.id - a.id); break; // mock
          default:          /* relevance */ break;
        }
        return out;
      })
    );

    this.visible$ = combineLatest([this.filtered$, this.showN$]).pipe(map(([items, n]) => items.slice(0, n)));
    this.hasMore$ = combineLatest([this.filtered$, this.showN$]).pipe(map(([items, n]) => n < items.length));

    // reflect form to URL
    this.form.valueChanges
      .pipe(debounceTime(200), takeUntil(this.destroy$))
      .subscribe(f => {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {
            q: f.q || null,
            category: f.category && f.category !== 'All' ? f.category : null,
            minPrice: f.minPrice || null,
            maxPrice: f.maxPrice || null,
            minRating: f.minRating && f.minRating !== '0' ? f.minRating : null,
            sort: f.sort && f.sort !== 'relevance' ? f.sort : null,
            deal: this.isDealsMode ? 1 : null
          },
          queryParamsHandling: 'merge'
        });
        this.resetPaging();
      });

    // small delay for skeleton UX
    setTimeout(() => this.loading.set(false), 500);
  }

  ngAfterViewInit(): void {
    if (!this.ioSentinel) return;
    this.io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) this.loadMore();
    }, { root: null, rootMargin: '200px' });
    this.io.observe(this.ioSentinel.nativeElement);
  }

  ngOnDestroy(): void {
    this.destroy$.next(); this.destroy$.complete();
    this.io?.disconnect();
  }

  // ------------ Deals UX ------------
  seeAllDeals() {
    this.isDealsMode = true;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { deal: 1 },
      queryParamsHandling: 'merge'
    });
    this.resetPaging();
  }

  clearDeals() {
    this.isDealsMode = false;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { deal: null },
      queryParamsHandling: 'merge'
    });
    this.resetPaging();
  }
  // -----------------------------------

  private resetPaging() { this.showN$.next(this.pageSize); }

  loadMore() {
    if (this.ioBusy) return;
    this.ioBusy = true;
    this.showN$.next(this.showN$.value + this.pageSize);
    setTimeout(() => this.ioBusy = false, 250);
  }

  onImgError(ev: Event) {
    const img = ev.target as HTMLImageElement;
    img.onerror = null; img.src = this.fallback;
  }

  setRatingFilter(val: number) { this.form.patchValue({ minRating: String(val) }); }

  clearFilters() {
    this.form.patchValue({ q: '', category: 'All', minPrice: '', maxPrice: '', minRating: '0', sort: 'relevance' });
  }

  trackById = (_: number, p: Product) => p.id;

  // cart + toast (use real stock)
  addToCart(p: Product, ev: Event) {
    ev.preventDefault(); ev.stopPropagation();
    const stock = (p as any).stock ?? 0;
    if (stock <= 0) { this.notify.info('Out of stock', p.title); return; }
    this.cartSvc.add({ id: p.id, title: p.title, price: p.price, imageUrl: p.imageUrl, stock }, 1);
    this.notify.success('Added to cart', p.title);
  }

  addDealToCart(p: Product, ev: Event) { this.addToCart(p, ev); }

  discount(p: Product): number {
    const op = (p as any).oldPrice;
    return op && op > p.price ? Math.round((1 - p.price / op) * 100) : 0;
  }
}
