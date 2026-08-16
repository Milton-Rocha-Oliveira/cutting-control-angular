import { Component } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-monthly-report',
  template: `
    <h3>Fechamento Mensal</h3>
    <label>Ano: <input type="number" [(ngModel)]="year" /></label>
    <label>Mês: <input type="number" [(ngModel)]="month" /></label>
    <button (click)="load()">Carregar</button>
    <div *ngIf="report">
      <p>Total peças: {{report.totalPieces}}</p>
      <p>Valor total: {{report.totalValue | currency:'BRL':'symbol':'1.2-2':'pt-BR'}}</p>
      <h4>Por Fornecedor</h4>
      <ul>
        <li *ngFor="let s of report.bySupplier">{{s.supplierName}} — {{s.totalPieces}} peças — {{s.totalValue | currency:'BRL':'symbol':'1.2-2':'pt-BR'}}</li>
      </ul>
    </div>
  `
})
export class MonthlyReportComponent{
  year:number = new Date().getFullYear();
  month:number = new Date().getMonth()+1;
  report:any = null;
  constructor(private api:ApiService){}
  load(){ this.api.getMonthlyReport(this.year,this.month).subscribe(r=>this.report=r, e=>alert('Erro: '+e)); }
}
