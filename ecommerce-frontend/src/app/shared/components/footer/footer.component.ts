import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  year = new Date().getFullYear();
  constructor(private router: Router, public auth: AuthService) {}

  toCatalog(query: Record<string,string|null> = {}) {
    // If you want to FORCE login before catalog, uncomment:
    // if (!this.auth.isLoggedIn) {
    //   const returnUrl = this.router.createUrlTree(['/catalog'], { queryParams: query }).toString();
    //   this.router.navigate(['/auth/login'], { queryParams: { returnUrl } });
    //   return;
    // }
    this.router.navigate(['/catalog'], { queryParams: query });
  }
}
