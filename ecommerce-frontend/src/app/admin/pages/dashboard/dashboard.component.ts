import { Component } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { combineLatest, Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { Product } from '../../../catalog/models/product';
import { AdminProductService } from '../../services/admin-product.service';
import { Router } from '@angular/router';
import { NotificationsService } from '../../../core/services/notifications.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  q = this.fb.control('');
  category = this.fb.control('All');
  sort = this.fb.control('updated');

  categories$ = this.svc.categories$;
  fallback = 'assets/placeholder-product.png';

  filtered$: Observable<Product[]> = combineLatest([
    this.svc.list$,
    this.q.valueChanges.pipe(startWith(this.q.value || '')),
    this.category.valueChanges.pipe(startWith(this.category.value || 'All')),
    this.sort.valueChanges.pipe(startWith(this.sort.value || 'updated')),
  ]).pipe(
    map(([list, q, cat, sort]) => {
      const query = (q || '').toLowerCase().trim();
      let out = list.filter(p => {
        const matchesQ = !query || p.title.toLowerCase().includes(query) || p.description.toLowerCase().includes(query);
        const matchesCat = (cat || 'All') === 'All' || p.category === cat;
        return matchesQ && matchesCat;
      });

      switch (sort) {
        case 'priceAsc':  out = out.sort((a,b) => a.price - b.price); break;
        case 'priceDesc': out = out.sort((a,b) => b.price - a.price); break;
        case 'stockAsc':  out = out.sort((a,b) => this.stock(a) - this.stock(b)); break;
        case 'stockDesc': out = out.sort((a,b) => this.stock(b) - this.stock(a)); break;
        default:          out = out.sort((a,b) => b.id - a.id); // "updated" mock
      }
      return out;
    })
  );

  constructor(
    private fb: FormBuilder,
    public svc: AdminProductService,
    private router: Router,
    private notify: NotificationsService
  ) {}

  addNew() { this.router.navigate(['/admin/products/new']); }
  edit(p: Product) { this.router.navigate(['/admin/products', p.id, 'edit']); }
  goOrders() { this.router.navigate(['/admin/orders']); }

  remove(p: Product) {
    if (confirm(`Delete "${p.title}"? This cannot be undone.`)) {
      this.svc.delete(p.id);
      this.notify.info('Product deleted', p.title);
    }
  }

  stock(p: Product): number { return (p as any)?.stock ?? 10; }
  isInStock(p: Product): boolean { return (p as any)?.inStock !== false; }

  onImgErr(ev: Event) {
    const img = ev.target as HTMLImageElement;
    img.onerror = null;
    img.src = this.fallback;
  }
}
