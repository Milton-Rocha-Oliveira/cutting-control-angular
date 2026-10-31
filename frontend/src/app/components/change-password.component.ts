import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="display:flex;justify-content:flex-end;align-items:flex-start;gap:12px;flex-wrap:wrap;margin:-18px 0 24px">
      <button class="secondary" type="button" (click)="open = !open">{{ open ? 'Fechar' : 'Alterar senha' }}</button>
      <form *ngIf="open" (ngSubmit)="submit()" style="display:grid;gap:8px;min-width:min(100%,320px);padding:18px;background:var(--surface);border:1px solid var(--line);border-radius:12px">
        <label>Senha atual<input [(ngModel)]="currentPassword" name="currentPassword" type="password" autocomplete="current-password" required></label>
        <label>Nova senha<input [(ngModel)]="newPassword" name="newPassword" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label>
        <label>Repita a nova senha<input [(ngModel)]="confirmPassword" name="confirmPassword" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label>
        <button class="primary" [disabled]="busy">{{ busy ? 'Salvando...' : 'Salvar senha' }}</button>
      </form>
      <p *ngIf="message" role="status">{{ message }}</p>
      <p class="account-error" *ngIf="error" role="alert">{{ error }}</p>
    </div>`
})
export class ChangePasswordComponent {
  open = false;
  busy = false;
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  message = '';
  error = '';
  constructor(private api: ApiService) {}

  submit(): void {
    this.error = '';
    this.message = '';
    if (this.newPassword.length < 12) { this.error = 'A nova senha deve ter pelo menos 12 caracteres.'; return; }
    if (this.newPassword !== this.confirmPassword) { this.error = 'As novas senhas não coincidem.'; return; }
    this.busy = true;
    this.api.changePassword({ currentPassword: this.currentPassword, newPassword: this.newPassword }).subscribe({
      next: () => {
        this.message = 'Senha alterada.';
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.busy = false;
      },
      error: failure => { this.error = failure?.error?.message || 'Não foi possível alterar a senha.'; this.busy = false; }
    });
  }
}
