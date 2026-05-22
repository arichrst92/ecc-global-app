# Backend Request: App Version Check (Manual + Auto Update Prompt)

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-22
**Priority**: 🟡 **MEDIUM** — UX feature, user retention + bug-fix rollout safety
**Status**: 🆕 **PROPOSED**

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
