#!/usr/bin/env bash
# Build Els App versi web lalu upload ke VPS (https://elsapp.eccchurch.global).
# Jalankan dari Mac: cd ~/Projects/ecc-mobile-app/app && ./scripts/deploy-web.sh
#
# Tidak menyentuh build Android/iOS maupun OTA (eas update).
set -euo pipefail

cd "$(dirname "$0")/.."

SERVER="root@187.77.118.85"
REMOTE_DIR="/var/www/elsapp"
export EXPO_PUBLIC_API_BASE_URL="https://api.eccchurch.global"

echo "▶ Export web (API: $EXPO_PUBLIC_API_BASE_URL)"
rm -rf dist
npx expo export -p web --clear

test -f dist/index.html || { echo "✗ dist/index.html tidak ada — export gagal"; exit 1; }

echo "▶ Upload ke $SERVER:$REMOTE_DIR"
ssh "$SERVER" "mkdir -p $REMOTE_DIR"
rsync -az --delete dist/ "$SERVER:$REMOTE_DIR/"
ssh "$SERVER" "chown -R www-data:www-data $REMOTE_DIR"

echo "✓ Selesai — buka https://elsapp.eccchurch.global (hard reload)"
