import { Component } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Observable, combineLatest } from 'rxjs';
import { debounceTime, map, startWith } from 'rxjs/operators';
import { AdminOrdersService, Order, OrderStatus } from '../../services/admin-orders.service';

@Component({
  selector: 'app-admin-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class AdminOrdersComponent {
  // --- filters ---
  q      = this.fb.control('');
  status = this.fb.control<'All' | OrderStatus>('All');
  from   = this.fb.control<string>('');
  to     = this.fb.control<string>('');
  page   = this.fb.control(1);
  pageSizeCtrl = this.fb.control(10);

  // base stream
  orders$: Observable<Order[]> = this.svc.orders$;

  // filtered list (supports both Shop and Admin shapes)
  filtered$: Observable<Order[]> = combineLatest([
    this.orders$,
    this.q.valueChanges.pipe(startWith(this.q.value || ''), debounceTime(200)),
    this.status.valueChanges.pipe(startWith(this.status.value || 'All')),
    this.from.valueChanges.pipe(startWith(this.from.value || '')),
    this.to.valueChanges.pipe(startWith(this.to.value || '')),
  ]).pipe(
    map(([list, q, status, from, to]) => {
      const qq = (q || '').toLowerCase().trim();
      const fromTs = from ? new Date(from).getTime() : -Infinity;
      const toTs   = to   ? new Date(to).getTime() + 24 * 3600 * 1000 - 1 : Infinity;

      let out = list.filter(o => {
        const idStr = String((o as any).id ?? '').toLowerCase();
        const name  = String((o as any).userName ?? (o as any).address?.name ?? '').toLowerCase();
        const email = String((o as any).email ?? '').toLowerCase();

        const tStr = (o as any).createdAt || (o as any).placedAt || '';
        const t = tStr ? new Date(tStr).getTime() : 0;

        const matchesQ = !qq || idStr.includes(qq) || name.includes(qq) || email.includes(qq);
        const matchesStatus = status === 'All' || o.status === status;
        const matchesDate   = t >= fromTs && t <= toTs;

        return matchesQ && matchesStatus && matchesDate;
      });

      // newest first
      return out.sort((a, b) => {
        const ta = new Date((a as any).createdAt || (a as any).placedAt || 0).getTime();
        const tb = new Date((b as any).createdAt || (b as any).placedAt || 0).getTime();
        return tb - ta;
      });
    })
  );

  // pagination calc
  totalPages$: Observable<number> = combineLatest([
    this.filtered$,
    this.pageSizeCtrl.valueChanges.pipe(startWith(this.pageSizeCtrl.value || 10))
  ]).pipe(
    map(([list, size]) => {
      const s = Math.max(1, Number(size) || 10);
      return Math.max(1, Math.ceil(list.length / s));
    })
  );

  paged$: Observable<Order[]> = combineLatest([
    this.filtered$,
    this.page.valueChanges.pipe(startWith(this.page.value || 1)),
    this.pageSizeCtrl.valueChanges.pipe(startWith(this.pageSizeCtrl.value || 10))
  ]).pipe(
    map(([list, page, size]) => {
      const s = Math.max(1, Number(size) || 10);
      const total = Math.max(1, Math.ceil(list.length / s));
      const p = Math.max(1, Math.min(Number(page) || 1, total));
      const start = (p - 1) * s;
      return list.slice(start, start + s);
    })
  );

  // summary cards
  stats$ = this.filtered$.pipe(
    map(list => ({
      count: list.length,
      revenue: list.reduce((sum, o) => sum + this.amount(o), 0),
      pending: list.filter(o => o.status === 'Created' || o.status === 'Paid' || o.status === 'Dispatched').length
    }))
  );

  // selection
  selected: Order | null = null;

  constructor(private fb: FormBuilder, public svc: AdminOrdersService) {}

  open(o: Order) { this.selected = o; }
  close() { this.selected = null; }

  setStatus(o: Order, s: OrderStatus) {
    this.svc.updateStatus((o as any).id as any, s);
    // optimistic UI
    if (this.selected && String((this.selected as any).id) === String((o as any).id)) {
      this.selected = {
        ...this.selected,
        status: s,
        timeline: [...(this.selected.timeline || []), { status: s, at: new Date().toISOString() }]
      };
    }
  }

  // pagination controls
  prev(total: number) { this.page.setValue(Math.max(1, (this.page.value || 1) - 1)); }
  next(total: number) { this.page.setValue(Math.min(total, (this.page.value || 1) + 1)); }
  setPage(p: number, total: number) { this.page.setValue(Math.max(1, Math.min(total, p))); }

  // ---------------- template helpers (unify shapes) ----------------
  userName(o: Order): string {
    return (o as any).userName || (o as any).address?.name || 'Guest';
  }
  email(o: Order): string {
    return (o as any).email || '';
  }
  amount(o: Order): number {
    const adminAmt = (o as any).amount;
    const shopAmt  = (o as any).totals?.total;
    return Number(adminAmt ?? shopAmt ?? 0);
  }
  coupon(o: Order): string | null {
    return (o as any).totals?.coupon || null;
  }

  addressName(o: Order): string {
    return (o as any).address?.name || this.userName(o);
  }
  addressLine(o: Order): string {
    const a = (o as any).address || {};
    const l1 = a.line1 || '';
    const l2 = a.line2 || '';
    return [l1, l2].filter(Boolean).join(' ') || '—';
  }
  addressCityStateZip(o: Order): string {
    const a = (o as any).address || {};
    const city = a.city || '';
    const state = a.state || '';
    const zip = a.zip ?? a.pincode ?? '';
    const left = [city, state].filter(Boolean).join(', ');
    return [left, zip].filter(Boolean).join(' ') || '—';
  }
  addressPhone(o: Order): string {
    return (o as any).address?.phone || '—';
  }

  paymentMethod(o: Order): string {
    const pm = (o as any).payment?.method || (o as any).method || '';
    const v = String(pm).toUpperCase();
    if (v === 'CARD') return 'Card';
    if (v === 'COD')  return 'COD';
    if (v === 'UPI')  return 'UPI';
    return pm || '—';
  }
  paymentTxn(o: Order): string | null {
    return (o as any).payment?.txnId || null;
  }

  totalItems(o: Order): number {
    return ((o as any).items || []).reduce((sum: number, it: any) => sum + (it.qty || 0), 0);
  }

  statusClass(s: OrderStatus): string {
    switch (s) {
      case 'Created':    return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200';
      case 'Paid':       return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200';
      case 'Dispatched': return 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200';
      case 'Delivered':  return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200';
      case 'Cancelled':  return 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200';
      default:           return '';
    }
  }

  exportCsv(list: Order[]) {
    const rows = [
      ['OrderID','UserName','Email','Amount','Status','CreatedAt','Items'],
      ...list.map(o => [
        String((o as any).id ?? ''),
        this.userName(o),
        this.email(o),
        this.amount(o),
        o.status,
        ((o as any).createdAt || (o as any).placedAt || ''),
        ((o as any).items || []).map((i: any) => `${i.title} x${i.qty}`).join(' | ')
      ])
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `orders_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
