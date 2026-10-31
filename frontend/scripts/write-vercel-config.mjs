import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const apiUrl = process.env.API_URL?.trim();
if (!apiUrl || !/^https:\/\//i.test(apiUrl)) {
  throw new Error('Defina API_URL como a URL HTTPS pública da API, incluindo /api.');
}

const config = {
  API_URL: apiUrl.replace(/\/+$/, ''),
  OFFLINE_MODE: false,
  PUBLIC_REGISTRATION: process.env.PUBLIC_REGISTRATION !== 'false'
};
const output = `globalThis.__APP_CONFIG__ = ${JSON.stringify(config)};\nglobalThis.__API_URL__ = globalThis.__APP_CONFIG__.API_URL;\n`;
const destination = resolve('dist/controle-de-cortes/browser/assets/config.js');

await writeFile(destination, output, 'utf8');
console.log(`Configuração web gerada para ${new URL(config.API_URL).origin}`);
