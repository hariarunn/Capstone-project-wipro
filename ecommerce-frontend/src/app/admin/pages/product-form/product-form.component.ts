import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap, tap } from 'rxjs/operators';
import { of, lastValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';

import { Product } from '../../../catalog/models/product';
import { AdminProductService } from '../../services/admin-product.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { environment } from '../../../../environments/environment';

const API = environment.apiBase;
// origin = http://localhost:5000  (strip trailing /api or /api/)
const API_ORIGIN = API.replace(/\/api\/?$/, '');

@Component({
  selector: 'app-product-form',
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss']
})
export class ProductFormComponent implements OnInit {
  editingId: number | null = null;
  title = 'Add Product';
  preview = '';

  categories$ = this.svc.categories$;

  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    description: ['', [Validators.required, Validators.maxLength(500)]],
    price: [0, [Validators.required, Validators.min(0)]],
    oldPrice: [0],
    stock: [10, [Validators.required, Validators.min(0)]],
    imageUrl: ['', [Validators.required]],
    category: ['', [Validators.required]],
    inStock: [true],
    delivery: ['Tomorrow']
  });

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private svc: AdminProductService,
    private notify: NotificationsService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(() => {
        const idParam = this.route.snapshot.paramMap.get('id');
        if (!idParam) return of(undefined);
        const id = Number(idParam);
        this.editingId = id;
        this.title = 'Edit Product';
        return this.svc.get(id);
      }),
      tap(p => {
        if (p) {
          this.form.patchValue({
            title: p.title,
            description: p.description,
            price: p.price,
            oldPrice: p.oldPrice || 0,
            stock: (p as any).stock ?? 10,
            imageUrl: p.imageUrl,
            category: p.category,
            inStock: (p as any).inStock ?? true,
            delivery: p.delivery || 'Tomorrow'
          });
          this.preview = p.imageUrl;
        }
      })
    ).subscribe();
  }

  async onFile(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // optimistic preview while uploading
    this.preview = URL.createObjectURL(file);

    const fd = new FormData();
    fd.append('file', file);

    try {
      const resp = await lastValueFrom(
        this.http.post<{ imageUrl: string }>(`${API}/upload`, fd)
      );
      const returned = resp?.imageUrl || '';

      // Normalize to a full absolute URL the app can render
      const full = returned.startsWith('http')
        ? returned
        : returned.startsWith('/uploads/')
          ? `${API_ORIGIN}${returned}`
          : `${API_ORIGIN}/${returned.replace(/^\/+/, '')}`;

      this.form.patchValue({ imageUrl: full });
      this.preview = full;
      this.notify.success('Image uploaded', file.name);
    } catch (e: any) {
      this.notify.error('Upload failed', e?.error?.message || 'Please try again.');
      // revert preview to last saved value if present
      this.preview = this.form.value.imageUrl || '';
    }
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const val = this.form.value as any;

    const payload: Partial<Product> = {
      title: val.title,
      description: val.description,
      price: Number(val.price),
      oldPrice: Number(val.oldPrice) || undefined,
      imageUrl: val.imageUrl,
      category: val.category,
      inStock: !!val.inStock,
      delivery: val.delivery,
      stock: Number(val.stock)
    } as any;

    if (this.editingId) {
      this.svc.update(this.editingId, payload as Product);
      this.notify.success('Product updated', String(payload.title || ''));
    } else {
      this.svc.create(payload as Product);
      this.notify.success('Product created', String(payload.title || ''));
    }
    this.router.navigate(['/admin']);
  }

  cancel() { this.router.navigate(['/admin']); }
}
