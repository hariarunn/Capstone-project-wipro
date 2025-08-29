import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-error',
  templateUrl: './error.component.html',
  styleUrls: ['./error.component.scss']
})
export class ErrorComponent {
  reason = (history.state && history.state.message) || 'Something went wrong.';
  constructor(private router: Router) {}
  back() { this.router.navigate(['/catalog']); }
}
