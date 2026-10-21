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

# Ikon web: favicon pakai ?v=<versi app> (browser menyimpan favicon sangat lama),
# + apple-touch-icon & manifest (ikon saat "Add to Home Screen").
# File ikonnya dari folder public/ (ikut tersalin ke dist/ saat export).
APP_VER=$(node -p "require('./app.json').expo.version")
sed -i.bak \
  -e "s#<link rel=\"icon\" href=\"/favicon.ico\" />#<link rel=\"icon\" href=\"/favicon.ico?v=$APP_VER\" /><link rel=\"apple-touch-icon\" href=\"/apple-touch-icon.png?v=$APP_VER\" /><link rel=\"manifest\" href=\"/manifest.webmanifest?v=$APP_VER\" /><meta name=\"theme-color\" content=\"\#F97316\" />#" \
  dist/index.html && rm -f dist/index.html.bak
grep -q "apple-touch-icon" dist/index.html || echo "⚠ link ikon tidak tersisip ke index.html (cek format <link rel=icon>)"

# Satu koneksi SSH dipakai bersama (ControlMaster) → password / passphrase
# cukup diminta SEKALI untuk semua perintah ssh & rsync di bawah.
# (Lebih baik lagi: pasang SSH key — lihat docs, maka tidak ditanya sama sekali.)
CTRL="/tmp/elsapp-deploy-%r@%h:%p"
SSH_OPTS=(-o ControlMaster=auto -o ControlPath="$CTRL" -o ControlPersist=120)
export RSYNC_RSH="ssh ${SSH_OPTS[*]}"
cleanup() { ssh "${SSH_OPTS[@]}" -O exit "$SERVER" 2>/dev/null || true; }
trap cleanup EXIT

echo "▶ Upload ke $SERVER:$REMOTE_DIR"
ssh "${SSH_OPTS[@]}" "$SERVER" "mkdir -p $REMOTE_DIR"
# Bundle ber-hash (_expo/static) dari deploy SEBELUMNYA tidak dihapus dulu:
# tab browser yang masih memakai versi lama tetap bisa memuat chunk-nya
# (mis. bimk-<hash>.js untuk Alkitab) — tanpa ini muncul 404 / AsyncRequireError.
# 1) chunk baru ditambahkan tanpa --delete
rsync -az dist/_expo/ "$SERVER:$REMOTE_DIR/_expo/"
# 2) file lain (index.html, assets, dll.) disinkronkan penuh, kecuali _expo
rsync -az --delete --exclude '/_expo/' dist/ "$SERVER:$REMOTE_DIR/"
# 3) chunk lama yang tidak dipakai > 14 hari dibersihkan
ssh "${SSH_OPTS[@]}" "$SERVER" "find $REMOTE_DIR/_expo/static -type f -mtime +14 -delete; chown -R www-data:www-data $REMOTE_DIR"

echo "✓ Selesai — buka https://elsapp.eccchurch.global (hard reload)"
