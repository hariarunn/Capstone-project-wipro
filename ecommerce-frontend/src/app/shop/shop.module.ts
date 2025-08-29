import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { SharedModule } from '../shared/shared.module';
import { ShopRoutingModule } from './shop-routing.module';

import { CartComponent } from './pages/cart/cart.component';
import { CheckoutComponent } from './pages/checkout/checkout.component';
import { OrdersComponent } from './pages/orders/orders.component';

@NgModule({
  declarations: [CartComponent, CheckoutComponent, OrdersComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,      // for [(ngModel)]
    RouterModule,
    SharedModule,
    ShopRoutingModule
  ]
})
export class ShopModule {}
