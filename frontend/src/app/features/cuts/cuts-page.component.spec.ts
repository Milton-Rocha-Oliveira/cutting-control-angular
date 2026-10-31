import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { AppComponent } from '../../app.component';
import { ApiService } from '../../api.service';
import { OfflineDatabaseService } from '../../offline-database.service';
import { CutsPageComponent } from './cuts-page.component';

describe('CutsPageComponent save button', () => {
  it('saves repeated cut numbers and offers the saved values as quick-fill shortcuts', async () => {
    (globalThis as any).__APP_CONFIG__ = { OFFLINE_MODE: true };
    localStorage.removeItem('controle-de-cortes-cut-presets-v1');
    const db = new OfflineDatabaseService();
    const ownerId = `button-cut-${crypto.randomUUID()}`;
    const supplier = await db.createSupplier(ownerId, { name: 'Fornecedor teste' });
    const api = new ApiService({} as any, { user: { id: ownerId } } as any, db);
    const vm = new AppComponent(api, {} as any, { markForCheck: () => undefined } as any);
    vm.suppliers = [supplier];
    vm.cutForm = {
      supplierId: supplier.id, cutNumber: 'COR-007', description: 'Calça jeans',
      packages: 2, piecesPerPackage: 10, unitPricePerPiece: 1.5,
      productionDate: '2026-10-27'
    };

    await TestBed.configureTestingModule({ imports: [CutsPageComponent] }).compileComponents();
    const fixture = TestBed.createComponent(CutsPageComponent);
    fixture.componentInstance.vm = vm;
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.row-actions .primary');
    expect(button.textContent).toContain('Salvar corte');
    button.click();
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve, 25));
    fixture.detectChanges();

    expect(vm.message).toBe('Corte cadastrado com sucesso.');
    expect(vm.cuts[0].cutNumber).toBe('COR-007');
    expect(fixture.nativeElement.textContent).toContain('COR-007');
    const stored = await db.cuts(ownerId);
    expect(stored).toHaveLength(1);
    expect(stored[0].totalPieces).toBe(20);

    vm.cutForm = {
      supplierId: supplier.id, cutNumber: 'COR-007', description: 'Calça social',
      packages: 3, piecesPerPackage: 8, unitPricePerPiece: 2,
      productionDate: '2026-10-28'
    };
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.row-actions .primary').click();
    await new Promise(resolve => setTimeout(resolve, 25));
    fixture.detectChanges();

    const bothCuts = await db.cuts(ownerId);
    expect(bothCuts).toHaveLength(2);
    expect(bothCuts.filter(cut => cut.cutNumber === 'COR-007')).toHaveLength(2);
    expect(vm.recentCutPresetsForSupplier()).toHaveLength(2);
    expect(vm.rememberedCutTypes()).toContain('Calça social');

    const repeatedPreset = vm.recentCutPresetsForSupplier()[0];
    vm.applyCutPreset(repeatedPreset);
    expect(vm.cutForm).toMatchObject({ description: 'Calça social', packages: 3, piecesPerPackage: 8, unitPricePerPiece: 2 });

    const restoredVm = new AppComponent(api, {} as any, { markForCheck: () => undefined } as any);
    expect(restoredVm.recentCutPresetsForSupplier()).toHaveLength(0);
    restoredVm.cutForm.supplierId = supplier.id;
    expect(restoredVm.recentCutPresetsForSupplier()).toHaveLength(2);
  });
});
