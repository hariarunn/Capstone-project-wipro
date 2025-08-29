import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { Order, OrderStatus } from '../../models/cart';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent {
  orders$: Observable<Order[]> = this.ordersSvc.myOrders$;

  constructor(private ordersSvc: OrderService) {}

  progressIdx(s: OrderStatus) {
    return ['Created','Paid','Dispatched','Delivered'].indexOf(s);
  }
}
