import { from, of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { AppComponent } from './app.component';
import { OfflineDatabaseService } from './offline-database.service';
import { CutPayload } from './models';
import 'fake-indexeddb/auto';

describe('cut registration flow', () => {
  it('saves a new cut locally and makes it available to the cuts display', async () => {
    const db = new OfflineDatabaseService();
    const ownerId = `cut-flow-${crypto.randomUUID()}`;
    const supplier = await db.createSupplier(ownerId, { name: 'Fornecedor de teste' });
    const payload: CutPayload = {
      supplierId: supplier.id,
      cutNumber: 'COR-TESTE-1',
      description: 'Calça jeans',
      packages: 3,
      piecesPerPackage: 12,
      unitPricePerPiece: 1.5,
      productionDate: '2026-10-27'
    };

    const api: any = {
      offlineMode: true,
      createCut: (value: CutPayload) => from(db.createCut(ownerId, value)),
      dashboard: () => of({ suppliers: 1, activeCuts: 1, settlementsThisMonth: 0, invoicedThisMonth: 0, recentSettlements: [] }),
      suppliers: () => from(db.suppliers(ownerId)),
      cuts: () => from(db.cuts(ownerId))
    };

    const vm = new AppComponent(api, {} as any, { markForCheck: () => undefined } as any);
    vm.cutForm = payload;
    vm.saveCut();
    await new Promise(resolve => setTimeout(resolve, 30));

    const stored = await db.cuts(ownerId);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ cutNumber: payload.cutNumber, totalPieces: 36, totalAmount: 54 });
    expect(vm.filteredCuts()).toHaveLength(1);
    expect(vm.filteredCuts()[0].supplierName).toBe('Fornecedor de teste');
    expect(vm.message).toBe('Corte cadastrado com sucesso.');
  });

  it('repairs stored offline data without counters before creating a cut', async () => {
    const ownerId = `old-state-${crypto.randomUUID()}`;
    const request = indexedDB.open('controle-de-cortes-offline', 1);
    const idb = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onupgradeneeded = () => request.result.createObjectStore('state', { keyPath: 'key' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = idb.transaction('state', 'readwrite');
      transaction.objectStore('state').put({
        key: 'main',
        value: {
          accounts: [],
          suppliers: [{ id: 12, name: 'Fornecedor antigo', active: true, _ownerId: ownerId }],
          cuts: [],
          settlements: []
        }
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    idb.close();

    const db = new OfflineDatabaseService();
    const created = await db.createCut(ownerId, {
      supplierId: 12, cutNumber: 'COR-LEGADO-1', description: 'Bermuda', packages: 1,
      piecesPerPackage: 8, unitPricePerPiece: 2, productionDate: '2026-10-27'
    });

    expect(created.id).toBe(1);
    expect(await db.cuts(ownerId)).toHaveLength(1);
  });
});
