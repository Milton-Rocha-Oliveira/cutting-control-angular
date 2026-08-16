import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { SuppliersComponent } from './components/suppliers/suppliers.component';
import { CutsComponent } from './components/cuts/cuts.component';
import { InvoicingComponent } from './components/invoicing/invoicing.component';
import { LoginComponent } from './components/auth/login.component';
import { MonthlyReportComponent } from './components/reports/monthly.component';
import { AnnualReportComponent } from './components/reports/annual.component';
import { NgModel } from '@angular/forms';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './services/auth.interceptor';

@NgModule({
  declarations: [AppComponent, SuppliersComponent, CutsComponent, InvoicingComponent],
  declarations: [AppComponent, SuppliersComponent, CutsComponent, InvoicingComponent, LoginComponent, MonthlyReportComponent, AnnualReportComponent],
  imports: [BrowserModule, HttpClientModule, FormsModule, ReactiveFormsModule],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
