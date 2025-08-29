import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastKind = 'success' | 'error' | 'info';
export interface Toast {
  id: number;
  kind: ToastKind;
  title?: string;
  message: string;
  ttl: number;           // ms until auto-dismiss
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private seq = 1;
  private _toasts = new BehaviorSubject<Toast[]>([]);
  toasts$ = this._toasts.asObservable();

  show(kind: ToastKind, message: string, opts?: { title?: string; ttl?: number }) {
    const t: Toast = {
      id: this.seq++,
      kind,
      message,
      title: opts?.title,
      ttl: opts?.ttl ?? 2800
    };
    this._toasts.next([t, ...this._toasts.value]);
    setTimeout(() => this.dismiss(t.id), t.ttl);
  }

  success(msg: string, title?: string) { this.show('success', msg, { title }); }
  error(msg: string, title?: string)   { this.show('error',   msg, { title }); }
  info(msg: string, title?: string)    { this.show('info',    msg, { title }); }

  dismiss(id: number) {
    this._toasts.next(this._toasts.value.filter(t => t.id !== id));
  }

  clear() { this._toasts.next([]); }
}
