import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import { FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { NotificationsService } from '../../../core/services/notifications.service';

function match(other: () => AbstractControl) {
  return (control: AbstractControl): ValidationErrors | null =>
    control.value === other().value ? null : { mismatch: true };
}

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements AfterViewInit, OnDestroy {
  loading = false;
  showPassword = false;
  showConfirm = false;

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).+$/)
    ]],
    confirm: ['', [Validators.required]],
    accept: [true, [Validators.requiredTrue]]
  });

  @ViewChild('bannerEl', { static: false }) bannerEl?: ElementRef<HTMLDivElement>;
  @ViewChild('fxCanvas', { static: false }) fxCanvas?: ElementRef<HTMLCanvasElement>;
  titleTransform = 'translate3d(0,0,0)';

  private stopFns: Array<() => void> = [];
  private rafId = 0;
  private reduceMotion = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private notify: NotificationsService,
    private router: Router,
    private zone: NgZone
  ) {
    this.form.controls.confirm.addValidators(match(() => this.form.controls.password));
  }

  get f() { return this.form.controls; }

  strength(): number {
    const v = this.f.password.value || '';
    let s = 0;
    if (v.length >= 8) s++;
    if (/[A-Z]/.test(v)) s++;
    if (/[a-z]/.test(v)) s++;
    if (/\d/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v)) s++;
    return Math.min(s, 5);
  }

  async submit() {
    if (this.form.invalid || this.loading) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    const { name, email, password } = this.form.value;

    try {
      await firstValueFrom(this.auth.register(name!, email!, password!));
      await firstValueFrom(this.auth.login(email!, password!));
      this.notify.success('Account created', name!);
      this.router.navigate(['/catalog']);
    } catch {
      this.notify.error('Sign-up failed', 'Unexpected error');
    } finally {
      this.loading = false;
    }
  }

  togglePassword() { this.showPassword = !this.showPassword; }
  toggleConfirm() { this.showConfirm = !this.showConfirm; }

  // ---------- Interactive FX ----------
  ngAfterViewInit() {
    if (typeof window === 'undefined') return;
    const host = this.bannerEl?.nativeElement;
    if (!host) return;

    // reduced-motion
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onRM = () => { this.reduceMotion = mql.matches; if (this.reduceMotion) this.stopParticles(); };
    onRM();
    mql.addEventListener?.('change', onRM);
    this.stopFns.push(() => mql.removeEventListener?.('change', onRM));

    // parallax with rAF throttle
    let ticking = false;
    const onMove = (e: MouseEvent) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const r = host.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 100;
        const y = ((e.clientY - r.top) / r.height) * 100;
        host.style.setProperty('--mx', `${x}%`);
        host.style.setProperty('--my', `${y}%`);
        const dx = (x - 50) / 50, dy = (y - 50) / 50;
        this.titleTransform = `translate3d(${-8 * dx}px, ${-8 * dy}px, 0)`;
        ticking = false;
      });
    };
    host.addEventListener('mousemove', onMove, { passive: true });
    this.stopFns.push(() => host.removeEventListener('mousemove', onMove));

    // particles
    const canvas = this.fxCanvas?.nativeElement;
    if (canvas && !this.reduceMotion) this.zone.runOutsideAngular(() => this.startParticles(host, canvas, 'emerald'));

    const onVis = () => { if (document.hidden) cancelAnimationFrame(this.rafId); };
    document.addEventListener('visibilitychange', onVis);
    this.stopFns.push(() => document.removeEventListener('visibilitychange', onVis));
  }

  ngOnDestroy(){ this.stopFns.forEach(fn => fn()); this.stopParticles(); }

  private stopParticles(){ cancelAnimationFrame(this.rafId); this.rafId = 0; }

  private startParticles(container: HTMLElement, canvas: HTMLCanvasElement, tint: 'indigo'|'emerald'){
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const particles = Array.from({ length: 60 }).map(() => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - .5) * 0.0015,
      vy: (Math.random() - .5) * 0.0015,
      r: 1 + Math.random()*2, a: .15 + Math.random()*.25
    }));

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(width * DPR));
      canvas.height = Math.max(1, Math.floor(height * DPR));
      canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(container);
    this.stopFns.push(() => ro.disconnect());

    let mx = .5, my = .5;
    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width; my = (e.clientY - r.top) / r.height;
    };
    canvas.addEventListener('mousemove', onMove, { passive: true });
    this.stopFns.push(() => canvas.removeEventListener('mousemove', onMove));

    const color = tint === 'emerald' ? '16,185,129' : '99,102,241';

    const step = () => {
      this.rafId = requestAnimationFrame(step);
      ctx.clearRect(0,0,canvas.width,canvas.height);
      (ctx as CanvasRenderingContext2D).globalCompositeOperation = 'lighter';
      for (const p of particles){
        p.vx += (mx - p.x) * 0.00002; p.vy += (my - p.y) * 0.00002;
        p.x += p.vx; p.y += p.vy;
        if (p.x < -0.1 || p.x > 1.1) p.vx *= -1;
        if (p.y < -0.1 || p.y > 1.1) p.vy *= -1;

        ctx.beginPath();
        ctx.fillStyle = `rgba(${color},${p.a})`;
        ctx.arc(p.x*canvas.width, p.y*canvas.height, p.r*DPR, 0, Math.PI*2);
        ctx.fill();
      }
    };
    step();
  }
}
