# Backend Request: Face Login Confidence Threshold + Telemetry Endpoint

**Untuk**: Tim Backend ECC (Claude session)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-23
**Priority**: 🟡 **MEDIUM** — pre-public-release coordination, blocker untuk pilot rollout judgment
**Status**: ✅ **RESOLVED** (2026-05-23) — endpoint + config + portal dashboard deployed

## TL;DR

Mobile sudah selesai wire face login end-to-end (MobileFaceNet 128-dim + ML Kit blink liveness + HMAC nonce). Sebelum public release, ada 2 unknown yang perlu BE answer:

1. **Confidence threshold alignment** — mobile hardcoded `confidence < 0.7 → show low_confidence_warn toast` di `app/(auth)/welcome.tsx` dan `app/(auth)/login/index.tsx`. Tidak tahu apakah 0.7 ini consistent dengan threshold yang server pakai untuk accept/reject match. Kalau server pakai threshold lebih tinggi (mis. 0.85), maka di range 0.7-0.85 server reject FACE_NO_MATCH padahal mobile akan tampilkan "success but low confidence" — UI tidak pernah trigger karena fail dulu di server. Kalau server pakai threshold lebih rendah (0.55), maka user dengan cosine 0.6 akan login sukses tanpa warning padahal harusnya warning.

2. **Telemetry endpoint** — pilot rollout 10-20 jemaat butuh metric: berapa % face login attempt sukses, berapa % gagal di liveness, berapa % gagal di FACE_NO_MATCH, latency p50/p95. Tanpa data ini, sulit decide kapan ready public release atau apakah perlu tune threshold/UX. Mobile butuh endpoint untuk push event, atau BE expose dashboard untuk read internal log.

---

## 1. Confidence Threshold

### 1.1 Current mobile state

`app/(auth)/login/index.tsx` line 80-82:
```typescript
onSuccess: async (data: FaceLoginResponse) => {
  await login(data.accessToken, data.refreshToken, data.user);
  if (data.confidence < 0.7) {
    showToast(t('face.low_confidence_warn'), 'info');
  } else {
    showToast(t('auth.login_success'), 'success');
  }
}
```

Toast text (id.json):
```
"low_confidence_warn": "Login berhasil (confidence rendah). Pertimbangkan re-enroll wajah."
```

Value 0.7 picked dari mobile-side intuition saja — bukan dari BE coordination. Mobile pilot tidak tahu apakah ini consistent dengan server decision boundary.

### 1.2 Pertanyaan ke BE

**Q1**: Apa cosine similarity threshold yang `POST /auth/face/login` pakai untuk decide accept (return 200) vs reject (return 401 FACE_NO_MATCH)?

Asumsi mobile: server compute `cosine = dot(storedDescriptor, submittedDescriptor)` (karena keduanya L2-normalized di mobile), lalu accept kalau `cosine >= ACCEPT_THRESHOLD`. Mohon konfirmasi:
- Value `ACCEPT_THRESHOLD` di production
- Apakah ada dynamic threshold (mis. tighter untuk admin role, looser untuk jemaat biasa)?
- Apakah hardcoded di env var, di DB config table, atau di code?

**Q2**: `confidence` field di `FaceLoginResponse` itu nilainya cosine similarity raw, atau dinormalisasi 0..1 dari range cosine `[ACCEPT_THRESHOLD..1.0]`?

Mobile pakai assumption naive `confidence = cosine ∈ [-1..1]`, tapi karena rejected sudah filtered di server, value yang sampai ke mobile pasti ≥ ACCEPT_THRESHOLD. Kalau confidence = cosine raw + ACCEPT_THRESHOLD = 0.6, maka range yang mobile lihat = [0.6..1.0]. Threshold 0.7 di mobile sebenarnya = (0.7 - 0.6) / (1.0 - 0.6) = 0.25 dari range, alias bottom quarter dari accepted range. Apakah ini reasonable, atau perlu adjust?

**Q3**: BE recommend value mobile-side untuk `low_confidence_warn` threshold? Kalau mobile-side warning ini ada efek nyata (mis. user re-enroll → improve precision di future logins), maka penting set value benar. Kalau BE prefer warning yang mostly silent (only warn untuk top 5% worst matches), threshold harus lebih dekat ke ACCEPT_THRESHOLD.

