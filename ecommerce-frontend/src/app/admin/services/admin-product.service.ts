import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Product } from '../../catalog/models/product';
import { ProductService } from '../../catalog/services/product.service';
import { environment } from '../../../environments/environment';

const API = environment.apiBase;

@Injectable({ providedIn: 'root' })
export class AdminProductService {
  constructor(private products: ProductService, private http: HttpClient) {}

  list$ = this.products.products$;

  get(id: number) {
    return this.products.getProductById(id);
  }

  create(p: Omit<Product, 'id'>) {
    const safe = this.sanitizeCreate(p);
    this.products.create(safe).subscribe();
  }

  update(id: number, patch: Partial<Product>) {
    const safe = this.sanitizeUpdate(patch);
    this.products.update(id, safe).subscribe();
  }

  delete(id: number) {
    this.products.delete(id).subscribe();
  }

  upload(file: File): Observable<string> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http
      .post<{ imageUrl: string }>(`${API}/upload`, fd)
      .pipe(map(res => res.imageUrl));
  }

  categories$ = this.products.getCategories();

  private sanitizeCreate(input: Partial<Product>): Omit<Product, 'id'> {
    const { rating: _r, reviews: _rv, ...rest } = input as any;
    return { ...rest, rating: 0, reviews: 0 } as Omit<Product, 'id'>;
  }
  private sanitizeUpdate(input: Partial<Product>): Partial<Product> {
    const { rating: _r, reviews: _rv, ...rest } = input as any;
    return rest as Partial<Product>;
  }
}
