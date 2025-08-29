import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ProductFormComponent } from './pages/product-form/product-form.component';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminOrdersComponent } from './pages/orders/orders.component'; 

const routes: Routes = [
  { path: '', component: DashboardComponent, canActivate: [AdminGuard] },
  { path: 'products/new', component: ProductFormComponent, canActivate: [AdminGuard] },
  { path: 'products/:id/edit', component: ProductFormComponent, canActivate: [AdminGuard] },
  { path: 'orders', component: AdminOrdersComponent, canActivate: [AdminGuard] }, 
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule {}
