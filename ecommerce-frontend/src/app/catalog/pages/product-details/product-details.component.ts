import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of, Subscription } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { FormBuilder, Validators } from '@angular/forms';

import { Product } from '../../models/product';
import { ProductService } from '../../services/product.service';
import { ReviewService } from '../../services/review.service';
import { Review } from '../../models/review';
import { AuthService } from '../../../auth/services/auth.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { CartService } from '../../../shop/services/cart.service';

@Component({
  selector: 'app-product-details',
  templateUrl: './product-details.component.html',
  styleUrls: ['./product-details.component.scss']
})
export class ProductDetailsComponent implements OnInit {
  public Math = Math;

  product$!: Observable<Product | undefined>;
  reviews$!: Observable<Review[]>;
  reviewCount$!: Observable<number>;
  avgRating$!: Observable<number | null>;

  fallback = 'assets/placeholder-product.png';
  mainImg = '';
  qty = 1;

  reviewForm = this.fb.group({
    rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    comment: ['', [Validators.required, Validators.maxLength(500)]],
  });

  productId!: number;
  hasReviewed = false;
  submittingReview = false;

  private _revSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    public router: Router, // made public for template returnUrl
    private productSvc: ProductService,
    private reviewSvc: ReviewService,
    public auth: AuthService,
    private notify: NotificationsService,
    private fb: FormBuilder,
    private cart: CartService
  ) {}

  ngOnInit(): void {
    this.product$ = this.route.paramMap.pipe(
      switchMap(params => {
        const id = Number(params.get('id'));
        this.productId = id;
        return this.productSvc.getProductById(id);
      }),
      tap(p => { if (p) this.mainImg = p.imageUrl; })
    );

    this.attachReviewsStream();
  }

  private attachReviewsStream() {
    // load reviews from backend
    this.reviews$ = this.route.paramMap.pipe(
      switchMap(params => {
        const id = Number(params.get('id'));
        return id ? this.reviewSvc.getForProduct(id) : of([]);
      })
    );

    // derive aggregates
    this.reviewCount$ = this.reviews$.pipe(map(list => list.length));
    this.avgRating$ = this.reviews$.pipe(
      map(list => {
        if (!list.length) return null;
        const sum = list.reduce((s, r) => s + r.rating, 0);
        return Math.round((sum / list.length) * 10) / 10;
      })
    );

    // compute "hasReviewed" based on backend data + logged-in user
    this._revSub?.unsubscribe();
    this._revSub = this.reviews$.subscribe(list => {
      const u = this.auth.user;
      this.hasReviewed = !!u && list.some(
        r => r.userId === u.id || (!!r.userEmail && r.userEmail === u.email)
      );
    });
  }

  setMain(img: string) { this.mainImg = img; }
  onImgError(ev: Event) {
    const img = ev.target as HTMLImageElement;
    img.onerror = null; img.src = this.fallback;
  }
  inc(p: Product) {
    const max = (p as any).stock ?? 0;
    this.qty = Math.min(this.qty + 1, Math.max(1, max));
  }
  dec() { this.qty = Math.max(1, this.qty - 1); }

  addToCart(p: Product) {
    const stock = (p as any).stock ?? 0;
    if (stock <= 0) { this.notify.info('Out of stock', p.title); return; }
    this.cart.add({ id: p.id, title: p.title, price: p.price, imageUrl: p.imageUrl, stock }, this.qty);
    this.notify.success('Added to cart', `${p.title} ×${this.qty}`);
  }
  buyNow(p: Product) {
    const stock = (p as any).stock ?? 0;
    if (stock <= 0) { this.notify.info('Out of stock', p.title); return; }
    this.cart.add({ id: p.id, title: p.title, price: p.price, imageUrl: p.imageUrl, stock }, this.qty);
    this.router.navigate(['/shop/checkout']);
  }
  toCatalog() { this.router.navigate(['/catalog']); }

  // reviews
  trackByReview = (_: number, r: Review) => r.id;

  submitReview() {
    if (!this.auth.isLoggedIn) {
      this.notify.info('Please sign in to review');
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    if (this.hasReviewed) {
      this.notify.info('You already reviewed this product');
      return;
    }
    if (this.reviewForm.invalid) {
      this.reviewForm.markAllAsTouched();
      return;
    }

    const { rating, comment } = this.reviewForm.value;
    this.submittingReview = true;

    this.reviewSvc.add(this.productId, Number(rating), String(comment)).subscribe({
      next: () => {
        this.notify.success('Thanks for your review!');
        this.reviewForm.reset({ rating: 5, comment: '' });
        this.hasReviewed = true;
        // refresh list from backend
        this.attachReviewsStream();
      },
      error: (e) => {
        this.notify.error('Could not submit review', e?.error?.message || e?.message || 'Please try again.');
      },
      complete: () => { this.submittingReview = false; }
    });
  }
}
