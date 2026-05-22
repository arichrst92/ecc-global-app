# Backend Request: App Version Check (Manual + Auto Update Prompt)

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-22
**Priority**: 🟡 **MEDIUM** — UX feature, user retention + bug-fix rollout safety
**Status**: ✅ **RESOLVED** (BE patch 2026-05-22b) — lihat section "Backend Response" di akhir doc.

## TL;DR

Mobile butuh endpoint untuk cek apakah ada update aplikasi tersedia. Sub-fitur:

1. **Auto-check** — saat app launch, hit BE → kalau ada update lebih baru dari versi terinstall, tampil modal/banner
2. **Manual check** — di profile / settings, button "Cek Update" → trigger same logic
3. **Force update** — kalau version terinstall di-bawah `minSupportedVersion`, modal blocking yang user tidak bisa dismiss (harus update dulu)

## Endpoint Request

```http
GET /admin/app-version?platform=ios|android&currentVersion=1.0.0
Authorization: Bearer <token>  (optional — also OK tanpa auth supaya pre-login bisa cek)

Response 200: {
  "success": true,
  "data": {
    "latestVersion": "1.2.0",          // versi terbaru yang dipublish admin
    "minSupportedVersion": "1.0.0",    // minimum yang masih boleh jalan
    "updateAvailable": true,           // computed: currentVersion < latestVersion
    "forceUpdate": false,              // computed: currentVersion < minSupportedVersion
    "releaseNotes": "- Fix QR scanner crash\n- New ministry detail page\n...",
    "downloadUrl": {
      "ios": "https://apps.apple.com/id/app/ecc-global/id1234567890",
      "android": "https://play.google.com/store/apps/details?id=asia.ide.ecc"
    },
    "publishedAt": "2026-05-22T10:00:00Z"
  }
}
```

Field penting:
- `currentVersion` (query param) — dari `Application.nativeApplicationVersion` di mobile (expo-application)
- `updateAvailable` — semver comparison, BE compute
- `forceUpdate` — true kalau install version di-bawah minSupportedVersion, mobile UI tidak boleh skip
- `releaseNotes` — markdown atau plain text, tampil di update modal
- `downloadUrl` — direct link ke store. Default fallback: Play Store / App Store ID di-detect from `platform` param.

## Admin Portal Side

Admin perlu page untuk:
- Set `latestVersion` per platform (separate row: ios + android)
- Set `minSupportedVersion` per platform
- Tulis `releaseNotes` (markdown editor)
- Configure `downloadUrl` per platform
- Publish toggle (kalau false, jangan show prompt)

Schema suggestion:
```prisma
model AppVersion {
  id              String   @id @default(uuid())
  platform        Platform // enum IOS | ANDROID
  latestVersion   String   // "1.2.0"
  minSupportedVersion String   // "1.0.0"
  releaseNotes    String?  @db.Text
  downloadUrl     String
  isPublished     Boolean  @default(false)
  publishedAt     DateTime?
  createdAt, updatedAt
}
enum Platform { IOS  ANDROID }
```

Cuma 1 row per platform yang `isPublished=true` (latest). Old versions di-keep untuk audit.

## Effort estimate BE

- Schema + migration: 30 min
- GET endpoint + semver compare helper: 1 jam (pakai `semver` npm package atau manual split string compare)
- Admin portal CRUD page: 2-3 jam
- Documentation: 30 min

Total: **~4-5 jam BE work**.

## Action items BE

- [ ] Klarifikasi: storage approach — 1 row per platform (latest publish), atau full version history?
- [ ] Migration + schema
- [ ] GET /admin/app-version dengan semver compare
- [ ] Admin portal page (Settings → App Versions)
- [ ] Skip auth check pada endpoint (supaya pre-login splash juga bisa cek)
- [ ] Document di mobile-api-guide section baru

## Mobile-side plan (after BE ready)

- `src/api/appVersion.ts` — `checkAppVersion(platform, currentVersion)`
- `src/hooks/useVersionCheck.ts` — auto-check di app launch + manual trigger
- `src/components/VersionUpdateModal.tsx` — render releaseNotes + "Update Now" button → open downloadUrl. Force-update variant tanpa close btn.
- Profile settings: "Cek Update Aplikasi" menu item → manual trigger
- App root: panggil checkAppVersion saat first mount (silent — kalau ada update non-force, tampil modal sekali; kalau force, modal selalu re-prompt sampai user update)

Pakai `expo-application`:
- `Application.nativeApplicationVersion` → "1.0.0" string
- `Platform.OS` → 'ios' | 'android'

