import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-suppliers',
  template: `
    <h2>Fornecedores</h2>
    <form (submit)="create()">
      <input [(ngModel)]="name" name="name" placeholder="Nome do fornecedor" required />
      <button type="submit">Salvar</button>
    </form>
    <ul>
      <li *ngFor="let s of suppliers">{{s.name}}</li>
    </ul>
  `
})
export class SuppliersComponent implements OnInit{
  suppliers:any[] = [];
  name = '';
  constructor(private api:ApiService){}
  ngOnInit(){ this.api.getSuppliers().subscribe((r:any)=>this.suppliers=r); }
  create(){ this.api.createSupplier({name:this.name}).subscribe(()=>this.api.getSuppliers().subscribe((r:any)=>this.suppliers=r)); }
}
