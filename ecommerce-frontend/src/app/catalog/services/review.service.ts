import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Review } from '../models/review';
import { AuthService } from '../../auth/services/auth.service';
import { ProductService } from './product.service';
import { environment } from '../../../environments/environment';

const API = environment.apiBase;

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private cache = new Map<number, Review[]>();
  private streams = new Map<number, BehaviorSubject<Review[]>>();

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private products: ProductService
  ) {}

  getForProduct(productId: number): Observable<Review[]> {
    if (!this.streams.has(productId)) {
      this.streams.set(productId, new BehaviorSubject<Review[]>([]));
      this.reload(productId);
    }
    return (this.streams.get(productId) as BehaviorSubject<Review[]>).asObservable()
      .pipe(map(list => [...list].sort((a,b) => b.createdAt.localeCompare(a.createdAt))));
  }

  reload(productId: number) {
    this.http.get<Review[]>(`${API}/products/${productId}/reviews`)
      .subscribe(list => {
        this.cache.set(productId, list);
        this.streams.get(productId)?.next(list);
      });
  }

  hasReviewed(productId: number): boolean {
    const u = this.auth.user;
    if (!u) return false;
    const list = this.cache.get(productId) || [];
    return list.some(
      r => r.productId === productId &&
           (r.userId === u.id || (!!r.userEmail && r.userEmail === u.email))
    );
  }

  add(productId: number, rating: number, comment: string): Observable<Review> {
    if (!this.auth.user) return throwError(() => new Error('Not logged in'));
    const body = { rating, comment: (comment || '').trim() };
    return this.http.post<Review>(`${API}/products/${productId}/reviews`, body).pipe(
      tap(() => {
        this.reload(productId);
        this.products.refresh();
      })
    );
  }
}
