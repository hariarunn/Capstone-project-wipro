import { AfterViewInit, Directive, ElementRef, Input } from '@angular/core';

@Directive({
  selector: '[appAutoFocus]'
})
export class AutoFocusDirective implements AfterViewInit {
  /** Enable/disable autofocus (default: true) */
  @Input('appAutoFocus') enabled: boolean = true;
  /** Optional delay in ms before focusing (default: 0) */
  @Input() focusDelay: number = 0;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    if (!this.enabled) return;
    setTimeout(() => {
      const node = this.el.nativeElement as any;
      if (node?.focus) {
        node.focus();
        // If it's an input, select text for convenience
        if (typeof node.select === 'function') {
          try { node.select(); } catch {}
        }
      }
    }, Math.max(0, this.focusDelay || 0));
  }
}
