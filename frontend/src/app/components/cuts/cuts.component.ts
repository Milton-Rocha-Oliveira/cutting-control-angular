import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-cuts',
  template: `
    <h2>Cortes</h2>
    <div>
      <label>Fornecedor ID: <input [(ngModel)]="supplierId" /></label>
      <button (click)="load()">Carregar</button>
    </div>
    <form (submit)="create()">
      <input [(ngModel)]="cutNumber" name="cutNumber" placeholder="Número do corte" required />
      <input type="number" [(ngModel)]="packages" name="packages" placeholder="Pacotes" required />
      <input type="number" [(ngModel)]="piecesPerPackage" name="piecesPerPackage" placeholder="Peças por pacote" required />
      <input type="number" step="0.01" [(ngModel)]="piecePrice" name="piecePrice" placeholder="Valor por peça" required />
      <button type="submit">Criar Corte</button>
    </form>
    <table>
      <thead><tr><th>Nº</th><th>Pacotes</th><th>Peças por pacote</th><th>Total peças</th><th>Valor total</th><th>Status</th></tr></thead>
      <tbody>
        <tr *ngFor="let c of cuts">
          <td>{{c.cutNumber}}</td>
          <td>{{c.packages}}</td>
          <td>{{c.piecesPerPackage}}</td>
          <td>{{c.totalPieces}}</td>
          <td>{{c.totalValue | currency:'BRL':'symbol':'1.2-2':'pt-BR'}}</td>
          <td>{{c.active ? 'Ativo' : 'Inativo'}}</td>
        </tr>
      </tbody>
    </table>
  `
})
export class CutsComponent implements OnInit{
  supplierId:number = 0;
  cuts:any[] = [];
  cutNumber=''; packages=0; piecesPerPackage=0; piecePrice=0;
  constructor(private api:ApiService){}
  ngOnInit(){}
  load(){ this.api.listCutsBySupplier(this.supplierId).subscribe((r:any)=>this.cuts=r); }
  create(){ const payload:any = { supplier:{id:this.supplierId}, cutNumber:this.cutNumber, packages:this.packages, piecesPerPackage:this.piecesPerPackage, piecePrice:this.piecePrice }; this.api.createCut(payload).subscribe(()=>this.load()); }
}
