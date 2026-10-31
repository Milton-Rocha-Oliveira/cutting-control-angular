import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="auth-screen">
      <div class="auth-card">
        <div class="brand auth-brand"><img class="brand-mark" src="assets/logo-controle-de-cortes.png" alt="Controle de Cortes"></div>
        <p class="eyebrow">ACESSO SEGURO</p>
        <h1>{{ creatingAccount ? 'Criar uma conta' : 'Entrar no sistema' }}</h1>
        <p class="auth-subtitle">{{ creatingAccount ? 'Cadastre seus dados neste aparelho.' : 'Entre com seu e-mail e senha.' }}</p>
        <div *ngIf="error" class="auth-error">{{ error }}</div>
        <form (ngSubmit)="submit()">
          <label *ngIf="creatingAccount">Nome<input [(ngModel)]="name" name="name" autocomplete="name" maxlength="100" required></label>
          <label>E-mail<input [(ngModel)]="email" name="email" type="email" autocomplete="email" required></label>
          <label>Senha<input [(ngModel)]="password" name="password" type="password" [attr.autocomplete]="creatingAccount ? 'new-password' : 'current-password'" [minlength]="creatingAccount ? 12 : 1" maxlength="128" required></label>
          <small *ngIf="creatingAccount">Use pelo menos 12 caracteres. A conta e os dados serão guardados somente neste aparelho.</small>
          <button class="primary wide" [disabled]="busy || (creatingAccount && password.length < 12)">{{ busy ? (creatingAccount ? 'Criando conta...' : 'Entrando...') : (creatingAccount ? 'Criar conta' : 'Entrar') }}</button>
        </form>
        <button *ngIf="offlineMode || publicRegistration" class="auth-switch" type="button" [disabled]="busy" (click)="toggleMode()">{{ creatingAccount ? 'Já tem conta? Entrar' : (offlineMode ? 'Criar conta neste aparelho' : 'Criar conta') }}</button>
        <small *ngIf="!offlineMode && !publicRegistration" class="auth-mode">As contas são criadas pelo administrador do sistema.</small>
        <small class="auth-mode">{{ offlineMode ? 'Aplicativo offline · dados armazenados neste aparelho' : 'Autenticação gerenciada pela API Java' }}</small>
      </div>
    </section>`
})
export class AuthPageComponent {
  @Input() busy = false;
  @Input() error = '';
  @Input() offlineMode = false;
  @Input() publicRegistration = false;
  @Output() login = new EventEmitter<{ email: string; password: string }>();
  @Output() register = new EventEmitter<{ name: string; email: string; password: string }>();
  creatingAccount = false;
  name = '';
  email = '';
  password = '';

  toggleMode(): void { this.creatingAccount = !this.creatingAccount; }

  submit(): void {
    if (this.creatingAccount) this.register.emit({ name: this.name, email: this.email, password: this.password });
    else this.login.emit({ email: this.email, password: this.password });
  }
}