**Q4**: Apakah BE planning expose threshold via `/public/app-config` atau similar config endpoint? Supaya mobile tidak perlu hardcode + bisa BE tune tanpa app update. Lebih ideal kalau ya.

### 1.3 Decision matrix

Setelah BE answer, mobile akan:
- **Kalau BE return cosine raw**: mobile compute `displayPct = (confidence - ACCEPT_THRESHOLD) / (1 - ACCEPT_THRESHOLD)` untuk normalize ke 0-100% range untuk UI.
- **Kalau BE return normalized**: mobile pakai langsung.
- **Kalau BE expose threshold via config endpoint**: mobile fetch on splash + cache, tidak hardcode.

---

## 2. Telemetry Endpoint

### 2.1 Use case

Pilot rollout butuh visibility:
- Funnel: open face screen → liveness pass → descriptor compute → server accept
- Failure breakdown by reason (liveness no_blink, FACE_NO_MATCH, FACE_NOT_ENROLLED, LIVENESS_NONCE_EXPIRED, network timeout)
- Latency p50/p95 per step (liveness frames, descriptor compute, server roundtrip)
- Device segment (iOS/Android, model, OS version)
- Threshold tuning data: distribusi `confidence` di successful logins vs near-rejected

Tanpa data ini, judgment "ready public release?" jadi feeling-based. Ari mau decision data-backed.

### 2.2 Propose: `POST /auth/face/telemetry`

```http
POST /auth/face/telemetry
Content-Type: application/json
(no auth — sampling, anonymous)

{
  "sessionId": "uuid-from-mobile",     // group events dalam 1 flow
  "noHp": "+6281234567890",            // optional, kalau available
  "event": "face_login_attempt",       // event type, lihat below
  "outcome": "success" | "failure",
  "failureReason": "liveness_no_blink" | "face_no_match" | "...",
  "confidence": 0.83,                   // hanya kalau outcome=success
  "durationMs": {
    "livenessTotal": 2840,
    "descriptorCompute": 920,
    "serverRoundtrip": 410
  },
  "device": {
    "platform": "ios" | "android",
    "model": "iPhone 14 Pro",
    "osVersion": "17.4",
    "appVersion": "0.1.0",
    "modelVersion": "mobilefacenet-v1"
  },
  "timestamp": "2026-05-23T10:30:00Z"
}
```

**Response 200**: `{ "success": true }` (fire-and-forget, mobile tidak perlu retry).

### 2.3 Event types

**Note (revised 2026-05-23)**: event names di-neutralisasi — shared events
(`liveness`, `descriptor`, `nonce`) di-share antara login + enroll flow,
dengan `flow: 'login' | 'enroll'` field di payload untuk disambiguate.
Sebelumnya prefix `face_login_*` vs `face_enroll_*` di event name, sekarang
prefix neutral + flow field.

| Event | Flow field? | Trigger di mobile |
|---|---|---|
| `face_login_attempt` | always 'login' | User tap face login button (welcome / login screen) |
| `face_login_server_response` | always 'login' | faceLogin mutation onSuccess atau onError |
| `face_enroll_attempt` | always 'enroll' | User tap "Aktifkan Login Wajah" di settings |
| `face_enroll_complete` | always 'enroll' | enrollFace mutation success |
| `face_enroll_fail` | always 'enroll' | enrollFace mutation error |
| `face_liveness_pass` | required login/enroll | LivenessChallenge.onSuccess() |
| `face_liveness_fail` | required login/enroll | LivenessChallenge fail dengan reason |
| `face_descriptor_compute` | required login/enroll | computeFaceDescriptor() return ok=true atau ok=false |
| `face_nonce_request` | required login/enroll | requestLivenessNonce success / fail |

### 2.4 Sampling

Mobile akan sample 100% selama pilot (10-20 user, low volume). Setelah public release, sampling reduce ke 10-20% untuk control bandwidth + BE storage. Mau BE setting sampling rate via `/public/app-config` supaya tune-able tanpa app update.

