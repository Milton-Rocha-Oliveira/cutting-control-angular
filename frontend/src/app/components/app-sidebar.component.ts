import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {CommonModule} from '@angular/common';

export type AppSection = 'dashboard' | 'suppliers' | 'cuts' | 'billing' | 'reports' | 'users';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [CommonModule],
    styleUrl: './app-sidebar.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <aside class="sidebar">
            <div class="brand"><img class="brand-mark" src="assets/logo-controle-de-cortes.png" alt="Controle de Cortes"></div>
            <nav>
                <button [class.active]="section==='dashboard'" (click)="navigate.emit('dashboard')"><span>Visão geral</span></button>
                <button [class.active]="section==='suppliers'" (click)="navigate.emit('suppliers')"><span>Fornecedores</span></button>
                <button [class.active]="section==='cuts'" (click)="navigate.emit('cuts')"><span>Novo corte</span></button>
                <button [class.active]="section==='billing'" (click)="navigate.emit('billing')"><span>Novo faturamento</span></button>
                <button [class.active]="section==='reports'" (click)="navigate.emit('reports')"><span>Relatórios</span></button>
                <button *ngIf="rootUser" [class.active]="section==='users'" (click)="navigate.emit('users')"><span>Gerenciar usuários</span></button>
            </nav>
            <button class="theme-toggle" type="button" [attr.aria-label]="darkMode ? 'Ativar tema claro' : 'Ativar tema escuro'" (click)="themeToggle.emit()">{{ darkMode ? '☀' : '☾' }}</button>
        </aside>`
})
export class AppSidebarComponent {
    @Input({required: true}) section!: AppSection;
    @Input() rootUser = false;
    @Input() darkMode = false;
    @Output() navigate = new EventEmitter<AppSection>();
    @Output() themeToggle = new EventEmitter<void>();
}
