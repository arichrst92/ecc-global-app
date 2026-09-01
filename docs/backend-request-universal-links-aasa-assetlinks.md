# Backend Request — Universal Links (iOS AASA + Android assetlinks)

**Date**: 2026-09-01
**Requester**: Mobile team (Ari)
**Priority**: MEDIUM (Sprint 8 feature — enables branded https:// deep links)
**Related**: Mobile v2.1.0 (`app.json` config), custom scheme `ecc://` (existing)

---

## Context

Sprint 8 goal: gantikan (partially) custom scheme `ecc://` dengan **Universal Links** (iOS) dan **App Links** (Android) supaya:
- Link `https://eccchurch.global/event/xxx` yang di-share via chat/email → langsung buka **app** (kalau installed) instead of Safari/Chrome
- Deep link "professional" — user tidak perlu tap intermediate confirmation "Open in App?" dialog
- Konsisten cross-platform (iOS + Android same URL format)
- Fallback graceful: kalau app tidak installed, link tetap open di browser

Existing custom scheme `ecc://` **tidak di-remove** (backward compat + internal use like magic link `ecc://auth?token=...`).

## Perubahan Mobile (sudah delivered v2.1.0)

**`app.json`:**

```json
"ios": {
  "associatedDomains": [
    "applinks:eccchurch.global",
    "applinks:www.eccchurch.global"
  ]
},
"android": {
  "intentFilters": [
    // existing ecc://auth
    {
      "action": "VIEW",
      "autoVerify": true,
      "data": [
        { "scheme": "https", "host": "eccchurch.global", "pathPrefix": "/event" },
        { "scheme": "https", "host": "eccchurch.global", "pathPrefix": "/ibadah" },
        { "scheme": "https", "host": "eccchurch.global", "pathPrefix": "/content" },
        { "scheme": "https", "host": "eccchurch.global", "pathPrefix": "/renungan" },
        { "scheme": "https", "host": "eccchurch.global", "pathPrefix": "/news" },
        // + www.eccchurch.global variants
      ],
      "category": ["BROWSABLE", "DEFAULT"]
    }
  ]
}
```

Route redirects created di app (mobile side): `/renungan/[id]` → `/content/renungan/[id]`, `/news/[id]` → `/content/news/[id]`.

**Excluded paths (WAJIB stay in web-browser, Apple compliance):**
- `/persembahan/*` — Apple Guideline 3.2.2(iv) charitable donation must be external
- `/event/*/pembayaran` — payment web page dari mobile hybrid flow (bukan mau buka app lagi)

---

## Request untuk Backend

### File #1: iOS AASA

**Path (WAJIB exact):** `https://eccchurch.global/.well-known/apple-app-site-association`

**Content-Type:** `application/json` (NO `.json` extension, MUST be served as JSON MIME)

**HTTPS only** (Apple tidak trust HTTP)

**Isi file:**

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "RB94VQ27V3.idea.eccchurch.global",
        "paths": [
          "/event/*",
          "NOT /event/*/pembayaran",
          "/ibadah/*",
          "/content",
          "/content/*",
          "/renungan/*",
          "/news/*"
        ]
      }
    ]
  }
}
```

**Catatan:**
- `RB94VQ27V3` = Apple Team ID (Gereja El Shaddai Injil Sepenuh)
- `idea.eccchurch.global` = iOS bundle identifier
- `NOT /event/*/pembayaran` = exclude payment web page dari Universal Link (stay browser). `NOT` prefix supported since iOS 13.
- `/persembahan/*` **TIDAK included** — persembahan tetap open di browser (Apple compliance)

**Serve juga untuk www subdomain** (kalau di-serve dari same domain, redirect www→apex atau host di dua tempat):

```
https://www.eccchurch.global/.well-known/apple-app-site-association → same file
```

**Verify** setelah deploy:
```bash
curl -I https://eccchurch.global/.well-known/apple-app-site-association
# → HTTP/2 200, content-type: application/json

curl https://eccchurch.global/.well-known/apple-app-site-association | jq
# → JSON structure valid
```

Apple akan crawl file ini periodically (biasanya saat app install/update). Kalau file 404 or wrong content-type, Universal Link **silent fail** — link tetap open di Safari.

### File #2: Android assetlinks.json

**Path (WAJIB exact):** `https://eccchurch.global/.well-known/assetlinks.json`

**Content-Type:** `application/json`

**Isi file:**

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "idea.eccchurch.global",
      "sha256_cert_fingerprints": [
        "SHA256_FINGERPRINT_UPLOAD_KEY_HERE",
        "SHA256_FINGERPRINT_PLAY_APP_SIGNING_KEY_HERE"
      ]
    }
  }
]
```

**Catatan:**
- `package_name` = Android package name
- `sha256_cert_fingerprints` = **DUA fingerprint** yang perlu:
  1. **Upload key SHA256** — dari keystore mobile team local (untuk debug/dev + kalau kirim ke Google Play sebagai signed APK)
  2. **Play App Signing key SHA256** — dari Google Play Console → **Setup → App Integrity → App signing key certificate → SHA-256 certificate fingerprint**

**Mobile team akan supply fingerprints:**

```bash
# Upload key fingerprint (dari mobile team local keystore)
keytool -list -v -keystore path/to/upload-key.keystore -alias upload | grep SHA256

# Play App Signing key fingerprint:
# Login Play Console → App → Setup → App Integrity → 
#   "Copy" SHA-256 di section "App signing key certificate"
```

Sertakan **BOTH** fingerprints. Kalau salah satu saja, verification fail untuk build yang di-sign dengan key lain.

**Serve untuk www juga:**
```
https://www.eccchurch.global/.well-known/assetlinks.json → same file
```

**Verify:**
```bash
# Google's official verification tool:
https://developers.google.com/digital-asset-links/tools/generator

# Manual:
curl https://eccchurch.global/.well-known/assetlinks.json | jq
```

Android akan verify file saat app install (kalau `autoVerify: true` di intent filter — sudah set di v2.1.0). Kalau file missing, Android akan tampil chooser dialog "Open with..." instead of langsung buka app.

---

## Hosting Requirements

Both files harus di-serve dari **root domain**:
- `/.well-known/apple-app-site-association` (no extension)
- `/.well-known/assetlinks.json`

**Config Next.js / Vercel / Nginx:**

### Next.js (kalau web pakai Next):

```typescript
// pages/api/apple-app-site-association.ts
import type { NextApiRequest, NextApiResponse } from 'next';

const aasa = { /* ...isi JSON dari atas... */ };

