import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export type OrderStatus = 'Created' | 'Paid' | 'Dispatched' | 'Delivered' | 'Cancelled';

export interface OrderItem {
  id: number;
  title: string;
  price: number;
  qty: number;
  imageUrl?: string;
}
export interface Order {
  id: string | number;
  userId?: number;
  userName?: string;
  email?: string;
  items: OrderItem[];
  amount: number;
  status: OrderStatus;
  createdAt: string;
  timeline?: Array<{ status: OrderStatus; at: string }>;
  address?: {
    name?: string; line1?: string; line2?: string;
    city?: string; state?: string; zip?: string; phone?: string;
  };
  payment?: { method: 'CARD' | 'UPI' | 'COD' | string; txnId?: string; };
}

const API = environment.apiBase;

@Injectable({ providedIn: 'root' })
export class AdminOrdersService {
  private _orders = new BehaviorSubject<Order[]>([]);
  readonly orders$ = this._orders.asObservable();

  constructor(private http: HttpClient) {
    this.refresh();
  }

  refresh() {
    this.http.get<Order[]>(`${API}/admin/orders`).subscribe(list => this._orders.next(list || []));
  }

  updateStatus(id: string | number, status: OrderStatus) {
    this.http.patch(`${API}/orders/${id}`, { status })
      .pipe(tap(() => this.refresh()))
      .subscribe({ error: () => {} });
  }
}