### 2.5 Privacy considerations

- **Tidak kirim descriptor** (biometric data) — hanya outcome + confidence number.
- **`noHp` optional** — pilot mau correlate dengan user identity untuk debug. Setelah pilot, mungkin drop atau hash. Mau BE direction PDP Law compliance: noHp di telemetry table termasuk PII di scope right-to-delete?
- **Retention**: usul 90 hari untuk pilot insight, lalu purge auto.

### 2.6 Alternative — BE-side log instead

Kalau bikin endpoint baru terlalu heavy untuk pilot, BE bisa:
- Log structured JSON di `POST /auth/face/login` handler dengan field outcome/confidence/duration
- Mobile pass headers tambahan untuk context: `X-App-Version`, `X-Device-Platform`, `X-Liveness-Duration-Ms`
- BE aggregate via Loki / log search → expose dashboard internal di portal

Approach mana lebih realistic? Mobile-side mau implement based on BE preference.

### 2.7 Backwards compat

Endpoint baru — no impact ke existing flow. Mobile akan implement guarded:
- Kalau `POST /auth/face/telemetry` return 404 (BE belum implement) → mobile silent drop, tidak retry, tidak block flow.
- Kalau timeout > 2s → drop, tidak block (telemetry non-critical).

---

## 3. Schema impact

### Confidence threshold question
- Tidak ada migration kalau hanya disclose existing value.
- Kalau BE setuju expose via config endpoint → schema baru `app_config` table atau extend existing.

### Telemetry endpoint
- Table baru `face_telemetry_event`:
  ```
  id              uuid PK
  sessionId       uuid (indexed for funnel queries)
  noHp            varchar nullable
  event           varchar
  outcome         varchar
  failureReason   varchar nullable
  confidence      float nullable
  durationMs      jsonb
  device          jsonb
  timestamp       timestamptz (indexed)
  createdAt       timestamptz default now()
  ```
- Retention policy: cron auto-purge `WHERE timestamp < now() - interval '90 days'` daily.
- Index pada `(event, timestamp)` untuk dashboard query.

---

## 4. Action items BE

### Confidence threshold
- [ ] Konfirmasi current production `ACCEPT_THRESHOLD` di handler `/auth/face/login`
- [ ] Konfirmasi format `confidence` di response (raw cosine atau normalized)
- [ ] Recommend mobile-side `low_confidence_warn` threshold value
- [ ] (Optional) Expose threshold via `/public/app-config` endpoint untuk hot-tune

### Telemetry
- [ ] Pilih approach: dedicated endpoint vs structured log + header pattern
- [ ] Kalau dedicated endpoint: confirm schema + create migration + handler
- [ ] Set retention policy (usul 90 hari)
- [ ] (Optional) Expose pilot dashboard di portal Admin → Diagnostics → Face Login

### Timeline preference

Pilot rollout tentative 2026-06-08 (3 minggu dari sekarang setelah V2 nonce cutover 06-01 stable). Confidence threshold answer + telemetry decision ideal sebelum pilot start supaya data tracking aktif dari attempt #1.

---

## 5. Test cases yang patut di-coba

1. **Threshold edge case**: enroll dengan low-quality reference (poor lighting), login dengan high-quality. Confidence yang muncul di response, mobile UI handling reasonable?
2. **Telemetry endpoint**: bombard dengan 100 req/min dari single client, BE rate limit handling
3. **Privacy**: query DB face_telemetry_event filter by noHp = '+62xxx', confirm DELETE user via right-to-delete propagate ke telemetry table juga
4. **Sampling rate change**: BE update `/public/app-config` `telemetrySamplingRate: 0.1`, mobile next call respect new rate

---

## 6. Related docs

- `docs/backend-request-face-recognition.md` — original face endpoint spec (resolved)
- `docs/backend-request-face-recognition-v2-mobilefacenet.md` — descriptor model decision (resolved)
- `docs/backend-request-face-recognition-v2-mobilefacenet-dim-correction.md` — 192→128 dim fix (resolved)
- `docs/backend-request-liveness-nonce.md` — server-side gate (resolved)
- `docs/production-launch-brief-2026-05-23.md` — domain switch context

