import { Injectable } from '@angular/core';
import { Cut, CutPayload, Dashboard, Settlement, Supplier } from './models';

type Account = { id: string; email: string; name: string; root: boolean; salt: string; passwordHash: string };
type Owned<T> = T & { _ownerId: string };
type Backup = { version: 1; exportedAt?: string; suppliers: Supplier[]; cuts: Cut[]; settlements: Settlement[] };
type LocalState = {
  accounts: Account[];
  suppliers: Owned<Supplier>[];
  cuts: Owned<Cut>[];
  settlements: Owned<Settlement>[];
  counters: { supplier: number; cut: number; settlement: number };
  legacyMigrationComplete?: boolean;
};

const DATABASE_NAME = 'controle-de-cortes-offline';
const DATABASE_VERSION = 1;
const STATE_KEY = 'main';

@Injectable({ providedIn: 'root' })
export class OfflineDatabaseService {
  readonly enabled = (globalThis as any).__APP_CONFIG__?.OFFLINE_MODE === true;
  private database?: Promise<IDBDatabase>;

  async register(name: string, email: string, password: string): Promise<Account> {
    const normalizedEmail = email.trim().toLowerCase();
    const salt = this.randomHex(16);
    const passwordHash = await this.hashPassword(password, salt);
    return this.update(state => {
      if (state.accounts.some(account => account.email === normalizedEmail)) throw new Error('Este e-mail já está cadastrado neste aparelho.');
      const account: Account = {
        id: crypto.randomUUID(), email: normalizedEmail, name: name.trim(),
        root: state.accounts.length === 0, salt, passwordHash
      };
      state.accounts.push(account);
      return account;
    });
  }

  async login(email: string, password: string): Promise<Account> {
    const state = await this.read();
    const account = state.accounts.find(value => value.email === email.trim().toLowerCase());
    if (!account || account.passwordHash !== await this.hashPassword(password, account.salt)) throw new Error('E-mail ou senha inválidos neste aparelho.');
    return account;
  }

  async accessWithoutPassword(): Promise<Account> {
    await this.migrateLegacyLocalData();
    return this.update(state => {
      const ownerCounts = new Map<string, number>();
      for (const record of [...state.suppliers, ...state.cuts, ...state.settlements]) {
        ownerCounts.set(record._ownerId, (ownerCounts.get(record._ownerId) || 0) + 1);
      }
      const ownersByData = [...ownerCounts.entries()].sort((a, b) => b[1] - a[1]);
      const existingDataAccount = ownersByData
        .map(([ownerId]) => state.accounts.find(account => account.id === ownerId))
        .find((account): account is Account => !!account);
      const account = existingDataAccount || state.accounts.find(value => value.root) || state.accounts[0];
      if (account) return account;

      const id = ownersByData[0]?.[0] || crypto.randomUUID();
      const localAccount: Account = {
        id, email: 'acesso-local@dispositivo.invalid', name: 'Acesso local', root: true,
        salt: this.randomHex(16), passwordHash: ''
      };
      state.accounts.push(localAccount);
      return localAccount;
    });
  }

  /** Imports records written by the Android v5 app to localStorage. The original
   * key is intentionally retained as a recoverable copy after migration. */
  private async migrateLegacyLocalData(): Promise<void> {
    let legacy: Partial<Pick<LocalState, 'suppliers' | 'cuts' | 'settlements'>> | null = null;
    try {
      const raw = localStorage.getItem('controle-de-cortes-demo');
      if (raw) legacy = JSON.parse(raw);
    } catch {
      return;
    }
    if (!legacy || !Array.isArray(legacy.suppliers) || !Array.isArray(legacy.cuts) || !Array.isArray(legacy.settlements)) return;
    if (![...legacy.suppliers, ...legacy.cuts, ...legacy.settlements].length) return;

    await this.update(state => {
      if (state.legacyMigrationComplete) return;
      if (state.suppliers.length || state.cuts.length || state.settlements.length) {
        state.legacyMigrationComplete = true;
        return;
      }
      const ownerId = 'legacy-android-local-data';
      if (!state.accounts.some(account => account.id === ownerId)) {
        state.accounts.push({
          id: ownerId, email: 'dados-migrados@dispositivo.invalid', name: 'Dados deste dispositivo',
          root: true, salt: this.randomHex(16), passwordHash: ''
        });
      }

      const suppliers = legacy!.suppliers!.filter(value => value && typeof value === 'object') as Supplier[];
      const cuts = legacy!.cuts!.filter(value => value && typeof value === 'object') as Cut[];
      const settlements = legacy!.settlements!.filter(value => value && typeof value === 'object') as Settlement[];
      state.suppliers.push(...suppliers.map(value => ({ ...value, _ownerId: ownerId })));
      state.cuts.push(...cuts.map(value => ({ ...value, _ownerId: ownerId })));
      state.settlements.push(...settlements.map(value => ({ ...value, _ownerId: ownerId })));
      state.counters.supplier = Math.max(state.counters.supplier, ...suppliers.map(value => Number(value.id) || 0));
      state.counters.cut = Math.max(state.counters.cut, ...cuts.map(value => Number(value.id) || 0));
      state.counters.settlement = Math.max(state.counters.settlement, ...settlements.map(value => Number(value.id) || 0));
      state.legacyMigrationComplete = true;
    });
  }

