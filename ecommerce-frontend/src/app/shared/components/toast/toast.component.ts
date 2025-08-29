// src/app/shared/components/toast/toast.component.ts
import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { NotificationsService, Toast } from '../../../core/services/notifications.service';

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss']
})
export class ToastComponent {
  toasts$: Observable<Toast[]> = this.notify.toasts$;
  constructor(public notify: NotificationsService) {}
  trackById = (_: number, t: Toast) => t.id;
}
