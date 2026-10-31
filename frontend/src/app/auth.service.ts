import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { OfflineDatabaseService } from './offline-database.service';

export interface AuthUser { id: string; username: string; name: string; email: string; root: boolean; }
interface LoginResponse { accessToken: string; tokenType: string; expiresIn: number; user: { id: string; email: string; name: string; root: boolean }; }
interface StoredSession { accessToken: string; expiresAt: number; user: AuthUser; }

/** Login and signed tokens are managed by the Java API. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = (globalThis as { __API_URL__?: string }).__API_URL__ || 'http://localhost:8080/api';
  private readonly autoLocalAccess = (globalThis as any).__APP_CONFIG__?.AUTO_LOCAL_ACCESS === true;
  private token: string | null = null;
  private readonly userSubject = new BehaviorSubject<AuthUser | null>(null);
  private readonly readySubject = new BehaviorSubject(false);
  readonly user$ = this.userSubject.asObservable();
  readonly ready$ = this.readySubject.asObservable();

  constructor(private http: HttpClient, private localDb: OfflineDatabaseService) { void this.restoreSession(); }
  get configured(): boolean { return true; }
  get user(): AuthUser | null { return this.userSubject.value; }

  async signIn(email: string, password: string): Promise<void> {
    if (this.localDb.enabled) {
      const account = await this.localDb.login(email, password);
      this.saveLocalSession(account);
      return;
    }
    try {
      const response = await firstValueFrom(this.http.post<LoginResponse>(`${this.base}/auth/login`, { email: email.trim().toLowerCase(), password }));
      this.saveSession(response);
    } catch (error) {
      if (error instanceof HttpErrorResponse) throw new Error(error.error?.message || 'E-mail ou senha inválidos.');
      throw error;
    }
  }

  async signUp(name: string, email: string, password: string): Promise<void> {
    if (this.localDb.enabled) {
      const account = await this.localDb.register(name, email, password);
      this.saveLocalSession(account);
      return;
    }
    try {
      const response = await firstValueFrom(this.http.post<LoginResponse>(`${this.base}/auth/register`, { name: name.trim(), email: email.trim().toLowerCase(), password }));
      this.saveSession(response);
    } catch (error) {
      if (error instanceof HttpErrorResponse) throw new Error(error.error?.message || 'Não foi possível criar a conta.');
      throw error;
    }
  }

  private saveSession(response: LoginResponse): void {
    const user: AuthUser = { id: response.user.id, username: response.user.email, email: response.user.email, name: response.user.name, root: response.user.root };
    const session: StoredSession = { accessToken: response.accessToken, expiresAt: Date.now() + response.expiresIn * 1000, user };
    this.token = session.accessToken;
    this.userSubject.next(user);
    try { sessionStorage.setItem('controle-de-cortes-session', JSON.stringify(session)); } catch { /* session-only fallback */ }
  }

  private saveLocalSession(account: { id: string; email: string; name: string; root: boolean }): void {
    const user: AuthUser = { id: account.id, username: account.email, email: account.email, name: account.name, root: account.root };
    const session: StoredSession = { accessToken: `offline:${account.id}`, expiresAt: Number.MAX_SAFE_INTEGER, user };
    this.token = session.accessToken;
    this.userSubject.next(user);
    try { localStorage.setItem('controle-de-cortes-offline-session', JSON.stringify(session)); } catch { /* session-only fallback */ }
  }

  async signOut(): Promise<void> {
    this.token = null;
    this.userSubject.next(null);
    try {
      sessionStorage.removeItem('controle-de-cortes-session');
      localStorage.removeItem('controle-de-cortes-offline-session');
    } catch { /* storage may be unavailable */ }
  }

  async accessToken(): Promise<string | null> { return this.token; }

  private async restoreSession(): Promise<void> {
    let restored = false;
    try {
      const raw = this.localDb.enabled
        ? localStorage.getItem('controle-de-cortes-offline-session')
        : sessionStorage.getItem('controle-de-cortes-session');
      if (raw) {
        const session = JSON.parse(raw) as StoredSession;
        const accountExists = !this.localDb.enabled || await this.localDb.hasAccount(session.user?.id || '');
        if (session.accessToken && session.expiresAt > Date.now() && session.user?.id && accountExists) {
          this.token = session.accessToken;
          this.userSubject.next(session.user);
          restored = true;
        } else if (this.localDb.enabled) localStorage.removeItem('controle-de-cortes-offline-session');
        else sessionStorage.removeItem('controle-de-cortes-session');
      }
    } catch { /* start signed out if session storage is invalid */ }
    if (!restored && this.localDb.enabled && this.autoLocalAccess) {
      try { this.saveLocalSession(await this.localDb.accessWithoutPassword()); } catch { /* local access is unavailable if IndexedDB cannot be opened */ }
    }
    this.readySubject.next(true);
  }
}
