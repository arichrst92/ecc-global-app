# Backend Request: Diagnostics Error Reporting Endpoint

**Untuk**: Tim Backend ECC (Claude session)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-23
**Priority**: 🟡 **MEDIUM** — production observability, replace third-party (Sentry/GlitchTip)
**Status**: 📝 **PROPOSED** — menunggu BE response

## TL;DR

Mobile butuh endpoint untuk push runtime errors + warnings dari production
build. Sebelumnya direncanakan pakai Sentry, tapi diputuskan tidak pakai
third-party untuk avoid subscription cost + signup friction + privacy review.

Mobile sudah implement client-side (commit M20 → M20.1):
`src/services/errorReporting.ts` push fire-and-forget `POST /diagnostics/error`.
Tanpa endpoint di BE, mobile dapat 404 dan drop silently — zero impact ke user.
Setelah BE rilis, errors mulai ke-record + bisa di-query/dashboard.

Architecture aligned dengan telemetry endpoint (`docs/backend-request-face-confidence-threshold-and-telemetry.md`):
- Fire-and-forget POST
- Silent fallback kalau 404
- BE collect, aggregate, expose dashboard internal

---

## 1. Endpoint spec

### Request

```http
POST /diagnostics/error
Content-Type: application/json
(no auth — optional Authorization header kalau user authenticated, otherwise anonymous)

{
  "type": "error" | "message",
  "release": "0.1.0+12",                      // version+buildNumber
  "device": {
    "platform": "ios" | "android",
    "osVersion": "17.4",
    "appVersion": "0.1.0",
    "release": "0.1.0+12"
  },
  "user": {
    "noHp": "+6281234567890"                  // null kalau anonymous
  },
  "breadcrumbs": [                            // last 20 events leading to error
    {
      "timestamp": "2026-05-23T10:30:00Z",
      "message": "User tapped face login",
      "category": "auth",
      "data": { "screen": "welcome" }
    },
    ...
  ],
  "timestamp": "2026-05-23T10:30:05Z",
  "message": "Network request failed",        // error.message atau log msg
  "stack": "Error: Network request failed\n  at fetch (...)\n  ...",  // optional
  "name": "TypeError",                        // error.name
  "context": {                                // arbitrary key-value from caller
    "endpoint": "/auth/face/login",
    "attempt": 2
  }
}
```

### Response

```json
{
  "success": true,
  "data": { "received": true }
}
```

Mobile fire-and-forget — tidak parse response body (cuma cek HTTP 2xx). Mau
BE return immediately tanpa heavy processing (queue async kalau perlu).

### Error responses
- 404 — endpoint belum implement. Mobile drop silently (V1 behavior).
- 5xx — silent drop di mobile, BE log untuk operations awareness.

---

## 2. Schema impact

### Table baru: `diagnostics_error_event`

```sql
CREATE TABLE diagnostics_error_event (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            VARCHAR(16) NOT NULL,        -- 'error' | 'message'
  release         VARCHAR(64) NOT NULL,        -- "0.1.0+12"
  platform        VARCHAR(16) NOT NULL,        -- 'ios' | 'android'
  os_version      VARCHAR(32),
  app_version     VARCHAR(32),
  user_no_hp      VARCHAR(32),                 -- nullable, indexed
  message         TEXT NOT NULL,
  stack           TEXT,
  error_name      VARCHAR(64),
  context         JSONB,
  breadcrumbs     JSONB,                       -- array of objects
  timestamp       TIMESTAMPTZ NOT NULL,        -- from mobile client
  received_at     TIMESTAMPTZ DEFAULT now(),   -- server received time
  -- Auto-derived columns untuk grouping (Sentry-style fingerprint)
  fingerprint     VARCHAR(64) GENERATED ALWAYS AS (
    md5(coalesce(error_name, '') || coalesce(message, ''))
  ) STORED
);

CREATE INDEX idx_diag_error_fingerprint_release ON diagnostics_error_event(fingerprint, release);
CREATE INDEX idx_diag_error_timestamp ON diagnostics_error_event(timestamp DESC);
CREATE INDEX idx_diag_error_user_no_hp ON diagnostics_error_event(user_no_hp) WHERE user_no_hp IS NOT NULL;
CREATE INDEX idx_diag_error_release_platform ON diagnostics_error_event(release, platform);
```

### Retention policy

- Auto-purge `WHERE received_at < now() - interval '30 days'` daily cron.
- Atau 90 hari kalau storage cheap. 30 hari cukup untuk pilot insight.

