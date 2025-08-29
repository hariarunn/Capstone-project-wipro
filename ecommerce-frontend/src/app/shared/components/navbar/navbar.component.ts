import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../../../auth/services/auth.service';
import { CartService } from '../../../shop/services/cart.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnDestroy {
  cartCount$: Observable<number> = this.cart.items$.pipe(
    map(items => items.reduce((sum, i) => sum + i.qty, 0))
  );
  bump = false;
  private sub?: Subscription;

  constructor(public auth: AuthService, private router: Router, private cart: CartService) {
    let last = 0;
    this.sub = this.cartCount$.subscribe(count => {
      if (count > last) {
        this.bump = true;
        setTimeout(() => (this.bump = false), 350);
      }
      last = count;
    });
  }

  get displayName(): string {
    return this.auth.user?.name || 'Account';
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }

  /** Trigger catalog search via query params */
  goSearch(q: string, category: string) {
    const qp: any = {
      q: q?.trim() || null,
      category: category && category !== 'All' ? category : null
    };
    this.router.navigate(['/catalog'], { queryParams: qp });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