export default function handler(_: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(aasa);
}
```

Rewrite di `next.config.js`:
```javascript
async rewrites() {
  return [
    {
      source: '/.well-known/apple-app-site-association',
      destination: '/api/apple-app-site-association',
    },
    {
      source: '/.well-known/assetlinks.json',
      destination: '/api/assetlinks',
    },
  ];
}
```

### Nginx:

```nginx
location = /.well-known/apple-app-site-association {
  default_type application/json;
  return 200 '{...json content...}';
}

location = /.well-known/assetlinks.json {
  default_type application/json;
  return 200 '[...json content...]';
}
```

Atau simpler: taruh static file di public folder.

---

## Testing

**iOS Universal Link:**
1. Deploy v2.1.0 build ke TestFlight
2. Install di iPhone (fresh install atau uninstall + reinstall — Universal Link verification hanya trigger saat install)
3. Buka Notes atau Safari → type/paste `https://eccchurch.global/event/{some-event-id}`
4. Long-press link → menu context menu → pilih "Open in Els App" (kalau AASA valid). Kalau tidak muncul opsi, AASA fail.
5. Atau tap link dari email/chat — harusnya langsung buka app tanpa dialog.

**Android App Link:**
1. Deploy v2.1.0 ke Play Store internal testing
2. Install di Android device
3. Run `adb shell pm get-app-links idea.eccchurch.global`:
   - Should show `verified` for `eccchurch.global` domain
4. Kalau `not verified`, check assetlinks.json content + fingerprints

**Fallback test:**
1. Uninstall app
2. Tap `https://eccchurch.global/event/xxx` → harusnya open di browser (bukan error)
3. Install app back → tap link lagi → open app

## Timeline

- **BE:** deliver AASA + assetlinks files ke `/.well-known/` — 1-2 hari kerja (kalau content sudah di-approve, tinggal deploy file)
- **Mobile:** ready untuk build v2.1.0 setelah receive Google Play App Signing key SHA256
- **QA:** verify di real device (iPhone + Android) — 1 hari kerja

**Recommend deploy urutan:**
1. Mobile team supply Play App Signing key fingerprint (via secure channel — Signal atau Slack DM)
2. BE deploy `/.well-known/apple-app-site-association` + `assetlinks.json`
3. Verify dengan curl + Apple/Google tools
4. Mobile submit v2.1.0 build ke store
5. QA test after install fresh

## Non-Goals

- Tidak perlu ubah web routing (`/event/xxx` URL structure kept as-is)
- Tidak perlu redirect scheme `ecc://` (backward compat kept)
- Tidak perlu bump API version — deployment side only

---

Reply via `docs/be-update-*.md` atau langsung chat kalau ada pertanyaan.
