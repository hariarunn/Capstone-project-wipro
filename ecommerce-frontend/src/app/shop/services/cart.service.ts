import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { CartItem, CartTotals } from '../models/cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  private _items = new BehaviorSubject<CartItem[]>([]);
  readonly items$ = this._items.asObservable();

  // keep coupon in memory (not persisted)
  coupon: string | null = null;

  get snapshot(): CartItem[] { return this._items.value; }

  add(item: Omit<CartItem, 'qty'>, qty = 1) {
    if ((item.stock ?? 0) <= 0) return;
    const list = [...this.snapshot];
    const i = list.findIndex(x => x.id === item.id);
    if (i >= 0) {
      list[i].qty = Math.min(list[i].qty + qty, list[i].stock);
    } else {
      list.unshift({ ...item, qty: Math.min(qty, item.stock) });
    }
    this._items.next(list);
  }

  remove(id: number) { this._items.next(this.snapshot.filter(i => i.id !== id)); }

  clear() {
    this._items.next([]);
    this.coupon = null;
  }

  setQty(id: number, qty: number) {
    const capped = Math.max(1, Math.min(qty, this.snapshot.find(i => i.id === id)?.stock ?? 1));
    this._items.next(this.snapshot.map(i => i.id === id ? { ...i, qty: capped } : i));
  }

  applyCoupon(code: string): boolean {
    const up = (code || '').trim().toUpperCase();
    if (!up) { this.coupon = null; this._items.next([...this._items.value]); return true; }
    if (up === 'DEAL10' || up === 'FREESHIP') { this.coupon = up; this._items.next([...this._items.value]); return true; }
    return false;
  }

  totals$ = this.items$.pipe(map(() => this.computeTotals()));

  computeTotals(): CartTotals {
    const items = this.snapshot;
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const code = this.coupon;
    let discount = 0;
    if (code === 'DEAL10') discount = subtotal * 0.10;
    const afterDiscount = Math.max(0, subtotal - discount);
    const shipping = (afterDiscount >= 999 || code === 'FREESHIP' || items.length === 0) ? 0 : 49;
    const tax = afterDiscount * 0.12;
    const total = Math.round((afterDiscount + shipping + tax) * 100) / 100;
    return { subtotal, discount, shipping, tax, total, coupon: code };
  }
}
