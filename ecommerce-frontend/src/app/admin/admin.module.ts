import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { SharedModule } from '../shared/shared.module';
import { AdminRoutingModule } from './admin-routing.module';

import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ProductFormComponent } from './pages/product-form/product-form.component';
import { AdminOrdersComponent } from './pages/orders/orders.component'; // ⬅️ import renamed class

@NgModule({
  declarations: [
    DashboardComponent,
    ProductFormComponent,
    AdminOrdersComponent // ⬅️ use renamed component
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    SharedModule,
    AdminRoutingModule
  ]
})
export class AdminModule {}
