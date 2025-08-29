// src/app/shop/pages/cart/cart.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

import { CartService } from '../../services/cart.service';
import { CartItem, CartTotals } from '../../models/cart';
import { NotificationsService } from '../../../core/services/notifications.service';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss']
})
export class CartComponent {
  items$: Observable<CartItem[]> = this.cart.items$;
  totals$: Observable<CartTotals> = this.cart.totals$;

  code = '';

  constructor(
    public cart: CartService,
    private router: Router,
    private notify: NotificationsService
  ) {}

  inc(i: CartItem) {
    const next = Math.min(i.qty + 1, i.stock);
    this.cart.setQty(i.id, next);
    this.notify.info('Quantity updated', `${i.title} ×${next}`);
  }

  dec(i: CartItem) {
    const next = Math.max(i.qty - 1, 1);
    this.cart.setQty(i.id, next);
    this.notify.info('Quantity updated', `${i.title} ×${next}`);
  }

  remove(i: CartItem) {
    this.cart.remove(i.id);
    this.notify.info('Removed from cart', i.title);
  }

  onQtyChange(i: CartItem, ev: Event) {
    const val = +(ev.target as HTMLInputElement).value || 1;
    const capped = Math.max(1, Math.min(val, i.stock));
    this.cart.setQty(i.id, capped);
    this.notify.info('Quantity updated', `${i.title} ×${capped}`);
  }

  applyCoupon() {
    const code = (this.code || '').trim().toUpperCase();

    if (!code) {
      const ok = this.cart.applyCoupon('');
      if (ok) this.notify.info('Coupon cleared');
      return;
    }

    const ok = this.cart.applyCoupon(code);
    if (ok) {
      if (code === 'DEAL10') this.notify.success('Coupon applied: 10% off', code);
      else if (code === 'FREESHIP') this.notify.success('Free shipping applied', code);
      else this.notify.success('Coupon applied', code);
    } else {
      this.notify.error('Invalid coupon code', code);
    }
  }

  goCheckout() {
    this.router.navigate(['/shop/checkout']);
  }

  trackById(_: number, x: CartItem) { return x.id; }
}
