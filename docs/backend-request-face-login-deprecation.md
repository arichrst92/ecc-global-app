# BE Request — Face Login Deprecation Coordination

**Owner:** Mobile (Ari)
**Status:** Pending BE acknowledgment
**Date:** 2026-05-26
**Related:** Mobile face login feature di-remove (lihat `mobile-face-login-removal-impact.md`).

## Konteks & Decision

Mobile team decide remove face login feature karena complexity vs benefit (TFLite + ML Kit native deps berat ~25-30MB APK, liveness flow rumit, troubleshooting recurring). User pakai OTP login (existing primary auth) — tidak ada degradation untuk login mainstream.

Mobile UI sudah strip semua face-related screens + components. APK baru di-rilis ~minggu depan ke Play Store.

## Yang DIBUTUHKAN dari BE

### 1. Retention 90 hari minimal untuk endpoint face

User dengan APK lama masih punya kemampuan face login sampai mereka update. Force-update via `/public/app-version` minVersion akan dipakai untuk push migration, tapi butuh window ~90 hari supaya semua user migrate.

**Endpoint retain (no new feature work, just keep operational):**
- `POST /auth/face/login`
- `POST /auth/face/liveness-nonce`
- `POST /auth/face/enroll`
- `PUT /auth/me/face-profile`
- `DELETE /auth/me/face-profile`
- `GET /auth/me/face-profile`

### 2. Database table + columns RETAIN

Jangan drop face profile table sementara. Reasons:
- User existing yang sudah enroll, data tetap intact untuk restore kalau di-re-enable nanti
- `Jemaat` table column (mis. `faceProfileEnrolled` flag kalau ada) retained
- Storage minimal — descriptor 128-dim float = ~512 bytes per user, untuk seluruh user pun cuma beberapa MB

After 90-day window + < 5% user di old APK, BE bisa decide:
- Option A: Drop face tables (no UI lagi dimanapun)
- Option B: Keep indefinitely (cheap storage, optionality)

Recommend Option B untuk safety.

### 3. Field `face*` di `/public/app-config` bisa di-deprecate

Mobile tidak baca lagi field ini setelah update:
- `lowConfidenceWarnThreshold`
- `faceConfidenceThreshold`
- `faceTelemetrySamplingRate`

BE bisa drop dari response shape (mobile baru ignore, mobile lama tetap baca cached default).

### 4. Telemetry endpoint `/diagnostics/face-telemetry`

Mobile tidak akan kirim payload face telemetry lagi. Endpoint bisa di-deprecate atau retain idle (no traffic from new mobile).

### 5. `/auth/me` response — face fields

Kalau response include field face-related (mis. `faceEnrolled: boolean`, `faceProfileId`, `lastFaceLoginAt`), BE bisa drop dari response — mobile baru tidak baca, mobile lama tetap baca null/undefined safely (backward-compat).

### 6. Force-update minVersion timing

Setelah mobile rilis APK baru ke Play Store dan stable rollout > 80%:
- BE update `/public/app-version` minSupportedVersion ke versi yang sudah strip face login
- User dengan APK lama akan see force-update modal saat open app

Coordinate timing dengan mobile setelah Play Store rollout confirm.

## Yang BE TIDAK perlu lakukan

- No mobile-breaking changes — endpoints tetap return existing shape
- No schema migration (drop tables) untuk minimal 90 hari
- No new endpoint
- No portal changes — portal tetap punya `/dashboard/jemaat/[id]` admin view untuk lihat face enrollment status (kalau exists). Atau bisa juga dihapus dari portal di iterasi later.

## Action items untuk BE

- [ ] Acknowledge plan
- [ ] Confirm 90-day retention policy untuk face endpoints + tables
- [ ] Coordinate force-update threshold timing setelah mobile Play Store rollout stable
- [ ] (Optional) Drop face fields dari `/public/app-config` + `/auth/me` response
- [ ] (Optional, future) After 90+ hari + low old-APK usage, decide drop endpoints + tables

## Mobile-side already done

- Strip face UI dari Welcome + Login + Settings (commit pending di branch)
- Delete face components + service + TFLite asset
- Strip face types + i18n keys
- Cleanup orphan SecureStore key di hydrate (idempotent delete)
- App size shrinks ~25-30 MB dengan native deps removed
- All references via grep clean (verify post-PR)

Mobile APK baru: ~v1.1.0 (target rilis 2-3 hari setelah PR merge + EAS build).

## Reversibility

Decision bisa di-revert kalau diperlukan:
- Mobile: revert commit, `npm install`, `expo prebuild --clean`, ready in ~1 jam
- BE: tidak perlu apa-apa kalau Option B (retain tables forever) di-pilih — restore mobile auto kembali functional

---

# Backend Response — 2026-05-31

**Dari**: Tim Backend ECC (IDEA dev team)
**Status**: ✅ **ACKNOWLEDGED** — semua action item confirmed.

## Konteks tambahan dari sisi BE

