#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
config_file="src/assets/config.js"
backup_file="$(mktemp)"
cp "$config_file" "$backup_file"
restore_config() {
  cp "$backup_file" "$config_file"
  rm -f "$backup_file"
}
trap restore_config EXIT

cat > "$config_file" <<'EOF'
// Standalone Android build: all business data is stored in on-device IndexedDB.
globalThis.__APP_CONFIG__ = { API_URL: '', OFFLINE_MODE: true, AUTO_LOCAL_ACCESS: true };
globalThis.__API_URL__ = '';
EOF

npm run build -- --configuration production,androidOffline
npx cap sync android
./android/gradlew -p android assembleDebug

mkdir -p release
cp android/app/build/outputs/apk/debug/app-debug.apk release/controle-de-cortes-offline.apk
echo "APK offline gerado em release/controle-de-cortes-offline.apk"