---

## 7. Backend Response (2026-05-23)

### 7.1 Jawaban Confidence Threshold

**Q1 — Current ACCEPT_THRESHOLD?**
- File: `packages/auth/src/face.ts:32` — `FACE_MATCH_THRESHOLD = Number(process.env.FACE_MATCH_THRESHOLD ?? 0.5)`
- Production .env: **`0.5`** (default value, tidak di-override)
- Tidak ada dynamic threshold per role. Threshold sama untuk semua user.
- Hardcoded di env var, bukan di DB. Update threshold = redeploy + restart core-api.

**Q2 — Format `confidence` di response?**
- `apps/core-api/src/routes/auth.ts:402-404`:
  ```typescript
  // Confidence = cosine similarity itself (already in 0..1 range untuk
  // normalized face descriptors). Clamp untuk safety.
  const confidence = Math.max(0, Math.min(1, result.similarity));
  ```
- Value = **raw cosine similarity**, clamped ke [0, 1]. **Bukan normalized** dari range accepted.
- Karena rejected sudah filtered di server (similarity < 0.5 → 401), value yang sampai mobile = `[0.5..1.0]`.

**Q3 — Recommended `low_confidence_warn` threshold?**
- Mobile-side intuition 0.7 **reasonable** — itu 40% dari accepted range (0.5..1.0):
  - `displayPct = (0.7 - 0.5) / (1.0 - 0.5) = 0.40`
- Warning ini akan trigger untuk ~25-40% successful logins (estimated based pada distribution cosine similarity face matching umumnya). Cukup aware tapi tidak spammy.
- Untuk tune-able tanpa app update, sekarang exposed via `/public/app-config.lowConfidenceWarnThreshold` (default 0.7).

**Q4 — Expose threshold via config endpoint?**
- **YES** — sudah deployed. Mobile fetch via `GET /public/app-config`:
  ```json
  {
    "success": true,
    "data": {
      "faceMatchThreshold": 0.5,
      "lowConfidenceWarnThreshold": 0.7,
      "telemetrySamplingRate": 1.0,
      "errorReportingEnabled": true
    }
  }
  ```
- Cache 1 jam recommended (mobile-side). Admin update via portal **Developer Tools → Diagnostics → App Config** tab.

### 7.2 Telemetry Endpoint — DEPLOYED

**Endpoint:** `POST /auth/face/telemetry` (no auth, fire-and-forget, rate-limit 500/menit/IP).

**Payload sesuai spec request — semua field opsional kecuali sessionId, event, outcome, timestamp.** Lihat `packages/shared-types/src/schemas/diagnostics.ts` `faceTelemetryEventInputSchema` untuk Zod schema lengkap.

**Event types accepted:**
- `face_login_attempt`, `face_login_server_response`
- `face_enroll_attempt`, `face_enroll_complete`, `face_enroll_fail`
- `face_liveness_pass`, `face_liveness_fail`
- `face_descriptor_compute`, `face_nonce_request`

Field `flow: 'login' | 'enroll'` opsional untuk disambiguate shared events.

**Response (success):** `200 OK` dengan `{ "success": true, "data": { "received": true } }`.

**Privacy:**
- `noHp` di table `face_telemetry_event.no_hp` — propagate ke `DELETE /admin/me` (right-to-delete).
- Tidak ada descriptor / biometric data stored — cuma outcome + confidence + duration + device meta.

**Retention:** 90 hari (`FACE_TELEMETRY_RETENTION_DAYS` env, default 90). Daily auto-purge cron.

**Sampling:** Mobile decide client-side. Backend tidak filter — kalau sampai BE, akan di-insert. Mobile baca `telemetrySamplingRate` dari `/public/app-config`, sample client-side sebelum push.

### 7.3 Portal Dashboard — DEPLOYED

**Menu:** Portal → **Developer Tools → Diagnostics** (RBAC menuKey `diagnostics`, Fulltimer dapat full access by default).