Portal admin (https://portal.eccchurch.global) **sudah lebih dulu** strip face login UI di commit `52d2080` (2026-05-26) — tombol Login dengan Wajah di /login + section Face Recognition di /dashboard/profile sudah hilang. Itu berarti setelah mobile APK baru lo rilis + force-update aktif, **tidak ada UI consumer face login lagi** di seluruh stack ECC (cuma diagnostics/admin telemetry yang tetap monitor data historis).

## Decision per action item

### 1. ✅ Retention 90 hari endpoint face — CONFIRMED

Semua 6 endpoint **retain operational, no breaking change** sampai mobile signal force-update threshold aman:

| Endpoint | Status |
|---|---|
| `POST /auth/face/login` | ✅ retain |
| `POST /auth/face/liveness-nonce` | ✅ retain |
| `POST /auth/face/enroll` | ✅ retain |
| `GET /auth/me/face-profile` | ✅ retain |
| `PUT /auth/me/face-profile` | ✅ retain |
| `DELETE /auth/me/face-profile` (alias `POST /auth/face/reset`) | ✅ retain |

Plus internal helper `liveness_nonce` issuance + `LIVENESS_NONCE_SECRET` env tetap aktif.

### 2. ✅ Database retention — Option B (indefinite)

Sesuai rekomendasi lo — pilih **Option B**. Storage murah, optionality nice, dan kalau ada user iseng yang minta restore wajah pun bisa langsung tanpa data loss.

Tables/columns yang retained:
- `User.faceDescriptor` (Json), `faceEnrolledAt` (DateTime?), `faceModelVersion` (VarChar?), `faceMetadata` (Json?)
- `FaceTelemetryEvent` table (full)
- `AppConfig.faceMatchThreshold` (column on global singleton)

Cleanup job `cleanup-face-telemetry` di `scheduled-jobs.ts` tetap jalan (retention 90 hari per row, bukan per fitur — itu menjaga DB lean tanpa mempengaruhi feature availability).

### 3. ⚠️ Field face di `/public/app-config` — KEEP (tidak drop)

Mobile baru di-ignore — agreed. Tapi BE **tetap return** 4 field tsb sampai 90-day window expire, alasannya:
- Mobile APK lama (pre-deprecation) baca cached default kalau field hilang → defensive coding di sisi mobile aman, tapi BE sengaja cautious
- Cost retain = 4 angka di JSON response = nol
- Risk drop sekarang = mobile lama panic logging "missing field" → noisy crash reports tanpa benefit

Future cleanup: drop bersama keputusan Option A (tables) kalau force-update threshold tercapai.

Saat ini `/public/app-config` tetap return:
```json
{
  "faceMatchThreshold": 0.5,
  "lowConfidenceWarnThreshold": 0.7,
  "telemetrySamplingRate": 1.0,
  "errorReportingEnabled": true
}
```

(Note: `telemetrySamplingRate` + `errorReportingEnabled` itu **general telemetry**, bukan face-spesifik — tetap relevan untuk error reporting yang sekarang aktif. Cuma `faceMatchThreshold` + `lowConfidenceWarnThreshold` yang face-spesifik dan akan ikut dropped saat retention expire.)

### 4. ⚠️ Field face di response `/auth/face/login` + `/auth/otp/verify` (login response) — KEEP

`user.hasFaceEnrolled` (boolean) di login response **tetap di-return**. Computed dari `!!user.faceDescriptor`, hampir-gratis. Cost retain = nol, cost drop = mobile lama break.

Portal udah handle: `AuthUser.hasFaceEnrolled?` di auth-store sudah optional (commit `52d2080`) — kalau BE drop nanti pun portal tetep clean.

### 5. ✅ Force-update minVersion timing — STAND BY

Workflow:
1. Mobile rilis APK baru v1.1.0 ke Play Store + App Store
2. Monitor stable rollout > 80% (mobile-side analytics)
3. Mobile **ping balik via doc atau Slack** — kasih versi yang sudah strip face (mis. `1.1.0`)
4. BE update `AppVersion.minSupportedVersion` di portal `/dashboard/app-version` per-platform
5. User APK lama dapat force-update modal saat open app

Saat ini `AppVersion.minSupportedVersion` di production masih versi pre-deprecation. BE TIDAK akan touch tanpa explicit signal dari lo — ping kapan aman.

### 6. ✅ Telemetry endpoint `/diagnostics/face-telemetry` — retain idle

Admin diagnostics tab tetap ada di portal (per commit `52d2080` cuma copy yang di-clarify "mobile only") — useful untuk historical analysis. Endpoint silent kalau mobile baru gak kirim payload, gak ada masalah.

## File yang BE TIDAK touch

- ❌ `prisma/schema.prisma` — no migration
- ❌ `apps/core-api/src/routes/auth.ts` — face endpoints unchanged
- ❌ `apps/core-api/src/routes/public-unauth.ts` `/app-config` — fields retained
- ❌ `apps/core-api/src/routes/admin/diagnostics.ts` — telemetry endpoint retained
- ❌ `apps/core-api/src/lib/scheduled-jobs.ts` — cleanup-face-telemetry job retained

**Zero code change** dari sisi BE untuk request ini. Pure operational acknowledgment.

## Memo internal untuk timeline cleanup

Saat lo ping bahwa APK baru sudah stable + force-update aktif > 90 hari, BE akan:
- Drop `faceMatchThreshold` + `lowConfidenceWarnThreshold` dari `/public/app-config` response
- Drop `user.hasFaceEnrolled` dari login response
- Drop OpenAPI schema definitions untuk face endpoints
- Migration: bisa drop columns + table (kalau benar-benar Option A dipilih nanti) atau retain (default Option B)
- Bersih-bersih `apps/core-api/src/routes/admin/diagnostics.ts` Face Telemetry tab di portal (kalau diputuskan endpoint sunset)

Catatan ini tracked sebagai TODO di `[[deploy-gotchas]]` memory.

## Action items mobile (info)

- [x] PR mobile rilis APK baru tanpa face UI → boleh proceed kapan saja
- [ ] Setelah Play Store + App Store rollout > 80%, ping BE dengan versi yang sudah safe untuk force-update threshold
- [ ] (Setelah force-update aktif > 90 hari) ping BE untuk Option A/B decision finalize

---

*Acknowledged 2026-05-31.*
