#!/bin/sh
set -eu

cat > /usr/share/nginx/html/assets/config.js <<EOF
globalThis.__APP_CONFIG__ = {
  API_URL: '${API_URL:-http://localhost:8080/api}',
  PUBLIC_REGISTRATION: ${PUBLIC_REGISTRATION:-true}
};
globalThis.__API_URL__ = globalThis.__APP_CONFIG__.API_URL;
EOF
