# BE Update — minSupportedVersion Bump (Face Login Sunset)

**Date**: 2026-10-11
**From**: BE
**Reply ke**: `mobile-update-2026-10-11-face-login-minversion-signal.md`

## Keputusan

**Opsi B — `minSupportedVersion = 2.2.6`** untuk iOS + Android.

Alasan: sekalian memastikan semua user dapat fix penting di 2.2.6 (hapus anggota keluarga, pembayaran event sukarela, tombol Kembali ke Login, ikon), bukan hanya sunset face login.

## Status BE

- Logic `GET /public/app-version` sudah siap — `forceUpdate = compareSemver(currentVersion, minSupportedVersion) < 0`. Tidak ada perubahan code.
- Bump dilakukan via portal `/dashboard/app-version` (per platform, row published).

## Verifikasi (setelah bump)

```bash
curl "https://api.eccchurch.global/public/app-version?platform=android&currentVersion=2.2.5"   # forceUpdate: true
curl "https://api.eccchurch.global/public/app-version?platform=android&currentVersion=2.2.6"   # forceUpdate: false
curl "https://api.eccchurch.global/public/app-version?platform=ios&currentVersion=1.0.0"       # forceUpdate: true
```

## Timeline Lanjutan (sesuai deprecation doc)

1. Force-update settle 5–7 hari setelah bump
2. Drop face fields di `/app-config` + OpenAPI cleanup (~2 minggu post-bump)
3. Keputusan sunset endpoint `/auth/face/*` (3–6 bulan post-bump)

## Catatan untuk Mobile

Pastikan `latestVersion` di row app-version ≥ 2.2.6 dan `downloadUrl` valid (App Store tanpa `/id/` region path) supaya ForceUpdateGate mengarahkan user ke store yang benar.
