import { Component } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-annual-report',
  template: `
    <h3>Fechamento Anual</h3>
    <label>Ano: <input type="number" [(ngModel)]="year" /></label>
    <button (click)="load()">Carregar</button>
    <div *ngIf="report">
      <p>Total peças: {{report.totalPieces}}</p>
      <p>Valor total: {{report.totalValue | currency:'BRL':'symbol':'1.2-2':'pt-BR'}}</p>
      <p>Média mensal peças: {{report.avgMonthlyPieces}}</p>
      <p>Média mensal valor: {{report.avgMonthlyValue | currency:'BRL':'symbol':'1.2-2':'pt-BR'}}</p>
      <h4>Ranking por fornecedor (valor)</h4>
      <ol>
        <li *ngFor="let r of report.ranking">Fornecedor ID: {{r.supplierId}} — {{r.totalValue | currency:'BRL':'symbol':'1.2-2':'pt-BR'}} — {{r.totalPieces}} peças</li>
      </ol>
    </div>
  `
})
export class AnnualReportComponent{
  year:number = new Date().getFullYear();
  report:any = null;
  constructor(private api:ApiService){}
  load(){ this.api.getAnnualReport(this.year).subscribe(r=>this.report=r, e=>alert('Erro: '+e)); }
}
