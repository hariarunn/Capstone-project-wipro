import { Injectable } from '@angular/core';
import {
  HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { NotificationsService } from '../services/notifications.service';
import { environment } from '../../../environments/environment';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private router: Router, private notify: NotificationsService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((err: HttpErrorResponse) => {
        // treat as API call if it targets our base OR a relative /api path
        const isApi =
          req.url.startsWith(environment.apiBase) ||
          req.url.startsWith('/api') ||
          (req.url.includes('://') && req.url.includes('/api/'));

        if (isApi) {
          const status = err.status;
          const message = err.error?.message || err.message || 'Unexpected error';

          if (status === 0) {
            this.notify.error('Network error', 'Check your connection.');
          } else if (status === 401) {
            this.notify.info('Unauthorized', 'Please sign in again.');
          } else if (status === 403) {
            this.notify.info('Forbidden', 'You do not have permission.');
          } else if (status === 404) {
            this.notify.info('Not found', 'Requested resource does not exist.');
          } else if (status >= 500) {
            this.notify.error('Server error', 'Please try again shortly.');
          } else {
            this.notify.error('Request failed', message);
          }
        }
        return throwError(() => err);
      })
    );
  }
}
