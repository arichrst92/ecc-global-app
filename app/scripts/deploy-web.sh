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
# Bundle ber-hash (_expo/static) dari deploy SEBELUMNYA tidak dihapus dulu:
# tab browser yang masih memakai versi lama tetap bisa memuat chunk-nya
# (mis. bimk-<hash>.js untuk Alkitab) — tanpa ini muncul 404 / AsyncRequireError.
# 1) chunk baru ditambahkan tanpa --delete
rsync -az dist/_expo/ "$SERVER:$REMOTE_DIR/_expo/"
# 2) file lain (index.html, assets, dll.) disinkronkan penuh, kecuali _expo
rsync -az --delete --exclude '/_expo/' dist/ "$SERVER:$REMOTE_DIR/"
# 3) chunk lama yang tidak dipakai > 14 hari dibersihkan
ssh "$SERVER" "find $REMOTE_DIR/_expo/static -type f -mtime +14 -delete; chown -R www-data:www-data $REMOTE_DIR"

echo "✓ Selesai — buka https://elsapp.eccchurch.global (hard reload)"
