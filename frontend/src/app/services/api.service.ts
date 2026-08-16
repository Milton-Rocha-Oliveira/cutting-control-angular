import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = '/api';
  constructor(private http: HttpClient) {}

  getSuppliers(): Observable<any> { return this.http.get(`${this.base}/suppliers`); }
  createSupplier(payload:any){ return this.http.post(`${this.base}/suppliers`, payload); }

  listCutsBySupplier(supplierId:number){ return this.http.get(`${this.base}/cuts/supplier/${supplierId}`); }
  createCut(payload:any){ return this.http.post(`${this.base}/cuts`, payload); }

  createInvoice(supplierId:number, createdBy:string){ return this.http.post(`${this.base}/invoices/create/${supplierId}?createdBy=${encodeURIComponent(createdBy)}`, {}); }
  getMonthlyReport(year:number, month:number){ return this.http.get(`${this.base}/reports/monthly?year=${year}&month=${month}`); }
  getAnnualReport(year:number){ return this.http.get(`${this.base}/reports/annual?year=${year}`); }
}
