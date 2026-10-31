import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../api.service';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: './users-page.component.css',
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <section class="grid-2">
      <div class="panel form-panel">
        <h3>Adicionar usuário</h3>
        <p>Crie uma conta individual para acesso ao Controle de Cortes.</p>
        <form *ngIf="userManagementEnabled" (ngSubmit)="createUser()">
          <label>Nome<input [(ngModel)]="name" name="name" maxlength="100" autocomplete="name" required placeholder="Nome do usuário"></label>
          <label>E-mail<input [(ngModel)]="email" name="email" type="email" autocomplete="email" required placeholder="usuario@exemplo.com"></label>
          <label>Senha inicial<input [(ngModel)]="password" name="password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required placeholder="Mínimo de 12 caracteres"></label>
          <small>Compartilhe a senha inicial com o usuário por um canal seguro. Ele poderá alterá-la pelo botão “Alterar senha”.</small>
          <div class="row-actions"><button class="primary" [disabled]="busy || !email.trim() || !password">{{ busy ? 'Criando conta...' : 'Criar conta' }}</button></div>
        </form>
        <p class="account-result" *ngIf="result" role="status">{{ result }}</p>
        <p class="account-error" *ngIf="error" role="alert">{{ error }}</p>
      </div>
      <div class="panel">
        <h3>Contas individuais</h3>
        <p>Cada usuário entra com seu próprio e-mail e vê apenas os fornecedores, cortes, fechamentos e relatórios cadastrados na própria conta.</p>
        <p>Qualquer pessoa pode criar a própria conta na tela inicial. As senhas são armazenadas como hash seguro no banco. A criação e redefinição de contas por aqui continuam disponíveis apenas ao root.</p>
        <hr>
        <h3>Redefinir senha</h3>
        <p>Defina uma nova senha para um usuário que perdeu o acesso e compartilhe-a por um canal seguro.</p>
        <form (ngSubmit)="resetPassword()">
          <label>E-mail da conta<input [(ngModel)]="resetEmail" name="resetEmail" type="email" autocomplete="email" required></label>
          <label>Nova senha<input [(ngModel)]="resetPasswordValue" name="resetPasswordValue" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label>
          <div class="row-actions"><button class="secondary" [disabled]="busy || !resetEmail.trim() || resetPasswordValue.length < 12">Redefinir senha</button></div>
        </form>
      </div>
    </section>`
})
export class UsersPageComponent {
  name = '';
  email = '';
  password = '';
  resetEmail = '';
  resetPasswordValue = '';
  busy = false;
  result = '';
  error = '';
  userManagementEnabled = false;

  constructor(private api: ApiService) {
    this.api.adminStatus().subscribe({
      next: status => this.userManagementEnabled = status.userManagementEnabled,
      error: () => this.error = 'Não foi possível carregar as configurações de usuários.'
    });
  }

  createUser(): void {
    if (!this.email.trim() || this.password.length < 12 || this.busy || !this.userManagementEnabled) return;
    this.busy = true;
    this.result = '';
    this.error = '';
    this.api.createUser({ email: this.email.trim(), name: this.name.trim(), password: this.password }).subscribe({
      next: response => {
        this.result = `Conta criada para ${response.email}. Compartilhe a senha inicial por um canal seguro.`;
        this.name = '';
        this.email = '';
        this.password = '';
        this.busy = false;
      },
      error: failure => {
        this.error = failure?.error?.message || 'Não foi possível criar a conta.';
        this.busy = false;
      }
    });
  }

  resetPassword(): void {
    if (!this.resetEmail.trim() || this.resetPasswordValue.length < 12 || this.busy || !this.userManagementEnabled) return;
    this.busy = true;
    this.result = '';
    this.error = '';
    this.api.resetUserPassword({ email: this.resetEmail.trim(), newPassword: this.resetPasswordValue }).subscribe({
      next: () => {
        this.result = `Senha redefinida para ${this.resetEmail.trim()}. Compartilhe-a por um canal seguro.`;
        this.resetEmail = '';
        this.resetPasswordValue = '';
        this.busy = false;
      },
      error: failure => {
        this.error = failure?.error?.message || 'Não foi possível redefinir a senha.';
        this.busy = false;
      }
    });
  }
}
