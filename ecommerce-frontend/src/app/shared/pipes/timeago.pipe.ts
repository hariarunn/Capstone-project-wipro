import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'timeago', pure: true })
export class TimeagoPipe implements PipeTransform {
  transform(value?: string | Date | null): string {
    if (!value) return '';
    const then = typeof value === 'string' ? new Date(value) : value;
    const diff = Date.now() - then.getTime();
    if (diff < 0) return 'just now';
    const s = Math.floor(diff / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (s < 45) return 'just now';
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (d < 7) return `${d}d ago`;
    return then.toLocaleDateString();
  }
}
