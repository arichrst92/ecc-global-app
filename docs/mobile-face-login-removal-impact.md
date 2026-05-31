# Face Login Removal — Impact Analysis & Plan

**Owner:** Mobile (Ari)
**Status:** Plan + Phase 1 execution
**Date:** 2026-05-26
**Decision:** Remove face login feature dari mobile app. Reason: complexity vs benefit (TFLite + ML Kit native deps berat, liveness flow rumit, troubleshooting recurring). Pakai OTP saja untuk MVP — face login bisa di-revisit Q3 kalau demand jelas.

---

## Scope yang dihapus

**Mobile UI:**
- Welcome screen — auto-launch face capture + tombol "Sign in with Face"
- Login screen — tombol "Sign in with Face"
- Settings — page `app/settings/face.tsx` (enroll/update/delete face profile)
- Components face folder — `FaceCapture`, `LivenessChallenge`, `FaceDescriptorProvider`, `FaceEnrollmentPrompt`, `NonceCountdownBadge`
- Service `faceDescriptor.ts` (TFLite + ML Kit + UPNG)
- TFLite model asset `assets/ml/mobilefacenet.tflite` (~5MB)
- Native deps: `@react-native-ml-kit/face-detection`, `react-native-fast-tflite`
- iOS pod constraint deployment target 16.0 (was bumped khusus untuk ML Kit, bisa direvert ke default Expo)

**Mobile auxiliary (di-prune juga):**
- `useAuthStore.faceEnrolledHint` field + `hasFaceSession()`
- Face telemetry events di `src/services/telemetry.ts` (face_login_attempt, face_descriptor_compute, dll)
- Face-related i18n keys di id.json + en.json
- App config field `lowConfidenceWarnThreshold` + `faceTelemetrySamplingRate` consume

**Mobile NOT dihapus (keep):**
- OTP login flow (primary auth) — fully retained
- Liveness nonce endpoint (sudah di-deprecate karena dependent face login)
- General telemetry infrastructure (face-specific events go away, other events tetap)

---

## Files affected

| Type | Path | Action |
|---|---|---|
| Screen | `app/(auth)/welcome.tsx` | Remove face button + auto-launch effect + state |
| Screen | `app/(auth)/login/index.tsx` | Remove face button + mutation + nonce fetch |
| Screen | `app/settings/face.tsx` | **DELETE** entire file |
| Layout | `app/_layout.tsx` | Remove `FaceDescriptorProvider` wrap |
| Component | `src/components/face/*` (5 files) | **DELETE** entire folder |
| Service | `src/services/faceDescriptor.ts` | **DELETE** |
| Service | `src/services/telemetry.ts` | Remove face-specific event types + helpers |
| API | `src/api/auth.ts` | Remove `faceLogin`, `enrollFace`, `updateFaceProfile`, `deleteFaceProfile`, `getFaceProfile`, `requestLivenessNonce` |
| Store | `src/stores/auth.store.ts` | Remove `faceEnrolledHint`, `setFaceEnrolledHint`, `hasFaceSession` (storage key juga dibersihkan saat hydrate) |
| Types | `src/types/auth.ts` | Remove `FaceLoginPayload`, `FaceEnrollPayload`, `FaceProfileStatus`, `FACE_MODEL_VERSION`, `FACE_DESCRIPTOR_DIM` |
| Types | `src/types/me.ts` | Remove face-related fields |
| Types | `src/types/telemetry.ts` | Remove `FaceTelemetryFlow`, `FaceTelemetryEvent` types |
| Types | `src/types/appConfig.ts` | Remove face threshold fields |
| Types | `src/types/api.ts` | Remove face error codes (FACE_NOT_ENROLLED, FACE_NO_MATCH, etc) |
| Types | `src/types/upng-js.d.ts` | **DELETE** (UPNG dipakai cuma untuk face) |
| Settings | `app/settings/edit-profile.tsx` | Remove face-management link (kalau ada) |
| Profile | `app/(tabs)/profile.tsx` | Remove face status section (kalau ada) |
| Guest | `src/components/GuestProfileView.tsx` | Remove face mention (kalau ada) |
| i18n | `src/i18n/locales/id.json` + `en.json` | Remove all `face.*` keys (~50 keys per file) |
| Asset | `assets/ml/mobilefacenet.tflite` | **DELETE** (~5MB binary) |
| Asset | `assets/ml/` folder | **DELETE** kalau hanya berisi face model |
| Persistence | `src/lib/queryPersistence.ts` | Remove face cache exclusion (kalau ada) |
| Dependencies | `package.json` | Remove `@react-native-ml-kit/face-detection`, `react-native-fast-tflite`, `upng-js` |
| Native config | `app.json` | Revisit `expo-build-properties` iOS deployment target (16.0 bisa direvert kalau tidak ada native dep lain butuh) |

**Estimated LOC removed:** ~3,500 lines (5 component files + 2 services + 1 settings page + types + i18n entries).

---

## Storage key cleanup

`useAuthStore` punya storage key `ecc.faceEnrolledHint`. Setelah feature removal, key ini orphan di SecureStore. Tidak ada masalah functional tapi clutter. Optional cleanup:

