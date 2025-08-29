import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncate',
  pure: true
})
export class TruncatePipe implements PipeTransform {
  /**
   * Truncate a string to `limit` characters.
   * @param value string to truncate
   * @param limit max characters (default 120)
   * @param suffix what to append (default '…')
   * @param preserveWords if true, cut on word boundary when possible (default true)
   */
  transform(
    value: unknown,
    limit: number = 120,
    suffix: string = '…',
    preserveWords: boolean = true
  ): string {
    const str = (value ?? '').toString();
    if (!str || str.length <= limit) return str;

    if (!preserveWords) {
      return str.slice(0, limit).trimEnd() + suffix;
    }

    const slice = str.slice(0, limit + 1);
    const lastSpace = slice.lastIndexOf(' ');
    const cutAt = lastSpace > 0 ? lastSpace : limit;
    return slice.slice(0, cutAt).trimEnd() + suffix;
  }
}
