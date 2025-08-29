// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AdminGuard } from './auth/guards/admin.guard';
import { AuthGuard } from './auth/guards/auth.guard';
import { GuestGuard } from './auth/guards/guest.guard';
import { NotFoundComponent } from './shared/pages/not-found/not-found.component';
import { ErrorComponent } from './shared/pages/error/error.component';

// ⬇️ add these
import { HelpCenterComponent } from './shared/pages/help-center/help-center.component';
import { ReturnsComponent } from './shared/pages/returns/returns.component';
import { ShippingComponent } from './shared/pages/shipping/shipping.component';
import { PrivacyComponent } from './shared/pages/privacy/privacy.component';
import { TermsComponent } from './shared/pages/terms/terms.component';

const routes: Routes = [
  { path: 'error', component: ErrorComponent },

  // Auth area – only for guests
  {
    path: 'auth',
    canActivate: [GuestGuard],
    loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule),
  },

  // Require login
  {
    path: 'catalog',
    canActivate: [AuthGuard],
    loadChildren: () => import('./catalog/catalog.module').then(m => m.CatalogModule),
  },
  {
    path: 'shop',
    canActivate: [AuthGuard],
    loadChildren: () => import('./shop/shop.module').then(m => m.ShopModule),
  },

  // Admin
  {
    path: 'admin',
    canActivate: [AdminGuard],
    loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule),
  },

  // ⬇️ public info pages (accessible to everyone)
  { path: 'help', component: HelpCenterComponent },
  { path: 'returns', component: ReturnsComponent },
  { path: 'shipping', component: ShippingComponent },
  { path: 'privacy', component: PrivacyComponent },
  { path: 'terms', component: TermsComponent },
  { path: 'help-center', redirectTo: 'help', pathMatch: 'full' }, // optional alias

  // Default → login
  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },

  // 404
  { path: '**', component: NotFoundComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
