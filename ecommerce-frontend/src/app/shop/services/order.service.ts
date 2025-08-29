import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { Address, Order, PaymentMethod } from '../models/cart';
import { CartService } from './cart.service';
import { environment } from '../../../environments/environment';

const API = environment.apiBase;

@Injectable({ providedIn: 'root' })
export class OrderService {
  constructor(
    private http: HttpClient,
    private cart: CartService,
  ) {}

  create$(address: Address, method: PaymentMethod): Observable<Order> {
    const items = this.cart.snapshot.map(i => ({ id: i.id, qty: i.qty }));
    const coupon = this.cart.coupon || undefined;
    return this.http.post<Order>(`${API}/orders`, { items, address, method, coupon });
  }

  myOrders$: Observable<Order[]> = this.http.get<Order[]>(`${API}/orders`).pipe(
    map(list => list || [])
  );

  cancel$(orderId: number | string): Observable<{ ok: boolean }> {
    return this.http.patch<{ ok: boolean }>(`${API}/orders/${orderId}`, { action: 'cancel' });
  }
}
