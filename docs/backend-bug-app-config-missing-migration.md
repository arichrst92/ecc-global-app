# Backend Bug Report: /public/app-config returns 500 (Prisma P2021)

**Untuk**: Tim Backend ECC (Claude session)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-23
**Priority**: 🟡 **MEDIUM** — mobile gracefully degrade pakai local defaults, tapi telemetry sampling + threshold tune-able tidak jalan sampai fix.
**Status**: 🐛 **BUG** — endpoint deployed tapi migration belum di-run

## Symptom

Mobile call `GET /public/app-config` saat splash (per BE handoff doc
`docs/backend-request-face-confidence-threshold-and-telemetry.md` section 7).

Response 500:
```json
{
  "success": false,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Error database (P2021). Lihat log server untuk detail."
  }
}
```

Prisma error code **P2021** = "The table `<schema>.<table>` does not exist
in the current database."

## Diagnosis

Endpoint handler di-deploy (route registered, returns 500 not 404), tapi
migration untuk create `app_config` table belum di-run di production
database.

Expected flow:
1. Schema definition di Prisma schema (probably already there)
2. `prisma migrate dev` (atau `prisma migrate deploy` di production) untuk
   create table
3. Seed default values:
   ```sql
   INSERT INTO app_config (face_match_threshold, low_confidence_warn_threshold,
                           telemetry_sampling_rate, error_reporting_enabled)
   VALUES (0.5, 0.7, 1.0, true);
   ```

Step 2 (atau 2+3) sepertinya skipped.

## Mobile impact

- ✅ **No user-facing impact** — mobile fallback ke `APP_CONFIG_DEFAULTS`
  (`src/types/appConfig.ts`):
  ```typescript
  {
    faceMatchThreshold: 0.5,
    lowConfidenceWarnThreshold: 0.7,
    telemetrySamplingRate: 1.0,
    errorReportingEnabled: true,
  }
  ```
- ⚠️ **No tune-ability** — admin update value via portal Developer Tools →
  App Config tidak akan ter-fetch oleh mobile karena endpoint error.
- ⚠️ **Error spam mitigated** (mobile commit M19.5) — pakai `suppressErrorReport: true`
  di getAppConfig + `retry: false`. Tidak pollute Diagnostics dashboard.

## Reproduce

```bash
curl https://api.eccchurch.global/public/app-config
# Expected: 200 + { faceMatchThreshold: 0.5, ... }
# Actual: 500 + { code: 'DATABASE_ERROR', message: 'Error database (P2021)...' }
```

## Fix

BE side:
1. Verify Prisma schema include `AppConfig` model (kalau belum, add)
2. `npx prisma migrate dev --name add_app_config` (dev)
3. `npx prisma migrate deploy` (production)
4. Seed initial row dengan default values
5. Optional: add validation handler untuk return defaults kalau table
   somehow empty (defensive)
6. Verify via curl above

Mobile side: nothing to do — auto-recover begitu endpoint 200 lagi.

## Related

- `docs/backend-request-face-confidence-threshold-and-telemetry.md` —
  original BE doc yang declare RESOLVED tapi step migration ke-skip
- `app/src/api/appConfig.ts` — mobile suppressErrorReport flag
- `app/src/hooks/useAppConfig.ts` — retry: false (graceful fallback)
- `app/src/types/appConfig.ts` — APP_CONFIG_DEFAULTS

## Verify done

- [ ] `curl https://api.eccchurch.global/public/app-config` return 200 +
      valid JSON
- [ ] Admin set `lowConfidenceWarnThreshold` ke 0.85 via portal →
      mobile pickup di next refetch (~1h cache atau force window focus)