### Right-to-delete (PDP Law)

Saat user execute `DELETE /admin/me`, propagate ke
`DELETE FROM diagnostics_error_event WHERE user_no_hp = $1`. Tambahkan ke
audit log + cascade.

---

## 3. Dashboard suggestion (portal internal)

`Admin → Diagnostics → Error Events`:

### Aggregate view
- Group by `fingerprint`
- Show top 20 most frequent errors, last 7 days
- Columns: error_name, message preview, platforms affected, releases affected,
  user count, first_seen, last_seen, total occurrence
- Click row → detail breakdown

### Detail view (per fingerprint)
- Trend chart: occurrence per hour, last 7 days
- Breakdown:
  - By platform (iOS X% / Android Y%)
  - By release (0.1.0 X%, 0.1.1 Y%)
  - By app version
- Recent events list (last 50) dengan breadcrumbs expandable
- Affected users (de-duplicated noHp count + sample list)

### Filters
- Date range
- Platform (iOS / Android / all)
- Release (semver)
- Search by message substring
- User noHp (untuk debug specific complaint)

### Mobile detail expanded
- Show breadcrumb timeline (chronological list of last 20 events)
- Show stack trace dengan deobfuscation kalau memungkinkan (Hermes bytecode
  source maps optional — out of scope untuk MVP)

---

## 4. Rate limiting & DoS protection

- IP-based: 100 req/min/IP (cukup tinggi karena bursty error scenarios mungkin)
- Body size cap: 64KB (defensive — kalau client send huge stack/breadcrumbs)
- Async processing: queue insert ke worker queue kalau spike traffic (>1000 req/s)

---

## 5. Privacy & compliance

### Data minimization
- noHp optional — mobile pilih kirim atau tidak (sekarang ya untuk pilot debug)
- Tidak ada PII di breadcrumbs by convention (mobile dev disiplin)
- Stack traces tidak include user input strings

### Retention
- 30-90 hari, lalu purge
- Auto-purge cron task

### Right-to-delete propagation
- `DELETE FROM diagnostics_error_event WHERE user_no_hp = $1` saat user delete
  account

### Access control
- Endpoint `POST /diagnostics/error` — public, rate-limited
- Dashboard `Admin → Diagnostics` — restricted ke role `super_admin` /
  `developer`

---

## 6. Backwards compat

- V1 (sekarang): BE belum implement → mobile push 404 silent drop
- V2 (post BE rilis): mobile push 200 → events recorded
- Tidak ada breaking change. Mobile auto-benefit setelah BE rilis tanpa app
  update.

---

## 7. Alternatives considered

| Option | Pro | Con | Decision |
|---|---|---|---|
| **Custom BE endpoint** (chosen) | Free forever, full control, aligned dengan telemetry | BE has to build dashboard | ✅ |
| Sentry SaaS | Best DX, mature dashboard | $26/mo+ untuk team plan, vendor lock-in | ❌ |
| GlitchTip SaaS | Sentry-compatible, cheaper | Still SaaS, signup friction | ❌ |
| GlitchTip self-host | Free, mature | Ops overhead (postgres + redis + Django), security patches | ❌ |
| PostHog | Combined errors + analytics + sessions | Heavier, generous tier tapi tetap third-party | ❌ |
| Highlight.io | Open source, session replay | Heavy stack | ❌ |

Custom endpoint sederhana tapi cukup untuk pilot scale (<100 users, ~ratusan
errors/day expected). Bisa migrate ke dedicated tool kalau scale > 10K
events/day.

---

## 8. Action items BE

- [ ] Schema migration untuk `diagnostics_error_event` table
- [ ] Endpoint handler `POST /diagnostics/error` — validate, insert
- [ ] Rate limit middleware
- [ ] Retention cron task (30 hari default)
- [ ] Right-to-delete propagation di `DELETE /admin/me` handler
- [ ] Portal dashboard `Admin → Diagnostics → Error Events`:
  - [ ] Aggregate list grouped by fingerprint
  - [ ] Detail view dengan trend chart + breadcrumb timeline
  - [ ] Filters (date, platform, release, message search, user)
- [ ] Access control: super_admin / developer role only

---

## 9. Timeline preference

Ideal sebelum pilot rollout 2026-06-08 supaya errors dari pilot user otomatis
captured. Kalau slip, mobile tetap ready — events drop silently sampai
endpoint live, lalu auto-recover.

---

## 10. Backend Response

*(diisi oleh BE setelah review)*
