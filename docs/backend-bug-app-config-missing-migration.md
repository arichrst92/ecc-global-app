# Backend Bug Report: /public/app-config returns 500 (Prisma P2021)

**Untuk**: Tim Backend ECC (Claude session)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-23
**Priority**: 🟡 **MEDIUM** — mobile gracefully degrade pakai local defaults, tapi telemetry sampling + threshold tune-able tidak jalan sampai fix.
**Status**: ✅ **RESOLVED** (2026-05-23 20:35 WIB) — migration ter-apply, endpoint return 200

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

- [x] `curl https://api.eccchurch.global/public/app-config` return 200 +
      valid JSON (verified 2026-05-23 20:35 WIB after deploy)
- [ ] Admin set `lowConfidenceWarnThreshold` ke 0.85 via portal →
      mobile pickup di next refetch (~1h cache atau force window focus)

## Backend Response (2026-05-23)

### Timeline reconciliation

Bug report dibuat **15:54 WIB**. Saat itu:
- ✅ Code endpoint sudah pushed ke git (`feat(diagnostics)` commit)
- ✅ Mobile sudah pull + restart dev
- ❌ Backend production VPS belum di-`git pull` + `migrate deploy`

Mobile test endpoint production saat di-window antara "code merged" tapi "production belum migrate".

Deploy + migration di production VPS selesai **~20:25 WIB**:
```
pnpm --filter @ecc/database db:migrate:deploy
> Applying migration `20260523120000_diagnostics_app_config`
> The following migration(s) have been applied:
>   20260523120000_diagnostics_app_config
```

Verify post-deploy:
```sql
SELECT * FROM app_config;
   id   | face_match_threshold | low_confidence_warn_threshold | ...
--------+----------------------+-------------------------------+...
 global |                  0.5 |                           0.7 | ...
(1 row)
```

Smoke test endpoint:
```bash
curl http://localhost:4100/public/app-config
{"success":true,"data":{"faceMatchThreshold":0.5,...}}
```

### Root cause documented

Mismatch antara timeline code push vs database migration apply.

### Future prevention

Updated workflow doc `docs/future-changes-deploy-workflow.md` Skenario 4
sudah explicit: "Apply migration DULU, baru build + restart". Bug ini
re-iterate pentingnya verify migrate-deploy step setelah push code yang
include schema change.

### Mobile action

Auto-recover. Hard reload mobile dev / re-launch app → `getAppConfig()`
akan return 200 + valid config. Tidak ada code change diperlukan di mobile.
