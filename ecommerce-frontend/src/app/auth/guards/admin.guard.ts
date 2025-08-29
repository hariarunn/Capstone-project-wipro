import { Injectable } from '@angular/core';
import { CanActivate, CanMatch, Router, UrlTree, Route, UrlSegment } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate, CanMatch {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    if (this.auth.isLoggedIn && this.auth.isAdmin()) return true;
    return this.router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: location.pathname } });
  }

  canMatch(route: Route, segments: UrlSegment[]): boolean | UrlTree {
    if (this.auth.isLoggedIn && this.auth.isAdmin()) return true;
    const url = '/' + segments.map(s => s.path).join('/');
    return this.router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: url } });
  }
}
