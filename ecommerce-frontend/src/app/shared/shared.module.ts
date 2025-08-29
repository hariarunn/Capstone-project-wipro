import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { ToastComponent } from './components/toast/toast.component';
import { SkeletonComponent } from './components/skeleton/skeleton.component';
import { AutoFocusDirective } from './directives/auto-focus.directive';
import { TruncatePipe } from './pipes/truncate.pipe';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { ErrorComponent } from './pages/error/error.component';
import { StarRatingComponent } from './components/star-rating/star-rating.component';
import { TimeagoPipe } from './pipes/timeago.pipe';
import { HelpCenterComponent } from './pages/help-center/help-center.component';
import { ReturnsComponent } from './pages/returns/returns.component';
import { ShippingComponent } from './pages/shipping/shipping.component';
import { PrivacyComponent } from './pages/privacy/privacy.component';
import { TermsComponent } from './pages/terms/terms.component';

@NgModule({
  declarations: [
    NavbarComponent,
    FooterComponent,
    ToastComponent,
    SkeletonComponent,
    AutoFocusDirective,
    TruncatePipe,
    NotFoundComponent,
    ErrorComponent,
    StarRatingComponent,
    TimeagoPipe,
    HelpCenterComponent,
    ReturnsComponent,
    ShippingComponent,
    PrivacyComponent,
    TermsComponent,
  ],
  imports: [CommonModule, RouterModule],
  exports: [
    NavbarComponent,
    FooterComponent,
    ToastComponent,
    SkeletonComponent,
    AutoFocusDirective,
    TruncatePipe,
    NotFoundComponent,
    ErrorComponent
  ],
})
export class SharedModule {}
