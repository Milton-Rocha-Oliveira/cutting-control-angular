import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, defer, from, throwError } from 'rxjs';
import { Supplier, Cut, CutPayload, Settlement, Dashboard, OfflineBackup } from './models';
import { AuthService } from './auth.service';
import { OfflineDatabaseService } from './offline-database.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = (globalThis as any).__API_URL__ || 'http://localhost:8080/api';
  readonly offlineMode: boolean;
  constructor(private http: HttpClient, private auth: AuthService, private localDb: OfflineDatabaseService) { this.offlineMode = localDb.enabled; }
  private get ownerId(): string { return this.auth.user?.id || ''; }
  private local<T>(operation: () => Promise<T>): Observable<T> {
    return defer(() => from(operation())).pipe(catchError(error => throwError(() => ({ error: { message: error instanceof Error ? error.message : 'Falha no banco local.' } }))));
  }
  adminStatus(): Observable<{ rootUser: boolean; userManagementEnabled: boolean; accountAuthorized: boolean }> {
    return this.offlineMode ? this.local(() => this.localDb.adminStatus(this.ownerId)) : this.http.get<{ rootUser: boolean; userManagementEnabled: boolean; accountAuthorized: boolean }>(`${this.base}/admin/status`);
  }
  createUser(payload: { email: string; name: string; password: string }): Observable<{ id: string; email: string; status: string }> {
    return this.offlineMode ? this.local(() => this.localDb.createUser(this.ownerId, payload)) : this.http.post<{ id: string; email: string; status: string }>(`${this.base}/admin/users`, payload);
  }
  resetUserPassword(payload: { email: string; newPassword: string }): Observable<void> {
    return this.offlineMode ? this.local(() => this.localDb.resetPassword(this.ownerId, payload.email, payload.newPassword)) : this.http.post<void>(`${this.base}/admin/users/reset-password`, payload);
  }
  changePassword(payload: { currentPassword: string; newPassword: string }): Observable<void> {
    return this.offlineMode ? this.local(() => this.localDb.changePassword(this.ownerId, payload.currentPassword, payload.newPassword)) : this.http.post<void>(`${this.base}/auth/change-password`, payload);
  }
  dashboard(): Observable<Dashboard> { return this.offlineMode ? this.local(() => this.localDb.dashboard(this.ownerId)) : this.http.get<Dashboard>(`${this.base}/dashboard`); }
  suppliers(): Observable<Supplier[]> { return this.offlineMode ? this.local(() => this.localDb.suppliers(this.ownerId)) : this.http.get<Supplier[]>(`${this.base}/suppliers`); }
  cuts(): Observable<Cut[]> { return this.offlineMode ? this.local(() => this.localDb.cuts(this.ownerId)) : this.http.get<Cut[]>(`${this.base}/cuts`); }
  activeCuts(supplierId: number): Observable<Cut[]> { return this.offlineMode ? this.local(async () => (await this.localDb.cuts(this.ownerId, supplierId)).filter(cut => cut.status === 'ACTIVE')) : this.http.get<Cut[]>(`${this.base}/cuts/active`, { params: { supplierId } }); }
  settlements(): Observable<Settlement[]> { return this.offlineMode ? this.local(() => this.localDb.settlements(this.ownerId)) : this.http.get<Settlement[]>(`${this.base}/settlements`); }
  createSupplier(payload: Partial<Supplier>): Observable<Supplier> { return this.offlineMode ? this.local(() => this.localDb.createSupplier(this.ownerId, payload)) : this.http.post<Supplier>(`${this.base}/suppliers`, payload); }
  updateSupplier(id: number, payload: Partial<Supplier>): Observable<Supplier> { return this.offlineMode ? this.local(() => this.localDb.updateSupplier(this.ownerId, id, payload)) : this.http.put<Supplier>(`${this.base}/suppliers/${id}`, payload); }
  deleteSupplier(id: number): Observable<void> { return this.offlineMode ? this.local(() => this.localDb.deleteSupplier(this.ownerId, id)) : this.http.delete<void>(`${this.base}/suppliers/${id}`); }
  createCut(payload: CutPayload): Observable<Cut> { return this.offlineMode ? this.local(() => this.localDb.createCut(this.ownerId, payload)) : this.http.post<Cut>(`${this.base}/cuts`, payload); }
  updateCut(id: number, payload: CutPayload): Observable<Cut> { return this.offlineMode ? this.local(() => this.localDb.updateCut(this.ownerId, id, payload)) : this.http.put<Cut>(`${this.base}/cuts/${id}`, payload); }
  deleteCut(id: number): Observable<void> { return this.offlineMode ? this.local(() => this.localDb.deleteCut(this.ownerId, id)) : this.http.delete<void>(`${this.base}/cuts/${id}`); }
  createSettlement(payload: { supplierId: number; items: Array<{ cutId: number }> }): Observable<Settlement> { return this.offlineMode ? this.local(() => this.localDb.createSettlement(this.ownerId, payload)) : this.http.post<Settlement>(`${this.base}/settlements`, payload); }
  reportCsv(from: string, to: string): Observable<Blob> {
    if (!this.offlineMode) return this.http.get(`${this.base}/reports/settlements.csv`, { params: { from, to }, responseType: 'blob' });
    return this.local(async () => {
      const rows = await this.localDb.settlements(this.ownerId, new Date(`${from}T00:00:00`), new Date(`${to}T23:59:59.999`));
      const csv = ['fatura,fornecedor,corte,descricao,data_producao,pacotes,pecas_por_pacote,total_pecas,preco_por_peca,total'];
      for (const settlement of rows) for (const item of settlement.items) csv.push([settlement.invoiceNumber, settlement.supplierName, item.cutNumber, item.description, item.productionDate, item.packages, item.piecesPerPackage, item.totalPieces, item.unitPricePerPiece, item.totalAmount].map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','));
      return new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8' });
    });
  }
  monthlyReport(year: number, month: number): Observable<Settlement[]> {
    if (!this.offlineMode) return this.http.get<Settlement[]>(`${this.base}/reports/monthly/${year}/${month}`);
    return this.local(() => this.localDb.settlements(this.ownerId, new Date(year, month - 1, 1), new Date(year, month, 1)));
  }
  annualReport(year: number): Observable<Settlement[]> {
    if (!this.offlineMode) return this.http.get<Settlement[]>(`${this.base}/reports/annual/${year}`);
    return this.local(() => this.localDb.settlements(this.ownerId, new Date(year, 0, 1), new Date(year + 1, 0, 1)));
  }
  backup(): Observable<OfflineBackup> {
    return this.offlineMode ? this.local(() => this.localDb.backup(this.ownerId)) : this.http.get<OfflineBackup>(`${this.base}/backup`);
  }
  restoreBackup(backup: OfflineBackup): Observable<{ suppliers: number; cuts: number; settlements: number }> {
    return this.offlineMode ? this.local(() => this.localDb.importBackup(this.ownerId, backup)) : throwError(() => ({ error: { message: 'A restauração de backup só está disponível no aplicativo offline.' } }));
  }
}