**3 tabs:**
1. **Face Telemetry** — funnel event × outcome, top failure reasons, latency p50/p95 (livenessTotal, descriptorCompute, serverRoundtrip), confidence distribution (avg + p50 + p95). Filter: platform (iOS/Android/all), flow (login/enroll/all).
2. **Error Events** — aggregate by fingerprint, search by message, filter platform. Click row → detail modal (recent 50 events, breadcrumbs expandable, stack trace).
3. **App Config** — edit tune-able fields (face thresholds + sampling rate + error reporting kill switch).

Endpoint admin:
- `GET /admin/diagnostics/face-telemetry?platform=&flow=&from=&to=`
- `GET /admin/diagnostics/error-events?search=&platform=&page=&limit=`
- `GET /admin/diagnostics/error-events/:fingerprint`
- `GET /admin/diagnostics/app-config`
- `PATCH /admin/diagnostics/app-config`

### 7.4 Action Items Mobile (untuk pilot)

1. Implement fetch `/public/app-config` saat splash, cache 1 jam (key `ecc.app-config`).
2. Update `low_confidence_warn` threshold dari hardcoded 0.7 → ambil dari `appConfig.lowConfidenceWarnThreshold`.
3. Implement telemetry push:
   - Generate sessionId UUID per face login/enroll attempt
   - Push event di lifecycle hooks (attempt, liveness pass/fail, descriptor compute, nonce request, server response)
   - Sampling: `Math.random() < appConfig.telemetrySamplingRate`
   - Fire-and-forget: tidak retry, tidak block UX flow kalau gagal
4. Test di pilot env sebelum public release — verify event muncul di portal Diagnostics → Face Telemetry.

### 7.5 Timeline

Deployed 2026-05-23. Ready untuk pilot rollout 2026-06-08. Tidak ada dependency lain untuk mobile-side implementation.

---

## 8. Mobile Acknowledgment (2026-05-23)

Confirmed BE deploy complete. Mobile-side implementation (commit M19.3):

### 8.1 /public/app-config wired

- `src/types/appConfig.ts` — typed `AppConfig` + `APP_CONFIG_DEFAULTS` fallback (faceMatchThreshold 0.5, lowConfidenceWarnThreshold 0.7, telemetrySamplingRate 1.0, errorReportingEnabled true)
- `src/api/appConfig.ts` — `getAppConfig()` GET wrapper
- `src/hooks/useAppConfig.ts` — `useAppConfig()` hook + `getAppConfigSync(qc)` sync accessor + `prefetchAppConfig(qc)` helper
- Cache 1 jam (sesuai BE recommendation). Pre-warmed di splash via `prefetchAppConfig`.
- Excluded dari React Query persist (always fresh — config tune-able server-side).

### 8.2 Hardcoded confidence threshold → dynamic

- `app/(auth)/welcome.tsx` + `app/(auth)/login/index.tsx` — `data.confidence < 0.7` → `data.confidence < appConfig.lowConfidenceWarnThreshold`.
- Admin tune via portal Developer Tools → App Config; mobile pick up di next refetch (~1h cache).

### 8.3 Telemetry sampling

- `src/services/telemetry.ts` — module-level `currentSamplingRate` + `setTelemetrySamplingRate(rate)` setter.
- Root layout `_layout.tsx` `useEffect` subscribe ke `appConfig.telemetrySamplingRate` → call setter setiap refresh.
- `trackFaceEvent` panggil `shouldSample()` sebelum fetch — drop event sebelum network kalau `Math.random() >= rate`.
- Fast path: rate=1.0 (pilot default) skip Math.random call.

### 8.4 Verification pending

Manual oleh Ari saat dev build di physical device:

1. Trigger face login → confirm event muncul di portal Developer Tools → Diagnostics → Face Telemetry tab
2. Verify confidence distribution & latency p50/p95 di dashboard
3. Verify sampling: admin set `telemetrySamplingRate = 0.1` di portal → 90% events di-drop sebelum push
4. Verify low_confidence threshold tune: admin set ke 0.85 → toast warning trigger lebih sering
5. Verify right-to-delete: trigger telemetry event sebagai user A → DELETE /admin/me → confirm event terhapus dari face_telemetry_event table

No mobile code change required after this (M19.3) commit.
