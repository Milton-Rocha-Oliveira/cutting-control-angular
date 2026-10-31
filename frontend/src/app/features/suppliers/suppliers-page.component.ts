import { ChangeDetectionStrategy, Component, Input } from '@angular/core'; import { CommonModule } from '@angular/common'; import { FormsModule } from '@angular/forms'; import type { AppComponent } from '../../app.component';
@Component({selector:'app-suppliers-page',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./suppliers-page.component.html',styleUrl:'./suppliers-page.component.css',changeDetection:ChangeDetectionStrategy.Default})
export class SuppliersPageComponent {@Input({required:true}) vm!:AppComponent;}
