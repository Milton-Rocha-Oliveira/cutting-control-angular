import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './api.service';
import { AuthService, AuthUser } from './auth.service';
import { finalize, timeout } from 'rxjs';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Supplier, Cut, CutPayload, Settlement, Dashboard, OfflineBackup } from './models';
import { AuthPageComponent } from './components/auth-page.component';
import { AppHeaderComponent } from './components/app-header.component';
import { AppSection, AppSidebarComponent } from './components/app-sidebar.component';
import { DashboardPageComponent } from './components/dashboard-page.component';
import { SuppliersPageComponent } from './features/suppliers/suppliers-page.component';
import { CutsPageComponent } from './features/cuts/cuts-page.component';
import { BillingPageComponent } from './features/billing/billing-page.component';
import { ReportsPageComponent } from './features/reports/reports-page.component';
import { UsersPageComponent } from './features/users/users-page.component';
import { ChangePasswordComponent } from './components/change-password.component';

interface NativePrintPlugin { printHtml(options: { title: string; html: string }): Promise<void>; }
const NativePrint = registerPlugin<NativePrintPlugin>('NativePrint');

interface RecentCutPreset {
  supplierId: number;
  description: string;
  packages: number;
  piecesPerPackage: number;
  unitPricePerPiece: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, AuthPageComponent, AppSidebarComponent, AppHeaderComponent, DashboardPageComponent, SuppliersPageComponent, CutsPageComponent, BillingPageComponent, ReportsPageComponent, UsersPageComponent, ChangePasswordComponent],
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  section: AppSection = 'dashboard';
  dashboard: Dashboard = { suppliers: 0, activeCuts: 0, settlementsThisMonth: 0, invoicedThisMonth: 0, recentSettlements: [] };
  suppliers: Supplier[] = [];
  cuts: Cut[] = [];
  settlements: Settlement[] = [];
  reportYear = new Date().getFullYear();
  reportMonth = new Date().getMonth() + 1;
  reportMode: 'recent' | 'month' | 'year' = 'month';
  reportLoading = false;
  reportError = '';
  loadedReportYear = this.reportYear;
  loadedReportMonth = this.reportMonth;
  message = '';
  darkMode = this.readThemePreference();
  readonly offlineMode: boolean;
  readonly autoLocalAccess = (globalThis as any).__APP_CONFIG__?.AUTO_LOCAL_ACCESS === true;
  readonly publicRegistration = (globalThis as any).__APP_CONFIG__?.PUBLIC_REGISTRATION === true;

  authReady = false;
  authUser: AuthUser | null = null;
  authBusy = false;
  authError = '';
  isRootUser = false;
  accountAuthorized = false;
  accountStatusLoaded = false;
  private dataLoadedFor: string | null = null;

  supplierForm = { name: '', document: '', email: '', phone: '' };
  editingSupplierId: number | null = null;
  cutForm: CutPayload = this.emptyCutForm();
  editingCutId: number | null = null;
  savingCut = false;
  cutSupplierSearch = '';
  reportSupplierSearch = '';
  filteredReportSettlements: Settlement[] = [];
  reportPage = 0;
  readonly reportPageSize = 30;
  readonly cutTypeSuggestions = ['Calça jeans', 'Calça social', 'Bermuda', 'Short', 'Saia', 'Camisa'];
  recentCutPresets: RecentCutPreset[] = [];
  billing = { supplierId: 0 };
  selectedCutIds: number[] = [];
  expandedCutId: number | null = null;
  expandedReportId: number | null = null;
  private reportRequestSequence = 0;

  constructor(private api: ApiService, public auth: AuthService, private changeDetector: ChangeDetectorRef) {
    this.offlineMode = api.offlineMode;
    this.loadRecentCutPresets();
  }

  private loadRecentCutPresets(): void {
    try {
      const stored = localStorage.getItem('controle-de-cortes-cut-presets-v1');
      const presets = stored ? JSON.parse(stored) : [];
      if (Array.isArray(presets)) this.recentCutPresets = presets.filter(value =>
        Number.isFinite(Number(value?.supplierId)) && Number.isFinite(Number(value?.packages)) &&
        Number.isFinite(Number(value?.piecesPerPackage)) && Number.isFinite(Number(value?.unitPricePerPiece)) &&
        typeof value?.description === 'string'
      ).slice(0, 12);
    } catch { this.recentCutPresets = []; }
  }

  recentCutPresetsForSupplier(): RecentCutPreset[] {
    const supplierId = Number(this.cutForm.supplierId);
    return supplierId ? this.recentCutPresets.filter(preset => preset.supplierId === supplierId).slice(0, 4) : [];
  }

  rememberedCutTypes(): string[] {
    return [...new Set([...this.cutTypeSuggestions, ...this.recentCutPresets.map(preset => preset.description)])];
  }

  applyCutPreset(preset: RecentCutPreset): void {
    this.cutForm = {
      ...this.cutForm,
      description: preset.description,
      packages: preset.packages,
      piecesPerPackage: preset.piecesPerPackage,
      unitPricePerPiece: preset.unitPricePerPiece
    };
    this.message = `Preenchimento rápido aplicado: ${preset.description}.`;
    this.changeDetector.markForCheck();
  }

  private rememberCutPreset(payload: CutPayload): void {
    const preset: RecentCutPreset = {
      supplierId: Number(payload.supplierId), description: payload.description.trim(),
      packages: Number(payload.packages), piecesPerPackage: Number(payload.piecesPerPackage),
      unitPricePerPiece: Number(payload.unitPricePerPiece)
    };
    this.recentCutPresets = [preset, ...this.recentCutPresets.filter(value =>
      !(value.supplierId === preset.supplierId && value.description.toLocaleLowerCase() === preset.description.toLocaleLowerCase() &&
        value.packages === preset.packages && value.piecesPerPackage === preset.piecesPerPackage &&
        value.unitPricePerPiece === preset.unitPricePerPiece)
    )].slice(0, 12);
    try { localStorage.setItem('controle-de-cortes-cut-presets-v1', JSON.stringify(this.recentCutPresets)); } catch { /* cache opcional do aparelho */ }
  }

  ngOnInit(): void {
    this.auth.ready$.subscribe(ready => {
      this.authReady = ready;
      if (ready && this.auth.user) this.loadAuthenticatedData(this.auth.user);
      this.changeDetector.markForCheck();
    });
    this.auth.user$.subscribe(user => {
      this.authUser = user;
      if (user && this.authReady) this.loadAuthenticatedData(user);
      if (!user) { this.dataLoadedFor = null; this.isRootUser = false; this.accountAuthorized = false; this.accountStatusLoaded = false; }
      this.changeDetector.markForCheck();
    });
  }

  private loadAuthenticatedData(user: AuthUser): void {
    if (this.dataLoadedFor === user.username) return;
    this.dataLoadedFor = user.username;
    this.accountStatusLoaded = false;
    this.api.adminStatus().subscribe({
      next: status => {
        this.isRootUser = status.rootUser;
        this.accountAuthorized = status.accountAuthorized;
        this.accountStatusLoaded = true;
        if (this.accountAuthorized) {
          this.refresh();
        }
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.isRootUser = false;
        this.accountAuthorized = false;
        this.accountStatusLoaded = true;
        this.authError = 'Não foi possível validar o acesso à API. Verifique se o servidor está disponível.';
        this.changeDetector.markForCheck();
      }
    });
  }

  async submitLogin(credentials: { email: string; password: string }): Promise<void> {
    this.authBusy = true;
    this.authError = '';
    try {
      await this.auth.signIn(credentials.email, credentials.password);
    } catch (error) {
      this.authError = this.errorMessage(error, 'Não foi possível entrar.');
    } finally {
      this.authBusy = false;
    }
  }

  async registerAccount(account: { name: string; email: string; password: string }): Promise<void> {
    this.authBusy = true;
    this.authError = '';
    try {
      await this.auth.signUp(account.name, account.email, account.password);
    } catch (error) {
      this.authError = this.errorMessage(error, 'Não foi possível criar a conta.');
    } finally {
      this.authBusy = false;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.auth.signOut();
      this.message = '';
      this.authError = '';
    } catch (error) {
      this.message = this.errorMessage(error, 'Não foi possível sair.');
    }
  }

  toggleTheme(): void {
    this.darkMode = !this.darkMode;
    try { localStorage.setItem('controle-de-cortes-theme', this.darkMode ? 'dark' : 'light'); } catch { /* preferência apenas nesta sessão */ }
  }

  private readThemePreference(): boolean {
    try { const saved = localStorage.getItem('controle-de-cortes-theme'); return saved ? saved === 'dark' : globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches === true; } catch { return false; }
  }

  private errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
  }

  refresh(): void {
    this.api.dashboard().subscribe({ next: v => { this.dashboard = v; this.changeDetector.markForCheck(); }, error: () => { this.message = 'Não foi possível carregar o dashboard.'; this.changeDetector.markForCheck(); } });
    this.api.suppliers().subscribe({ next: v => {
      this.suppliers = v;
      const first = v.find(s => s.active);
      if (!v.some(s => s.id === this.billing.supplierId && s.active)) this.billing.supplierId = first?.id || 0;
      if (!v.some(s => s.id === Number(this.cutForm.supplierId) && s.active)) this.cutForm.supplierId = first?.id || 0;
      this.changeDetector.markForCheck();
    }, error: () => { this.message = 'Não foi possível carregar os fornecedores.'; this.changeDetector.markForCheck(); } });
    this.api.cuts().subscribe({ next: v => {
      this.cuts = [...v].sort((a, b) => b.id - a.id);
      this.selectedCutIds = this.selectedCutIds.filter(id => v.some(c => c.id === id && c.status === 'ACTIVE'));
      this.changeDetector.markForCheck();
    }, error: () => { this.message = 'Não foi possível carregar os cortes.'; this.changeDetector.markForCheck(); } });
  }

  setSection(s: AppSection): void {
    this.section = s;
    this.message = '';
    if (s === 'reports') this.loadMonthlyReport();
  }
  addSupplier(): void {
    const name = this.supplierForm.name.trim();
    const phone = this.supplierForm.phone.trim();

    if (!name) {
      this.message = 'Nome do fornecedor é obrigatório.';
      return;
    }

    if (!phone) {
      this.message = 'Telefone do fornecedor é obrigatório.';
      return;
    }

    this.api.createSupplier({ ...this.supplierForm, name, phone }).subscribe({
      next: () => { this.message = 'Fornecedor cadastrado com sucesso.'; this.supplierForm = { name: '', document: '', email: '', phone: '' }; this.refresh(); },
      error: () => this.message = 'Não foi possível cadastrar o fornecedor.'
    });
  }

  startEditSupplier(supplier: Supplier): void {
    this.editingSupplierId = supplier.id;
    this.supplierForm = {
      name: supplier.name,
      document: supplier.document || '',
      email: supplier.email || '',
      phone: supplier.phone || ''
    };
    this.message = 'Editando fornecedor.';
  }

  cancelEditSupplier(): void {
    this.editingSupplierId = null;
    this.supplierForm = { name: '', document: '', email: '', phone: '' };
    this.message = '';
  }

  saveSupplier(): void {
    const name = this.supplierForm.name.trim();
    const phone = this.supplierForm.phone.trim();

    if (!name) {
      this.message = 'Nome do fornecedor é obrigatório.';
      return;
    }

    if (!phone) {
      this.message = 'Telefone do fornecedor é obrigatório.';
      return;
    }

    const payload = { ...this.supplierForm, name, phone };

    if (this.editingSupplierId !== null) {
      this.api.updateSupplier(this.editingSupplierId, payload).subscribe({
        next: () => {
          this.message = 'Fornecedor atualizado com sucesso.';
          this.cancelEditSupplier();
          this.refresh();
        },
        error: () => this.message = 'Não foi possível atualizar o fornecedor.'
      });
      return;
    }

    this.addSupplier();
  }

  deleteSupplier(id: number): void {
    if (!window.confirm('Deseja excluir este fornecedor?')) return;
    this.api.deleteSupplier(id).subscribe({
      next: () => {
        this.message = 'Fornecedor excluído com sucesso.';
        if (this.editingSupplierId === id) this.cancelEditSupplier();
        this.refresh();
      },
      error: () => this.message = 'Não foi possível excluir o fornecedor.'
    });
  }

  saveCut(): void {
    if (this.savingCut) return;
    const supplierId = Number(this.cutForm.supplierId);
    const cutNumber = this.cutForm.cutNumber.trim();
    const description = this.cutForm.description.trim();
    const packages = Number(this.cutForm.packages);
    const piecesPerPackage = Number(this.cutForm.piecesPerPackage);
    const unitPricePerPiece = Number(String(this.cutForm.unitPricePerPiece ?? '').trim().replace(',', '.'));

    if (!supplierId) {
      this.message = 'Selecione um fornecedor para o corte.';
      return;
    }
    if (!cutNumber) {
      this.message = 'Número do corte é obrigatório.';
      return;
    }
    if (!description) {
      this.message = 'Descrição do corte é obrigatória.';
      return;
    }
    if (!Number.isFinite(packages) || packages < 1) {
      this.message = 'Quantidade de pacotes deve ser maior que zero.';
      return;
    }
    if (!Number.isFinite(piecesPerPackage) || piecesPerPackage < 1) {
      this.message = 'Peças por pacote deve ser maior que zero.';
      return;
    }
    if (!Number.isFinite(unitPricePerPiece) || unitPricePerPiece <= 0) {
      this.message = 'Preço por peça deve ser maior que zero.';
      return;
    }

    const payload: CutPayload = { ...this.cutForm, supplierId, cutNumber, description, packages, piecesPerPackage, unitPricePerPiece };
    const editingId = this.editingCutId;
    const creating = editingId === null;
    const operation = creating
      ? this.api.createCut(payload)
      : this.api.updateCut(editingId!, payload);
    this.savingCut = true;
    this.message = 'Salvando corte…';
    operation.pipe(finalize(() => {
      this.savingCut = false;
      this.changeDetector.markForCheck();
    })).subscribe({
      next: savedCut => {
        if (creating) this.rememberCutPreset(payload);
        this.cuts = creating
          ? [savedCut, ...this.cuts.filter(cut => cut.id !== savedCut.id)].sort((a, b) => b.id - a.id)
          : this.cuts.map(cut => cut.id === savedCut.id ? savedCut : cut).sort((a, b) => b.id - a.id);
        this.message = creating ? 'Corte cadastrado com sucesso.' : 'Corte atualizado com sucesso.';
        this.resetCutForm();
        this.refresh();
        this.changeDetector.markForCheck();
      },
      error: (e) => {
        this.message = e?.error?.message || 'Não foi possível cadastrar o corte.';
        this.changeDetector.markForCheck();
      }
    });
  }
  startEditCut(cut: Cut): void {
    if (cut.status !== 'ACTIVE') return;
    this.editingCutId = cut.id;
    this.cutForm = {
      supplierId: cut.supplierId,
      cutNumber: cut.cutNumber,
      description: cut.description,
      packages: cut.packages,
      piecesPerPackage: cut.piecesPerPackage,
      unitPricePerPiece: cut.unitPricePerPiece,
      productionDate: cut.productionDate
    };
    this.message = 'Editando corte ativo.';
  }
  cancelEditCut(): void {
    this.resetCutForm();
    this.message = '';
  }
  deleteCut(cut: Cut): void {
    if (cut.status !== 'ACTIVE') {
      this.message = 'Somente cortes ativos podem ser excluídos.';
      return;
    }
    if (!window.confirm(`Deseja excluir o corte ${cut.cutNumber}?`)) return;
    this.api.deleteCut(cut.id).subscribe({
      next: () => {
        if (this.editingCutId === cut.id) this.resetCutForm();
        this.expandedCutId = null;
        this.message = 'Corte excluído com sucesso.';
        this.refresh();
      },
      error: (e) => this.message = e?.error?.message || 'Não foi possível excluir o corte.'
    });
  }
  private resetCutForm(): void {
    this.editingCutId = null;
    this.cutForm = this.emptyCutForm();
  }
  private emptyCutForm(): CutPayload {
    return {
      supplierId: 0,
      cutNumber: '',
      description: '',
      packages: 1,
      piecesPerPackage: 1,
      unitPricePerPiece: 0,
      productionDate: new Date().toISOString().slice(0, 10)
    };
  }
  filteredCuts(): Cut[] {
    const query = this.cutSupplierSearch.trim().toLocaleLowerCase();
    if (!query) return this.cuts;
    return this.cuts.filter(cut => cut.supplierName.toLocaleLowerCase().includes(query));
  }
  filteredSettlements(): Settlement[] {
    return this.filteredReportSettlements;
  }
  get reportPageCount(): number { return Math.max(1, Math.ceil(this.filteredReportSettlements.length / this.reportPageSize)); }
  get visibleReportSettlements(): Settlement[] {
    const start = this.reportPage * this.reportPageSize;
    return this.filteredReportSettlements.slice(start, start + this.reportPageSize);
  }
  onReportSupplierSearchChanged(): void { this.updateFilteredReportSettlements(); }
  private updateFilteredReportSettlements(): void {
    const query = this.reportSupplierSearch.trim().toLocaleLowerCase();
    this.filteredReportSettlements = query
      ? this.settlements.filter(item => String(item.supplierName || '').toLocaleLowerCase().includes(query))
      : this.settlements;
    this.reportPage = 0;
  }
  private normalizeSettlements(values: Settlement[]): Settlement[] {
    if (!Array.isArray(values)) return [];
    return values.filter(Boolean).map(item => {
      const value = item as Settlement & { billedAt?: string; createdAt?: string; date?: string };
      return {
        ...value,
        supplierName: String(value.supplierName || 'Fornecedor'),
        settledAt: String(value.settledAt || value.billedAt || value.createdAt || value.date || ''),
        totalPieces: Number(value.totalPieces) || 0,
        totalAmount: Number(value.totalAmount) || 0,
        items: Array.isArray(value.items) ? value.items : []
      };
    });
  }
  settlementItemCount(item: Settlement): number { return Array.isArray(item.items) ? item.items.length : 0; }
  cutPriceSuggestions(): number[] {
    return [...new Set(this.cuts.map(cut => cut.unitPricePerPiece).filter(value => value > 0))].slice(0, 8);
  }
  setBillingSupplier(id: number): void { this.billing.supplierId = +id; this.selectedCutIds = []; }
  cutsForSupplier(): Cut[] { return this.cuts.filter(c => c.supplierId === +this.billing.supplierId && c.status === 'ACTIVE'); }
  activeSuppliers(): Supplier[] { return this.suppliers.filter(s => s.active); }
  toggleCut(id: number, checked: boolean): void { this.selectedCutIds = checked ? [...this.selectedCutIds, id] : this.selectedCutIds.filter(x => x !== id); }
  isSelected(id: number): boolean { return this.selectedCutIds.includes(id); }
  selectedCuts(): Cut[] { return this.cutsForSupplier().filter(c => this.selectedCutIds.includes(c.id)); }
  selectedPieces(): number { return this.selectedCuts().reduce((sum, c) => sum + c.totalPieces, 0); }
  selectedAmount(): number { return this.selectedCuts().reduce((sum, c) => sum + c.totalAmount, 0); }
  bill(): void {
    if (!this.billing.supplierId || !this.selectedCutIds.length) return;
    const nativePrint = Capacitor.isNativePlatform();
    const pdfWindow = nativePrint ? null : window.open('', '_blank');
    if (pdfWindow) {
      pdfWindow.document.write('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Preparando fechamento</title><body>Preparando o documento do fechamento…</body></html>');
      pdfWindow.document.close();
    }
    this.api.createSettlement({ supplierId: this.billing.supplierId, items: this.selectedCutIds.map(cutId => ({ cutId })) }).subscribe({
      next: settlement => {
        this.message = nativePrint
          ? 'Fechamento confirmado. Abrindo a impressão para salvar o PDF.'
          : pdfWindow
          ? 'Fechamento confirmado. Revise e salve o PDF na janela aberta.'
          : 'Fechamento confirmado. O navegador bloqueou o PDF; gere-o pelo Histórico e relatórios.';
        this.selectedCutIds = [];
        this.refresh();
        if (pdfWindow && !pdfWindow.closed) {
          const document = this.settlementPdfDocument(settlement);
          this.writePdfWindow(pdfWindow, document.title, document.content);
        } else if (nativePrint) {
          const document = this.settlementPdfDocument(settlement);
          this.openPdfWindow(document.title, document.content);
        }
      },
      error: e => {
        if (pdfWindow && !pdfWindow.closed) pdfWindow.close();
        this.message = e?.error?.message || 'Não foi possível faturar.';
      }
    });
  }
  loadMonthlyReport(): void {
    const year = +this.reportYear, month = +this.reportMonth;
    const request = ++this.reportRequestSequence;
    this.reportMode = 'month';
    this.reportError = '';
    if (!Number.isInteger(year) || year < 2000 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12) {
      this.reportLoading = false;
      this.reportError = 'Informe um ano válido e um mês entre 1 e 12.';
      return;
    }
    this.reportLoading = true;
    this.settlements = [];
    this.filteredReportSettlements = [];
    this.reportPage = 0;
    this.loadedReportYear = year;
    this.loadedReportMonth = month;
    this.api.monthlyReport(year, month).pipe(
      timeout({ first: 10000 }),
      finalize(() => {
        if (request === this.reportRequestSequence) {
          this.reportLoading = false;
          this.changeDetector.markForCheck();
        }
      })
    ).subscribe({
      next: v => {
        if (request !== this.reportRequestSequence) return;
        this.settlements = this.normalizeSettlements(v);
        this.updateFilteredReportSettlements();
        this.changeDetector.markForCheck();
      },
      error: failure => {
        if (request !== this.reportRequestSequence) return;
        this.reportError = this.reportFailureMessage(failure, 'Não foi possível carregar o histórico mensal.');
        this.changeDetector.markForCheck();
      }
    });
  }
  private reportFailureMessage(failure: any, fallback: string): string {
    const detail = failure?.error?.message || failure?.message;
    return detail ? `${fallback} ${detail}` : `${fallback} Verifique a conexão e tente novamente.`;
  }
  monthlyProductionPieces(): number {
    return this.settlements.reduce((total, settlement) => {
      const items = settlement.items || [];
      const invoicedPieces = items.length
        ? items.reduce((pieces, item) => pieces + (Number(item.totalPieces) || 0), 0)
        : Number(settlement.totalPieces) || 0;
      return total + invoicedPieces;
    }, 0);
  }
  monthlyProductionValue(): number {
    return this.settlements.reduce((total, settlement) => {
      const items = settlement.items || [];
      const invoicedValue = items.length
        ? items.reduce((value, item) => value + (Number(item.totalAmount) || 0), 0)
        : Number(settlement.totalAmount) || 0;
      return total + invoicedValue;
    }, 0);
  }
  monthlyInvoicedValue(): number { return this.settlements.reduce((total, item) => total + (Number(item.totalAmount) || 0), 0); }
  printSettlementPdf(item: Settlement): void {
    const document = this.settlementPdfDocument(item);
    this.openPdfWindow(document.title, document.content);
  }
  private settlementPdfDocument(item: Settlement): { title: string; content: string } {
    const rows = (item.items || []).map(cut => `<tr><td>${this.pdfText(cut.cutNumber)}</td><td>${this.pdfText(cut.description)}</td><td>${this.pdfDate(cut.productionDate)}</td><td>${cut.totalPieces.toLocaleString('pt-BR')}</td><td>${this.money(cut.totalAmount)}</td></tr>`).join('');
    return {
      title: `Fechamento ${item.invoiceNumber}`,
      content: `<h1>Resumo do fechamento</h1><p class="subtitle">${this.pdfText(item.invoiceNumber)}</p><section class="summary"><div><small>FORNECEDOR</small><strong>${this.pdfText(item.supplierName)}</strong></div><div><small>DATA DO FECHAMENTO</small><strong>${this.pdfDateTime(item.settledAt)}</strong></div><div><small>PEÇAS</small><strong>${item.totalPieces.toLocaleString('pt-BR')}</strong></div><div><small>TOTAL FATURADO</small><strong>${this.money(item.totalAmount)}</strong></div></section><h2>Cortes incluídos</h2><table><thead><tr><th>Corte</th><th>Descrição</th><th>Produção</th><th>Peças</th><th>Valor</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Nenhum corte neste fechamento.</td></tr>'}</tbody></table><p class="signature">Gerado pelo Controle de Cortes</p>`
    };
  }
  printMonthlyPdf(): void {
    const month = `${this.loadedReportYear}-${String(this.loadedReportMonth).padStart(2, '0')}`;
    const closures = this.settlements.map(item => {
      const rows = (item.items || []).map(cut => `<tr><td>${this.pdfText(cut.cutNumber)}</td><td>${this.pdfText(cut.description)}</td><td>${this.pdfDate(cut.productionDate)}</td><td>${cut.totalPieces.toLocaleString('pt-BR')}</td><td>${this.money(cut.totalAmount)}</td></tr>`).join('');
      return `<section class="closure"><h2>${this.pdfText(item.invoiceNumber)} · ${this.pdfText(item.supplierName)}</h2><p>Fechado em ${this.pdfDateTime(item.settledAt)} · ${item.totalPieces.toLocaleString('pt-BR')} peças · ${this.money(item.totalAmount)}</p><table><thead><tr><th>Corte</th><th>Descrição</th><th>Produção</th><th>Peças</th><th>Valor</th></tr></thead><tbody>${rows}</tbody></table></section>`;
    }).join('');
    const title = `Resumo mensal ${String(this.loadedReportMonth).padStart(2, '0')}-${this.loadedReportYear}`;
    this.openPdfWindow(title, `<h1>Resumo mensal</h1><p class="subtitle">${String(this.loadedReportMonth).padStart(2, '0')}/${this.loadedReportYear}</p><section class="summary"><div><small>PEÇAS FATURADAS</small><strong>${this.monthlyProductionPieces().toLocaleString('pt-BR')}</strong></div><div><small>VALOR DAS PEÇAS FATURADAS</small><strong>${this.money(this.monthlyProductionValue())}</strong></div><div><small>FECHAMENTOS</small><strong>${this.settlements.length.toLocaleString('pt-BR')}</strong></div><div><small>TOTAL FATURADO</small><strong>${this.money(this.monthlyInvoicedValue())}</strong></div></section><p class="note">Os totais incluem somente peças que passaram por faturamento em fechamentos registrados no período.</p><h2>Fechamentos do mês</h2>${closures || '<p>Nenhum fechamento registrado neste mês.</p>'}<p class="signature">Gerado pelo Controle de Cortes · período ${month}</p>`);
  }
  private pdfText(value: string): string {
    const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(value ?? '').replace(/[&<>"']/g, char => entities[char]);
  }
  private pdfDate(value: string): string { const [year, month, day] = value.split('-'); return `${day}/${month}/${year}`; }
  private pdfDateTime(value: string): string { return new Date(value).toLocaleString('pt-BR'); }
  private openPdfWindow(title: string, content: string): void {
    if (Capacitor.isNativePlatform()) {
      NativePrint.printHtml({ title, html: this.pdfDocumentHtml(title, content) }).catch(error => {
        this.message = error?.message || 'Não foi possível abrir a impressão do PDF.';
      });
      return;
    }
    const report = window.open('', '_blank');
    if (!report) { this.message = 'O navegador bloqueou a janela do relatório. Permita pop-ups para gerar o PDF.'; return; }
    this.writePdfWindow(report, title, content);
  }
  private writePdfWindow(report: Window, title: string, content: string): void {
    report.document.open();
    report.document.write(this.pdfDocumentHtml(title, content));
    report.document.close();
  }
  private pdfDocumentHtml(title: string, content: string): string {
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${this.pdfText(title)}</title><style>@page{size:A4;margin:18mm}*{box-sizing:border-box}body{font:12px Arial,sans-serif;color:#172033}h1{font-size:24px;margin:0 0 4px}h2{font-size:15px;margin:22px 0 8px}.subtitle{margin:0;color:#64748b}.summary{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:22px 0;padding:14px;background:#f3f5f9;border-radius:8px}.summary div{padding:6px}.summary small{display:block;color:#64748b;font-size:9px;font-weight:bold;margin-bottom:5px}.summary strong{font-size:15px}.note,.closure p{color:#64748b;font-size:10px}table{width:100%;border-collapse:collapse;margin:8px 0 16px}th,td{text-align:left;padding:7px 6px;border-bottom:1px solid #dfe4ec}th{background:#f3f5f9;font-size:10px}td{font-size:10px}.closure{break-inside:avoid}.signature{margin-top:28px;color:#94a3b8;font-size:9px}.print-button{margin:0 0 18px;padding:10px 14px;border:0;border-radius:6px;background:#075a9f;color:#fff;font-weight:bold;cursor:pointer}@media print{.print-button{display:none}}</style></head><body><button class="print-button" onclick="window.print()">Imprimir / salvar PDF</button>${content}<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));</script></body></html>`;
  }
  downloadReport(): void {
    const rows = ['fatura,fornecedor,corte,descricao,data_producao,pacotes,pecas_por_pacote,total_pecas,preco_por_peca,total'];
    const csv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    for (const settlement of this.filteredSettlements()) {
      for (const item of settlement.items || []) {
        rows.push([settlement.invoiceNumber, settlement.supplierName, item.cutNumber, item.description, item.productionDate,
          item.packages, item.piecesPerPackage, item.totalPieces, item.unitPricePerPiece, item.totalAmount].map(csv).join(','));
      }
    }
    const period = this.reportMode === 'year' ? String(this.loadedReportYear)
      : this.reportMode === 'month' ? `${this.loadedReportYear}-${String(this.loadedReportMonth).padStart(2, '0')}` : 'recentes';
    const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `faturamentos-${period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
  downloadBackup(): void {
    this.api.backup().subscribe({
      next: backup => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `controle-de-cortes-backup-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
        this.message = 'Backup JSON exportado. Guarde o arquivo em local seguro.';
      },
      error: failure => this.message = failure?.error?.message || 'Não foi possível exportar o backup.'
    });
  }
  restoreBackup(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    file.text().then(text => {
      const backup = JSON.parse(text) as OfflineBackup;
      this.api.restoreBackup(backup).subscribe({
        next: result => {
          this.message = `Backup importado: ${result.suppliers} fornecedor(es), ${result.cuts} corte(s) e ${result.settlements} fechamento(s).`;
          this.refresh();
        },
        error: failure => this.message = failure?.error?.message || 'Não foi possível restaurar o backup.'
      });
    }).catch(() => this.message = 'O arquivo selecionado não é um backup JSON válido.').finally(() => input.value = '');
  }
  toggleCutDetails(cutId: number): void {
    this.expandedCutId = this.expandedCutId === cutId ? null : cutId;
  }
  toggleReportDetails(reportId: number): void {
    this.expandedReportId = this.expandedReportId === reportId ? null : reportId;
  }
  money(v: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0); }
}
