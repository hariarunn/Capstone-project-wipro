import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { User, UserRole } from '../models/user';
import { environment } from '../../../environments/environment';

type AuthResponse = { id:number; name:string; email:string; role:UserRole; token:string };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private key = 'token';
  private _user$ = new BehaviorSubject<User | null>(null);
  readonly user$ = this._user$.asObservable();

  constructor(private http: HttpClient) {
    const token = this.token;
    if (token) {
      const p = this.decodeJwt(token);
      if (p && (!p.exp || Date.now()/1000 < p.exp)) {
        this._user$.next({
          id: p.sub ?? 0,
          name: p.name || 'you',
          email: p.email || 'you@example.com',
          role: (p.role as UserRole) ?? 'user',
          token
        });
      } else {
        sessionStorage.removeItem(this.key);
      }
    }
  }

  get user(): User | null { return this._user$.value; }
  get token(): string | null { return sessionStorage.getItem(this.key); }
  get isLoggedIn(): boolean { return !!this.user; }
  get role(): UserRole | null { return this.user?.role ?? null; }
  isAdmin(): boolean { return this.role === 'admin'; }

  login(email: string, password: string): Observable<User> {
    return this.http.post<AuthResponse>(`${environment.apiBase}/auth/login`, { email, password })
      .pipe(tap(r => this.persist(r)), map(() => this._user$.value!));
  }

  register(name: string, email: string, password: string): Observable<User> {
    return this.http.post<AuthResponse>(`${environment.apiBase}/auth/register`, { name, email, password })
      .pipe(tap(r => this.persist(r)), map(() => this._user$.value!));
  }

  logout() {
    sessionStorage.removeItem(this.key);
    this._user$.next(null);
  }

  private persist(r: AuthResponse) {
    sessionStorage.setItem(this.key, r.token);
    const u: User = { id: r.id, name: r.name, email: r.email, role: r.role, token: r.token };
    this._user$.next(u);
  }

  private decodeJwt(token: string): any {
    try {
      const [, payload] = token.split('.');
      return JSON.parse(decodeURIComponent(escape(atob(payload))));
    } catch { return null; }
  }
}
