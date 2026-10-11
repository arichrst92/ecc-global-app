# Mobile Update — Signal untuk Bump minSupportedVersion (Face Login Sunset)

**Date**: 2026-10-11
**From**: Mobile team (Ari)
**To**: BE (IDEA dev)
**Reply ke**: `backend-request-face-login-deprecation.md` — section "5. Force-update minVersion timing — STAND BY"

---

## TL;DR

Mobile kasih **signal** yang ditunggu BE: face login sudah lama hilang dari semua build production. BE silakan bump `AppVersion.minSupportedVersion` di portal `/dashboard/app-version`.

## Fakta Versi

| Versi | Face login? | Keterangan |
|---|---|---|
| 1.0.0 | ⚠️ Mungkin ada | Face UI dihapus di tengah siklus 1.0.0 (commit `2c14218` + `4aea8a0`, 2026-05-31). Build 1.0.0 lama masih bisa punya face login. |
| **1.5.0** | ❌ Tidak ada | Versi pertama yang dijamin tanpa face login (2026-08-23) |
| 2.2.x | ❌ Tidak ada | Versi production sekarang (iOS App Store + Google Play) |

## Rekomendasi minSupportedVersion

Dua opsi, pilih salah satu (keputusan Ari):

**Opsi A — minimum untuk sunset face login: `1.5.0`**
Cukup untuk memaksa semua user APK 1.0.0 (yang mungkin masih pakai face login) update. Paling aman, user versi 1.5.0+ tidak terganggu.

**Opsi B — sekalian tarik ke versi stabil terbaru: `2.2.6`**
Selain sunset face login, juga memaksa user dapat fix penting:
- Hapus anggota keluarga (bug 204 No Content)
- Pembayaran event sukarela (Unmatched Route)
- Tombol "Kembali ke Login" di onboarding
- Ikon bersih (no black corners)

Kekurangan Opsi B: semua user di bawah 2.2.6 kena force-update modal sekaligus.

**Rollout Play Store saat ini:** _(Ari isi dari Play Console → Statistics → App versions)_ — mis. "2.2.x = __% install aktif".

## Yang Diminta dari BE

1. Set `minSupportedVersion` per platform (iOS + Android) sesuai opsi yang dipilih
2. Lanjut timeline di doc deprecation:
   - Tunggu force-update settle 5–7 hari
   - Drop face fields `/app-config` + OpenAPI cleanup (~2 minggu post-bump)
   - Keputusan sunset endpoint `/auth/face/*` (3–6 bulan post-bump)

## Verifikasi Setelah Bump

```bash
curl "https://api.eccchurch.global/public/app-version?platform=android&currentVersion=1.0.0"
# Expected: forceUpdate: true

curl "https://api.eccchurch.global/public/app-version?platform=android&currentVersion=2.2.8"
# Expected: forceUpdate: false
```

Mobile sudah punya `ForceUpdateGate` di `app/_layout.tsx` (blocking modal saat `forceUpdate: true`) — tidak perlu perubahan mobile.

---

Reply via `docs/be-update-*.md` atau chat.