**Option A (recommended):** Add one-time migration di `hydrate()` — delete `ecc.faceEnrolledHint` key. Aman idempotent (delete non-existent key = no-op).

**Option B:** Leave orphan, ignore. Pengguna jarang notice. Storage usage minimal.

Plan: Option A — clean one-liner di `hydrate()`.

---

## Backend Coordination

Lihat `docs/backend-request-face-login-deprecation.md`. Summary:

1. BE retain endpoints **at least 90 hari** (`/auth/face/login`, `/auth/me/face-profile`, dll) supaya user dengan APK lama tidak break setelah mobile update di-rollout. Endpoints return existing data, no new feature work.
2. Existing face profile rows di DB **tetap retained** sementara — JANGAN drop tables. Kalau user mau enable face lagi nanti, data tidak hilang.
3. Force-update threshold di `/public/app-version` dipakai untuk push user dari old APK ke new APK selama 90 hari window. Setelah semua user di new APK, BE bisa decide drop endpoints + tables.
4. Telemetry endpoint `/diagnostics/face-telemetry` (kalau ada) bisa stop accept payload — mobile tidak akan kirim lagi.
5. `/public/app-config` field `face*` jadi dead fields — bisa di-drop dari response (mobile yang baru tidak baca).

---

## Migration story untuk user existing

User yang sudah enroll face di mobile lama:
1. Update APK ke versi baru (manual atau force-update)
2. App tidak punya UI face login lagi — login pakai OTP (atau Face Login button hilang dari Welcome)
3. Face profile data di BE tetap ada (untuk safety), tapi tidak bisa di-akses dari mobile
4. Untuk hapus permanently: user bisa pakai "Delete Account" flow (existing) yang cascade hapus face profile

Tidak ada data loss user-facing. Tidak ada breaking change saat OTP login (jalur primary tidak terganggu).

---

## Native dependency removal & implications

### `@react-native-ml-kit/face-detection`
- Native module Android (ML Kit Vision) + iOS (MLKit pod)
- Removal: `npm uninstall`, then `npx expo prebuild --clean` untuk regenerate native projects tanpa ML Kit reference
- iOS pod deployment target 16.0 (bumped khusus ML Kit) — kalau tidak ada dep lain butuh, bisa direvert ke Expo default (15.1 saat ini)

### `react-native-fast-tflite`
- Native TFLite runtime
- Removal: `npm uninstall` + prebuild clean
- App size shrinks ~15-20 MB (TFLite runtime + model)

### `upng-js`
- Pure JS, no native impact
- Removal: `npm uninstall`

### App size impact
- TFLite runtime: ~10-12 MB
- ML Kit Vision: ~5-8 MB
- mobilefacenet.tflite: ~5 MB
- **Total APK size reduction: ~25-30 MB**

Build time juga lebih cepat (kurang native compilation work).

---

## Execution plan

### Phase 1 — Mobile UI removal (this PR, ~2-3 jam)
- [ ] Remove face UI dari Welcome screen
- [ ] Remove face UI dari Login screen
- [ ] Delete `app/settings/face.tsx`
- [ ] Delete `src/components/face/` folder
- [ ] Delete `src/services/faceDescriptor.ts` + `src/types/upng-js.d.ts`
- [ ] Strip face API functions + types
- [ ] Strip auth.store face fields + add orphan key cleanup
- [ ] Strip face i18n keys
- [ ] Remove `FaceDescriptorProvider` dari root layout
- [ ] Typecheck must pass

### Phase 2 — Native deps cleanup (separate PR, ~30 min)
- [ ] `npm uninstall @react-native-ml-kit/face-detection react-native-fast-tflite upng-js`
- [ ] Delete `assets/ml/mobilefacenet.tflite`
- [ ] Revisit iOS deployment target di `app.json`
- [ ] `npx expo prebuild --clean`
- [ ] Smoke test build untuk verify tidak break

### Phase 3 — BE coordination (parallel, async)
- [ ] Submit `backend-request-face-login-deprecation.md` ke tim BE
- [ ] BE confirm timeline + 90-day retention policy
- [ ] BE optional: drop face columns dari `/auth/me` response (mobile tidak baca lagi)

### Phase 4 — Force-update gate (timing dependent)
- [ ] After mobile release stable di Play Store, set force-update threshold supaya semua user upgrade
- [ ] Setelah 90 hari + < 5% user di old APK, BE bisa drop endpoints + tables

---

## Risks

1. **User dengan APK lama** — sebelum mereka update, face login tetap functional (BE endpoints retained). Mitigation: force-update threshold di `/public/app-version` setelah new APK stable.
2. **Data loss perception** — user yang pernah enroll face mungkin worry. Mitigation: data tetap ada di BE (90-day retention). Communicate via release note.
3. **Future re-enable** — kalau Q3 decide enable lagi, perlu re-add deps + restore code. Mitigation: keep BE endpoints + tables retained sementara, mobile-side bisa restore dari git history.

---

## Rollback strategy

Kalau decision di-revoke setelah merge:
1. Revert mobile PR (1 commit)
2. `npm install` (deps already in node_modules history)
3. Restore native projects via `expo prebuild --clean`
4. Re-test face login flow

Reversible dalam 1 jam asal BE endpoints + tables tetap intact.
