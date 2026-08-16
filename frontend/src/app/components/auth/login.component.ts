import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  template: `
    <h3>Entrar</h3>
    <form (submit)="login()">
      <input [(ngModel)]="email" name="email" placeholder="email" required />
      <input [(ngModel)]="password" name="password" placeholder="senha" type="password" required />
      <button type="submit">Entrar</button>
    </form>
  `
})
export class LoginComponent{
  email=''; password='';
  constructor(private auth:AuthService){}
  async login(){
    try {
      await this.auth.signIn(this.email, this.password);
      alert('Login realizado');
      location.reload();
    } catch (e:any) { alert('Erro: ' + e.message || e); }
  }
}