  async hasAccount(id: string): Promise<boolean> {
    return (await this.read()).accounts.some(account => account.id === id);
  }

  async changePassword(ownerId: string, currentPassword: string, newPassword: string): Promise<void> {
    const existing = (await this.read()).accounts.find(value => value.id === ownerId);
    if (!existing || existing.passwordHash !== await this.hashPassword(currentPassword, existing.salt)) throw new Error('A senha atual está incorreta.');
    const salt = this.randomHex(16);
    const passwordHash = await this.hashPassword(newPassword, salt);
    await this.update(state => {
      const account = state.accounts.find(value => value.id === ownerId);
      if (!account || account.salt !== existing.salt) throw new Error('A senha foi alterada em outra operação. Tente novamente.');
      account.salt = salt;
      account.passwordHash = passwordHash;
    });
  }

  async createUser(ownerId: string, payload: { email: string; name: string; password: string }): Promise<{ id: string; email: string; status: string }> {
    const salt = this.randomHex(16);
    const passwordHash = await this.hashPassword(payload.password, salt);
    return this.update(state => {
      const root = state.accounts.find(account => account.id === ownerId);
      if (!root?.root) throw new Error('Somente o administrador local pode criar contas.');
      const email = payload.email.trim().toLowerCase();
      if (state.accounts.some(account => account.email === email)) throw new Error('Este e-mail já está cadastrado neste aparelho.');
      const account: Account = { id: crypto.randomUUID(), email, name: payload.name.trim(), root: false, salt, passwordHash };
      state.accounts.push(account);
      return { id: account.id, email, status: 'ACTIVE' };
    });
  }

  async resetPassword(ownerId: string, email: string, newPassword: string): Promise<void> {
    const salt = this.randomHex(16);
    const passwordHash = await this.hashPassword(newPassword, salt);
    await this.update(state => {
      if (!state.accounts.some(account => account.id === ownerId && account.root)) throw new Error('Somente o administrador local pode redefinir senhas.');
      const account = state.accounts.find(value => value.email === email.trim().toLowerCase());
      if (!account) throw new Error('Usuário não encontrado neste aparelho.');
      account.salt = salt;
      account.passwordHash = passwordHash;
    });
  }

  async adminStatus(ownerId: string) {
    const account = (await this.read()).accounts.find(value => value.id === ownerId);
    return { rootUser: account?.root === true, userManagementEnabled: account?.root === true, accountAuthorized: !!account };
  }

