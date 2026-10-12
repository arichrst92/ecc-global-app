# BE Update — Els App Versi Web (elsapp.eccchurch.global)

**Date**: 2026-10-13
**From**: BE
**Untuk**: Tim Mobile

## Ringkasan

Codebase Els App (Expo/React Native) sekarang juga di-build sebagai **web app** dan di-host di **https://elsapp.eccchurch.global** (SPA statis, Nginx di VPS). Codebase-nya tetap satu dengan Android/iOS. Semua penyesuaian khusus web dibatasi `Platform.OS === 'web'`, jadi **perilaku native tidak berubah**.

Perubahan sudah di-commit di repo mobile (`app/`). Tolong pull, review, dan perhatikan aturan di bagian "Aturan ke depan".

## Perubahan di repo mobile

| File | Perubahan | Dampak native |
|---|---|---|
| `src/utils/webAlertPolyfill.ts` (baru), di-import di `app/_layout.tsx` | `Alert.alert` di react-native-web tidak melakukan apa-apa, jadi di web dipetakan ke `window.alert` / `confirm` / `prompt`. Aturannya: 1 aksi + cancel → `confirm`; ≥2 aksi → `prompt` dengan pilihan bernomor. | Tidak ada (no-op di native) |
| `app/(auth)/welcome.tsx`, `app/(auth)/login/email.tsx`, `src/i18n/locales/*.json` | Web **hanya login OTP**. Tombol magic link email dinonaktifkan dengan info "Hanya tersedia di aplikasi mobile Els App" (key i18n `auth.signin_email_mobile_only`). Kalau `/login/email` dibuka langsung di web, diarahkan ke welcome. | Tidak ada |
| `src/hooks/useAppVersion.ts`, `app/(tabs)/profile.tsx` | Pengecekan versi (ForceUpdateGate) dimatikan di web, dan menu "Cek Update" disembunyikan di web. Versi web selalu build terbaru. | Tidak ada |
| `src/utils/eventPaymentWeb.ts` | Di web, halaman pembayaran event dibuka di **tab yang sama** dengan `?return=<URL halaman app>` (bukan `openAuthSessionAsync` + `ecc://payment-done`). Builder URL tetap string (bukan `URL.searchParams`, yang belum lengkap di Hermes), jadi URL native identik dengan sebelumnya. | Tidak ada |
| `app/homecell/[id]/schedule/new.tsx` | `DateTimePicker` tidak didukung di web, jadi diganti `<input type="date">` di web. | Tidak ada |
| `app.json` | `web.output`: `"static"` → `"single"` (SPA). Hanya dipakai build web. | Tidak ada |
| `deploy/nginx-elsapp.conf` (baru) | Config Nginx: SSL, SPA fallback ke `index.html`, cache `/_expo/static/` 1 tahun, CSP. | — |
| `scripts/deploy-web.sh` (baru) | `expo export -p web` + rsync ke `/var/www/elsapp`. | — |

## Perubahan di BE / landing / portal

- **Diagnostics**: `POST /diagnostics/error` sekarang menerima `device.platform = "web"` (sebelumnya hanya `ios`/`android`, sehingga error dari web ditolak 400). `errorReporting.ts` tidak perlu diubah karena sudah mengirim `Platform.OS`. Portal Diagnostics punya filter "Web".
- **CORS**: `https://elsapp.eccchurch.global` ditambahkan ke `CORS_ALLOWED_ORIGINS`. `http://localhost:8081` juga diizinkan sementara untuk testing `expo start --web` terhadap API production.
- **Landing** `/event/[slug]/pembayaran`: kalau ada `?return=`, tombol "Kembali ke Els App" mengarah ke URL itu. Origin yang diterima hanya `https://elsapp.eccchurch.global` dan `http://localhost:8081` (cegah open redirect). Tanpa `return`, perilaku lama tetap: `ecc://payment-done` untuk app native.
- **Magic link email**: `EMAIL_MAGIC_LINK_*` **tidak diubah**. Link tetap untuk app native.

## Aturan ke depan (penting)

1. **Jangan kirim perubahan web lewat `eas update` ke channel production** sampai build store berikutnya. Perilaku native memang tidak berubah, tapi kita ingin nol risiko untuk pengguna 2.2.8. Deploy web cukup lewat `./scripts/deploy-web.sh`.
2. **Fitur baru harus dicek di web** (`npx expo start --web`). Hal yang perlu diperhatikan:
   - Modul native-only (`expo-secure-store`, `@react-native-community/datetimepicker`, `expo-camera`, dll.) wajib punya cabang `Platform.OS === 'web'` atau fallback.
   - Deeplink `ecc://` tidak bisa dipakai di browser, jadi gunakan URL `https://`.
   - `Alert.alert` aman (sudah di-polyfill), tapi untuk UX penting lebih baik pakai komponen modal sendiri.
   - Jangan pakai `URL.searchParams` / `URLSearchParams.set` di kode yang juga jalan di native (Hermes).
3. **Penyimpanan token** di web memakai `localStorage` (lihat `src/utils/storage.ts`). Mitigasinya CSP di Nginx. Jangan menambah script pihak ketiga tanpa koordinasi BE, karena CSP harus diupdate.

## Mohon dites di web (belum diverifikasi end-to-end)

- [ ] Login OTP → home → logout
- [ ] Scan QR (`expo-camera`) di Chrome Android & Safari iOS. Kalau tidak jalan, perlu fallback input kode manual.
- [ ] Upload foto profil / bukti (image picker + manipulator)
- [ ] Pembayaran event NOMINAL_BEBAS: buka web pembayaran → "Kembali ke Els App" → kembali ke halaman event, masih login
- [ ] Dialog konfirmasi (hapus anggota keluarga, keluar group, hapus akun)
- [ ] Buat jadwal homecell (input tanggal)
- [ ] Refresh browser di route dinamis (mis. `/event/<id>`), tidak boleh 404

Laporkan temuan ke BE dengan format seperti biasa (`backend-request-*.md` / `mobile-update-*.md`).

## Deploy

```bash
cd ~/Projects/ecc-mobile-app/app
./scripts/deploy-web.sh
```

Setup DNS, SSL, dan Nginx dikerjakan BE sekali. Update berikutnya cukup jalankan script di atas.
