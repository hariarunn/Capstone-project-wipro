import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { Address, PaymentMethod } from '../../models/cart';
import { NotificationsService } from '../../../core/services/notifications.service';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent {
  items$ = this.cart.items$;
  totals$ = this.cart.totals$;

  method: PaymentMethod = 'card';
  submitting = false;

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    line1: ['', [Validators.required]],
    line2: [''],
    city: ['', [Validators.required]],
    state: ['', [Validators.required]],
    pincode: ['', [Validators.required, Validators.pattern(/^[1-9][0-9]{5}$/)]],
    cardNumber: [''],
    cardName: [''],
    cardExp: [''],
    cardCvv: ['']
  });

  constructor(
    private fb: FormBuilder,
    private cart: CartService,
    private orders: OrderService,
    private router: Router,
    private notify: NotificationsService
  ) {}

  placeOrder() {
    if (!this.canPlace()) return;
    this.submitting = true;

    const f = this.form.value;
    const address: Address = {
      name: f.name!, phone: f.phone!,
      line1: f.line1!, line2: f.line2 || '',
      city: f.city!, state: f.state!, pincode: f.pincode!,
    };

    this.orders.create$(address, this.method)
      .pipe(finalize(() => this.submitting = false))
      .subscribe({
        next: (order) => {
          this.notify.success('Order placed successfully', `#${(order as any)?.id ?? ''}`);
          this.cart.clear();
          this.router.navigate(['/shop/orders']);
        },
        error: (e) => {
          this.notify.error('Checkout failed', e?.error?.message || e?.message || 'Please try again.');
        }
      });
  }

  canPlace() {
    const hasItems = (this.cart.snapshot?.length ?? 0) > 0;
    return hasItems && this.form.valid && !this.submitting;
  }
}
