import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { authInterceptor } from './app/auth.interceptor';
import { isDevMode } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';

const offlineApk = (globalThis as any).__APP_CONFIG__?.OFFLINE_MODE === true;

if (offlineApk && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations()
    .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
    .catch(() => undefined);
  if ('caches' in globalThis) {
    void caches.keys().then(names => Promise.all(names.map(name => caches.delete(name)))).catch(() => undefined);
  }
}

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode() && !offlineApk,
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
}).catch(console.error);
