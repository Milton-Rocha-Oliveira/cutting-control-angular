import { Component } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-invoicing',
  template: `
    <h2>Faturamento</h2>
    <label>Fornecedor ID: <input [(ngModel)]="supplierId" /></label>
    <button (click)="loadActive()">Carregar cortes ativos</button>

    <div *ngIf="cuts.length">
      <h3>Revisar cortes</h3>
      <table>
        <thead><tr><th></th><th>Nº</th><th>Total peças</th><th>Valor</th></tr></thead>
        <tbody>
          <tr *ngFor="let c of cuts">
            <td><input type="checkbox" [(ngModel)]="c.selected" /></td>
            <td>{{c.cutNumber}}</td>
            <td>{{c.totalPieces}}</td>
            <td>{{c.totalValue | currency:'BRL':'symbol':'1.2-2':'pt-BR'}}</td>
          </tr>
        </tbody>
      </table>
      <div>
        <p>Total peças selecionadas: {{totalPieces()}}</p>
        <p>Valor total: {{totalValue() | currency:'BRL':'symbol':'1.2-2':'pt-BR'}}</p>
        <button (click)="confirm()">Confirmar faturamento</button>
      </div>
    </div>
  `
})
export class InvoicingComponent{
  supplierId:number = 0;
  cuts:any[] = [];
  constructor(private api:ApiService){}
  loadActive(){ this.api.listCutsBySupplier(this.supplierId).subscribe((r:any)=>this.cuts=r.filter((c:any)=>c.active)); }
  totalPieces(){ return this.cuts.filter(c=>c.selected).reduce((s,c)=>s+(c.totalPieces||0),0); }
  totalValue(){ return this.cuts.filter(c=>c.selected).reduce((s,c)=>s+(parseFloat(c.totalValue)||0),0); }
  confirm(){ const createdBy = 'system'; this.api.createInvoice(this.supplierId, createdBy).subscribe(()=>{ alert('Faturamento criado'); this.loadActive(); }, err=> alert('Erro: ' + err)); }
}
