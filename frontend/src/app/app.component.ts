import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-shell">
      <aside class="sidebar">Controle de Cortes</aside>
      <main class="content">
        <h1>Bem-vindo ao Controle de Cortes</h1>
        <p>Use o menu para navegar: Dashboard, Cortes, Fornecedores, Faturamento, Histórico.</p>
      </main>
    </div>
  `,
  styles: [`.app-shell{display:flex}.sidebar{width:240px;background:#0d6efd;color:#fff;padding:16px}.content{flex:1;padding:16px}`]
})
export class AppComponent { }
