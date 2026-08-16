import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-shell">
      <aside class="sidebar">Controle de Cortes</aside>
      <main class="content">
        <h1>Bem-vindo ao Controle de Cortes</h1>
        <nav>
          <button (click)="view='dashboard'">Dashboard</button>
          <button (click)="view='suppliers'">Fornecedores</button>
          <button (click)="view='cuts'">Cortes</button>
          <button (click)="view='invoicing'">Faturamento</button>
          <button (click)="view='monthly'">Fechamento Mensal</button>
          <button (click)="view='annual'">Fechamento Anual</button>
        </nav>
        <div style="float:right">
          <app-login></app-login>
        </div>
        <section>
          <app-suppliers *ngIf="view==='suppliers'"></app-suppliers>
          <app-cuts *ngIf="view==='cuts'"></app-cuts>
          <app-invoicing *ngIf="view==='invoicing'"></app-invoicing>
          <app-monthly-report *ngIf="view==='monthly'"></app-monthly-report>
          <app-annual-report *ngIf="view==='annual'"></app-annual-report>
          <div *ngIf="view==='dashboard'">Painel (em breve)</div>
        </section>
      </main>
    </div>
  `,
  styles: [`.app-shell{display:flex}.sidebar{width:240px;background:#0d6efd;color:#fff;padding:16px}.content{flex:1;padding:16px}`]
})
export class AppComponent { }
