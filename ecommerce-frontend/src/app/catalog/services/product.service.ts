import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Product } from '../models/product';
import { environment } from '../../../environments/environment';

const API = environment.apiBase;

@Injectable({ providedIn: 'root' })
export class ProductService {
  private _products = new BehaviorSubject<Product[]>([]);
  readonly products$ = this._products.asObservable();

  lastTotal = 0;
  lastPage = 1;
  lastPageSize = 20;

  get snapshot(): Product[] { return this._products.value; }

  constructor(private http: HttpClient) {
    this.refresh();
  }

  refresh(params?: {
    search?: string; category?: string;
    minPrice?: number; maxPrice?: number; minRating?: number;
    sort?: 'newest' | 'priceAsc' | 'priceDesc' | 'rating' | 'popular';
    page?: number; pageSize?: number;
  }) {
    let hp = new HttpParams();
    const p = params || {};
    const set = (k: string, v: any) => { if (v !== undefined && v !== null && v !== '') hp = hp.set(k, String(v)); };
    set('search', p.search);
    set('category', p.category);
    set('minPrice', p.minPrice);
    set('maxPrice', p.maxPrice);
    set('minRating', p.minRating);
    set('sort', p.sort);
    set('page', p.page);
    set('pageSize', p.pageSize);

    this.http.get<Product[]>(`${API}/products`, { params: hp, observe: 'response' })
      .subscribe((res: HttpResponse<Product[]>) => {
        this.lastTotal = Number(res.headers.get('X-Total-Count') || 0);
        this.lastPage = Number(res.headers.get('X-Page') || p.page || 1);
        this.lastPageSize = Number(res.headers.get('X-Page-Size') || p.pageSize || 20);
        this._products.next(res.body || []);
      });
  }

  getProductById(id: number): Observable<Product | undefined> {
    return this.http.get<Product>(`${API}/products/${id}`).pipe(
      catchError(() => of(undefined))
    );
  }

  getCategories(): Observable<string[]> {
    return this.products$.pipe(
      map(list => Array.from(new Set(list.map(p => p.category))).sort())
    );
  }

  create(p: Omit<Product, 'id'>): Observable<Product> {
    const safe = this.sanitizeCreate(p);
    return this.http.post<Product>(`${API}/products`, safe).pipe(
      tap(() => this.refresh())
    );
  }

  update(id: number, patch: Partial<Product>): Observable<Product> {
    const safe = this.sanitizeUpdate(patch);
    return this.http.patch<Product>(`${API}/products/${id}`, safe).pipe(
      tap(() => this.refresh())
    );
  }

  delete(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${API}/products/${id}`).pipe(
      tap(() => this.refresh())
    );
  }

  private sanitizeCreate(input: Partial<Product>): Omit<Product, 'id'> {
    const { rating: _r, reviews: _rv, ...rest } = input as any;
    return { ...rest, rating: 0, reviews: 0 } as Omit<Product, 'id'>;
  }
  private sanitizeUpdate(input: Partial<Product>): Partial<Product> {
    const { rating: _r, reviews: _rv, ...rest } = input as any;
    return rest as Partial<Product>;
  }
}
