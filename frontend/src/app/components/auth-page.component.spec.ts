import { TestBed } from '@angular/core/testing';
import { AuthPageComponent } from './auth-page.component';
import 'fake-indexeddb/auto';
import { OfflineDatabaseService } from '../offline-database.service';

describe('AuthPageComponent', () => {
  async function render(options: { offlineMode?: boolean; publicRegistration?: boolean } = {}) {
    await TestBed.configureTestingModule({ imports: [AuthPageComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AuthPageComponent);
    fixture.componentInstance.offlineMode = options.offlineMode ?? false;
    fixture.componentInstance.publicRegistration = options.publicRegistration ?? false;
    fixture.detectChanges();
    return fixture;
  }

  it('hides account creation when public registration is disabled', async () => {
    const fixture = await render();
    expect(fixture.nativeElement.textContent).toContain('As contas são criadas pelo administrador');
    expect(fixture.nativeElement.querySelector('.auth-switch')).toBeNull();
  });

  it('shows registration when explicitly enabled', async () => {
    const fixture = await render({ publicRegistration: true });
    expect(fixture.nativeElement.querySelector('.auth-switch')?.textContent).toContain('Criar conta');
  });

  it('allows local account creation in offline mode', async () => {
    const fixture = await render({ offlineMode: true });
    expect(fixture.nativeElement.querySelector('.auth-switch')?.textContent).toContain('Criar conta neste aparelho');
  });

  it('emits login credentials from the form', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;
    let submitted: { email: string; password: string } | undefined;
    component.login.subscribe(value => submitted = value);
    component.email = 'user@example.com';
    component.password = 'test-password';
    component.submit();
    expect(submitted).toEqual({ email: 'user@example.com', password: 'test-password' });
  });
});

describe('OfflineDatabaseService backup restoration', () => {
  it('restores records to an empty account and refuses to overwrite existing data', async () => {
    const db = new OfflineDatabaseService();
    const sourceOwner = `source-${crypto.randomUUID()}`;
    const targetOwner = `target-${crypto.randomUUID()}`;
    const supplier = await db.createSupplier(sourceOwner, { name: 'Backup supplier' });
    await db.createCut(sourceOwner, {
      supplierId: supplier.id, cutNumber: 'CUT-1', description: 'Jeans', packages: 2,
      piecesPerPackage: 10, unitPricePerPiece: 1.5, productionDate: '2026-01-01'
    });
    const backup = await db.backup(sourceOwner);

    await expect(db.importBackup(targetOwner, backup)).resolves.toEqual({ suppliers: 1, cuts: 1, settlements: 0 });
    const restored = await db.suppliers(targetOwner);
    expect(restored).toHaveLength(1);
    expect(restored[0].name).toBe('Backup supplier');
    const restoredCuts = await db.cuts(targetOwner);
    expect(restoredCuts).toHaveLength(1);
    expect(restoredCuts[0].supplierId).toBe(restored[0].id);
    await expect(db.importBackup(targetOwner, backup)).rejects.toThrow('restauração só é permitida');
  });
});