  async suppliers(ownerId: string): Promise<Supplier[]> {
    return (await this.read()).suppliers.filter(value => value._ownerId === ownerId).map(({ _ownerId, ...value }) => value).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  async cuts(ownerId: string, supplierId?: number): Promise<Cut[]> {
    const state = await this.read();
    const supplierNames = new Map(state.suppliers.filter(value => value._ownerId === ownerId).map(value => [value.id, value.name]));
    return state.cuts.filter(value => value._ownerId === ownerId && (supplierId === undefined || value.supplierId === supplierId))
      .map(({ _ownerId, ...value }) => ({ ...value, supplierName: supplierNames.get(value.supplierId) || value.supplierName }))
      .sort((a, b) => b.productionDate.localeCompare(a.productionDate) || a.cutNumber.localeCompare(b.cutNumber));
  }

  async settlements(ownerId: string, from?: Date, to?: Date): Promise<Settlement[]> {
    return (await this.read()).settlements.filter(value => {
      if (value._ownerId !== ownerId) return false;
      const dateValue = value.settledAt || (value as any).billedAt || (value as any).createdAt || (value as any).date || '';
      if (!from && !to) return true;
      const date = new Date(dateValue).getTime();
      return Number.isFinite(date) && (!from || date >= from.getTime()) && (!to || date < to.getTime());
    }).map(value => {
      const { _ownerId, ...record } = value;
      const dateValue = value.settledAt || (value as any).billedAt || (value as any).createdAt || (value as any).date || '';
      return {
        ...record,
        supplierName: String(value.supplierName || 'Fornecedor'),
        settledAt: String(dateValue),
        totalPieces: Number(value.totalPieces) || 0,
        totalAmount: Number(value.totalAmount) || 0,
        items: Array.isArray(value.items) ? value.items : []
      };
    }).sort((a, b) => (Date.parse(b.settledAt) || 0) - (Date.parse(a.settledAt) || 0));
  }

  async dashboard(ownerId: string): Promise<Dashboard> {
    const [suppliers, cuts, settlements] = await Promise.all([this.suppliers(ownerId), this.cuts(ownerId), this.settlements(ownerId)]);
    const now = new Date();
    const month = settlements.filter(item => { const date = new Date(item.settledAt); return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth(); });
    return {
      suppliers: suppliers.length,
      activeCuts: cuts.filter(cut => cut.status === 'ACTIVE').length,
      settlementsThisMonth: month.length,
      invoicedThisMonth: month.reduce((sum, item) => sum + item.totalAmount, 0),
      recentSettlements: settlements.slice(0, 5)
    };
  }

  async createSupplier(ownerId: string, payload: Partial<Supplier>): Promise<Supplier> {
    return this.update(state => {
      const supplier: Owned<Supplier> = { id: ++state.counters.supplier, name: (payload.name || '').trim(), document: payload.document || '', email: payload.email || '', phone: payload.phone || '', active: true, _ownerId: ownerId };
      state.suppliers.push(supplier);
      return this.publicRecord(supplier);
    });
  }

  async updateSupplier(ownerId: string, id: number, payload: Partial<Supplier>): Promise<Supplier> {
    return this.update(state => {
      const supplier = this.supplier(state, ownerId, id);
      if (!supplier.active) throw new Error('Fornecedor inativo não pode ser editado.');
      Object.assign(supplier, { name: (payload.name || '').trim(), document: payload.document || '', email: payload.email || '', phone: payload.phone || '' });
      return this.publicRecord(supplier);
    });
  }

  async deleteSupplier(ownerId: string, id: number): Promise<void> {
    await this.update(state => {
      this.supplier(state, ownerId, id);
      if (state.cuts.some(cut => cut._ownerId === ownerId && cut.supplierId === id) || state.settlements.some(item => item._ownerId === ownerId && item.supplierId === id)) throw new Error('Este fornecedor possui cortes ou fechamentos e não pode ser excluído.');
      state.suppliers = state.suppliers.filter(value => !(value._ownerId === ownerId && value.id === id));
    });
  }

  async createCut(ownerId: string, payload: CutPayload): Promise<Cut> {
    return this.update(state => {
      const supplier = this.supplier(state, ownerId, payload.supplierId);
      if (!supplier.active) throw new Error('Fornecedor inativo não pode receber cortes.');
      const totalPieces = payload.packages * payload.piecesPerPackage;
      const cut: Owned<Cut> = {
        id: ++state.counters.cut, supplierId: supplier.id, supplierName: supplier.name,
        cutNumber: payload.cutNumber.trim(), description: payload.description.trim(), packages: payload.packages,
        piecesPerPackage: payload.piecesPerPackage, unitPricePerPiece: payload.unitPricePerPiece,
        productionDate: payload.productionDate, totalPieces, totalAmount: this.money(totalPieces * payload.unitPricePerPiece), status: 'ACTIVE', _ownerId: ownerId
      };
      state.cuts.push(cut);
      return this.publicRecord(cut);
    });
  }

  async updateCut(ownerId: string, id: number, payload: CutPayload): Promise<Cut> {
    return this.update(state => {
      const cut = this.cut(state, ownerId, id);
      if (cut.status !== 'ACTIVE') throw new Error('Corte inativo não pode ser editado.');
      const supplier = this.supplier(state, ownerId, payload.supplierId);
      if (!supplier.active) throw new Error('Fornecedor inativo não pode receber cortes.');
      cut.supplierId = supplier.id;
      cut.supplierName = supplier.name;
      cut.cutNumber = payload.cutNumber.trim();
      cut.description = payload.description.trim();
      cut.packages = payload.packages;
      cut.piecesPerPackage = payload.piecesPerPackage;
      cut.unitPricePerPiece = payload.unitPricePerPiece;
      cut.productionDate = payload.productionDate;
      cut.totalPieces = payload.packages * payload.piecesPerPackage;
      cut.totalAmount = this.money(cut.totalPieces * payload.unitPricePerPiece);
      return this.publicRecord(cut);
    });
  }

  async deleteCut(ownerId: string, id: number): Promise<void> {
    await this.update(state => {
      const cut = this.cut(state, ownerId, id);
      if (cut.status !== 'ACTIVE') throw new Error('Somente cortes ativos podem ser excluídos.');
      state.cuts = state.cuts.filter(value => !(value._ownerId === ownerId && value.id === id));
    });
  }

  async createSettlement(ownerId: string, request: { supplierId: number; items: Array<{ cutId: number }> }): Promise<Settlement> {
    return this.update(state => {
      const supplier = this.supplier(state, ownerId, request.supplierId);
      if (!supplier.active) throw new Error('Fornecedor inativo não pode ser faturado.');
      if (!request.items.length || new Set(request.items.map(item => item.cutId)).size !== request.items.length) throw new Error('Selecione cortes diferentes para faturar.');
      const selected = request.items.map(({ cutId }) => this.cut(state, ownerId, cutId));
      if (selected.some(cut => cut.status !== 'ACTIVE')) throw new Error('Um dos cortes já foi faturado ou está inativo.');
      if (selected.some(cut => cut.supplierId !== supplier.id)) throw new Error('Todos os cortes devem pertencer ao fornecedor selecionado.');
      const settledAt = new Date().toISOString();
      const settlement: Owned<Settlement> = {
        id: ++state.counters.settlement,
        invoiceNumber: `FAT-${settledAt.replace(/[-:.TZ]/g, '').slice(0, 14)}-${this.randomHex(2).toUpperCase()}`,
        supplierId: supplier.id, supplierName: supplier.name, settledAt, totalPieces: 0, totalAmount: 0,
        createdBy: (state.accounts.find(account => account.id === ownerId)?.email || ''), items: [], _ownerId: ownerId
      };
      settlement.items = selected.map(cut => {
        cut.status = 'INACTIVE';
        cut.billedAt = settledAt;
        settlement.totalPieces += cut.totalPieces;
        settlement.totalAmount = this.money(settlement.totalAmount + cut.totalAmount);
        return { cutId: cut.id, cutNumber: cut.cutNumber, description: cut.description, packages: cut.packages, piecesPerPackage: cut.piecesPerPackage, unitPricePerPiece: cut.unitPricePerPiece, productionDate: cut.productionDate, totalPieces: cut.totalPieces, totalAmount: cut.totalAmount };
      });
      state.settlements.push(settlement);
      return this.publicRecord(settlement);
    });
  }

  async backup(ownerId: string): Promise<Backup> {
    const [suppliers, cuts, settlements] = await Promise.all([this.suppliers(ownerId), this.cuts(ownerId), this.settlements(ownerId)]);
    return { version: 1, exportedAt: new Date().toISOString(), suppliers, cuts, settlements };
  }

  async importBackup(ownerId: string, input: Backup): Promise<{ suppliers: number; cuts: number; settlements: number }> {
    if (input?.version !== 1 || !Array.isArray(input.suppliers) || !Array.isArray(input.cuts) || !Array.isArray(input.settlements)) throw new Error('Arquivo de backup inválido ou incompatível.');
    return this.update(state => {
      if (state.suppliers.some(value => value._ownerId === ownerId) || state.cuts.some(value => value._ownerId === ownerId) || state.settlements.some(value => value._ownerId === ownerId)) throw new Error('Para proteger os dados existentes, a restauração só é permitida quando a conta local está vazia.');
      const supplierIds = new Map<number, number>();
      const cutIds = new Map<number, number>();
      for (const source of input.suppliers) {
        const id = ++state.counters.supplier;
        supplierIds.set(source.id, id);
        state.suppliers.push({ ...source, id, _ownerId: ownerId });
      }
      for (const source of input.cuts) {
        const id = ++state.counters.cut;
        cutIds.set(source.id, id);
        state.cuts.push({ ...source, id, supplierId: supplierIds.get(source.supplierId) ?? source.supplierId, _ownerId: ownerId });
      }
      for (const source of input.settlements) {
        const id = ++state.counters.settlement;
        state.settlements.push({
          ...source, id, supplierId: supplierIds.get(source.supplierId) ?? source.supplierId,
          items: source.items.map(item => ({ ...item, cutId: cutIds.get(item.cutId) ?? item.cutId })), _ownerId: ownerId
        });
      }
      return { suppliers: input.suppliers.length, cuts: input.cuts.length, settlements: input.settlements.length };
    });
  }

  private supplier(state: LocalState, ownerId: string, id: number): Owned<Supplier> {
    const value = state.suppliers.find(item => item.id === id && item._ownerId === ownerId);
    if (!value) throw new Error('Fornecedor não encontrado.');
    return value;
  }
  private cut(state: LocalState, ownerId: string, id: number): Owned<Cut> {
    const value = state.cuts.find(item => item.id === id && item._ownerId === ownerId);
    if (!value) throw new Error('Corte não encontrado.');
    return value;
  }
  private money(value: number): number { return Math.round((value + Number.EPSILON) * 100) / 100; }
  private publicRecord<T extends { _ownerId: string }>(value: T): Omit<T, '_ownerId'> { const { _ownerId, ...record } = value; return record; }
  private initialState(): LocalState { return { accounts: [], suppliers: [], cuts: [], settlements: [], counters: { supplier: 0, cut: 0, settlement: 0 } }; }
  private normalizeState(value: any): LocalState {
    const state = value && typeof value === 'object' ? value : {};
    const accounts: Account[] = Array.isArray(state.accounts) ? state.accounts : [];
    const suppliers: Owned<Supplier>[] = Array.isArray(state.suppliers) ? state.suppliers : [];
    const cuts: Owned<Cut>[] = Array.isArray(state.cuts) ? state.cuts : [];
    const settlements: Owned<Settlement>[] = Array.isArray(state.settlements) ? state.settlements : [];
    const largestId = (records: Array<{ id?: number }>) => records.reduce((largest, item) => Math.max(largest, Number(item.id) || 0), 0);
    const counters = state.counters && typeof state.counters === 'object' ? state.counters : {};
    return {
      ...state,
      accounts,
      suppliers,
      cuts,
      settlements,
      counters: {
        supplier: Math.max(Number(counters.supplier) || 0, largestId(suppliers)),
        cut: Math.max(Number(counters.cut) || 0, largestId(cuts)),
        settlement: Math.max(Number(counters.settlement) || 0, largestId(settlements))
      }
    } as LocalState;
  }

  private async read(): Promise<LocalState> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('state', 'readonly');
      const request = transaction.objectStore('state').get(STATE_KEY);
      request.onsuccess = () => resolve(this.normalizeState(request.result?.value));
      request.onerror = () => reject(request.error || new Error('Não foi possível ler os dados locais.'));
    });
  }

  private async update<T>(work: (state: LocalState) => T): Promise<T> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('state', 'readwrite');
      const store = transaction.objectStore('state');
      const request = store.get(STATE_KEY);
      let result: T;
      request.onsuccess = () => {
        try {
          const state = this.normalizeState(request.result?.value);
          result = work(state);
          store.put({ key: STATE_KEY, value: state });
        } catch (error) {
          transaction.abort();
          reject(error);
        }
      };
      request.onerror = () => reject(request.error || new Error('Não foi possível gravar os dados locais.'));
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error || new Error('Não foi possível gravar os dados locais.'));
      transaction.onabort = () => reject(transaction.error || new Error('A operação local foi cancelada.'));
    });
  }

  private open(): Promise<IDBDatabase> {
    if (!this.database) this.database = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => request.result.createObjectStore('state', { keyPath: 'key' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('O armazenamento local não está disponível.'));
    });
    return this.database;
  }

  private randomHex(bytes: number): string { return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), value => value.toString(16).padStart(2, '0')).join(''); }
  private async hashPassword(password: string, salt: string): Promise<string> {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 120000 }, key, 256);
    return Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, '0')).join('');
  }
}
