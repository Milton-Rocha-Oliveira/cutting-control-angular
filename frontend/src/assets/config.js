// API address is injected at container startup; local development uses the Angular default.
globalThis.__APP_CONFIG__ = globalThis.__APP_CONFIG__ || { API_URL: 'http://localhost:8080/api', OFFLINE_MODE: false, PUBLIC_REGISTRATION: true };
globalThis.__API_URL__ = globalThis.__APP_CONFIG__.API_URL;