Mobile-side estimasi: **2-3 jam** setelah BE ready.

## Versioning conventions

- App version = semver `MAJOR.MINOR.PATCH` (e.g. "1.2.3")
- Increment rules:
  - PATCH: bug fixes only, no UI change
  - MINOR: new feature, backward-compatible
  - MAJOR: breaking change or major redesign
- `minSupportedVersion` di-bump cuma kalau ada breaking API change yang mobile lama tidak bisa handle (mis. new auth flow)

---

## ✅ Backend Response — 2026-05-22 (patch 2026-05-22b)

### Public endpoint (no auth — pre-login accessible)

```http
GET /public/app-version?platform=ios|android&currentVersion=1.0.0
```

- `platform` wajib, lowercase `ios` atau `android`.
- `currentVersion` opsional, semver `MAJOR.MINOR.PATCH`. Kalau kosong, server return latest tanpa compute `updateAvailable`/`forceUpdate`.

**Response 200 (ada published row):**
```json
{
  "success": true,
  "data": {
    "platform": "IOS",
    "latestVersion": "1.2.0",
    "minSupportedVersion": "1.0.0",
    "updateAvailable": true,
    "forceUpdate": false,
    "releaseNotes": "- Fix QR scanner crash\n- ...",
    "downloadUrl": "https://apps.apple.com/...",
    "publishedAt": "2026-05-22T10:00:00Z"
  }
}
```

**Response 200 (belum ada published row di platform tsb):**
```json
{
  "success": true,
  "data": {
    "platform": "IOS",
    "latestVersion": null,
    "minSupportedVersion": null,
    "updateAvailable": false,
    "forceUpdate": false,
    "releaseNotes": null,
    "downloadUrl": null,
    "publishedAt": null
  }
}
```

Mobile aman handle null — fallback ke "tidak ada update", jangan tampil prompt.

### Semver comparison

Manual parsing (tidak ada dependency baru). Pattern `MAJOR.MINOR.PATCH` saja
(no pre-release tag/build metadata). Validated di Zod input dan compare di
helper `compareSemver(a, b)`.

- `updateAvailable` = `currentVersion < latestVersion`
- `forceUpdate` = `currentVersion < minSupportedVersion`

### Admin endpoints (JWT + RBAC menuKey `app-version`)

```http
GET    /admin/app-version              → list semua row (semua platform)
GET    /admin/app-version/:id          → detail row
POST   /admin/app-version              → create new (auto-unpublish row lama saat isPublished=true)
PATCH  /admin/app-version/:id          → update
DELETE /admin/app-version/:id          → hard delete (history)
```

POST/PATCH body:
```json
{
  "platform": "IOS",
  "latestVersion": "1.2.0",
  "minSupportedVersion": "1.0.0",
  "releaseNotes": "- ...",
  "downloadUrl": "https://apps.apple.com/...",
  "isPublished": true
}
```

**Storage approach** (decision dari klarifikasi action items): full history
disimpan. Setiap publish create row baru atau update existing. Hanya **1 row
aktif per platform** yang `isPublished=true` — auto-unpublish lainnya saat
publish baru. Old versions di-keep untuk audit + rollback (admin toggle
isPublished=true di row lama → row aktif jadi unpublished).

### Schema migration

`20260522150000_app_version`:
- Table `app_version` (platform enum, latestVersion, minSupportedVersion, releaseNotes, downloadUrl, isPublished, publishedAt, publishedByUserId, timestamps)
- Index `(platform, isPublished)` untuk lookup cepat
- RBAC backfill Fulltimer untuk menuKey `app-version`.

### Portal admin

- Sidebar **App Settings → App Versions** (`/dashboard/app-version`)
- Tabs iOS / Android dengan icon
- Tampil published row di atas (badge hijau), history/draft di bawah
- Create modal default version `1.0.0` + downloadUrl preset per platform
- Edit inline (collapse-expand) dengan publish toggle yang aware: saat di-check, alert bahwa versi lain di platform yg sama akan auto-unpublish

### Action items mobile (handoff)

- [ ] `src/api/appVersion.ts` — `checkAppVersion(platform, currentVersion)`
- [ ] `src/hooks/useVersionCheck.ts` — auto di app launch + manual button
- [ ] `src/components/VersionUpdateModal.tsx` — render release notes + Update button + force-variant non-dismissable
- [ ] Profile settings: "Cek Update Aplikasi" → manual trigger
- [ ] `expo-application`:
  - `Application.nativeApplicationVersion` → currentVersion string
  - `Platform.OS` → 'ios' | 'android'
- [ ] Handle null latestVersion (admin belum publish) → diam saja
