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
