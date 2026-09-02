# Backend Request — Fix www.eccchurch.global assetlinks.json Redirect

**Date**: 2026-09-02
**Requester**: Mobile team (Ari)
**Priority**: HIGH — blocks Android App Links verification untuk www subdomain (Play Console v2.2.3 shows "Failed domain checks")
**Related**: `backend-request-universal-links-aasa-assetlinks.md` (delivered 2026-09-01)
**Status BE**: ✅ **FIXED & VERIFIED 2026-09-02** — direct 200 dari www untuk keduanya, Google verifier PASS. Reply: `be-update-2026-09-02-www-assetlinks-fixed.md`

---

## Problem

Google Digital Asset Links verifier (yang dipake Android App Links auto-verify) **tidak follow redirects** untuk `assetlinks.json`. Saat ini:

```
https://eccchurch.global/.well-known/assetlinks.json        → ✅ 200 OK direct
https://www.eccchurch.global/.well-known/assetlinks.json    → ❌ 301/302 → apex
```

Verified via Google's official API:

```bash
# Apex — WORKS
curl "https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://eccchurch.global&relation=delegate_permission/common.handle_all_urls"
# → statements[] valid dengan BOTH fingerprints

# www — ERROR
curl "https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://www.eccchurch.global&relation=delegate_permission/common.handle_all_urls"
# → {
#     "errorCode": ["ERROR_CODE_REDIRECT"],
#     "debugString": "Redirect encountered while fetching statements from
#                     https://www.eccchurch.global/.well-known/assetlinks.json:
#                     redirects are disallowed for security reasons (NOT_FOLLOWED_MAX_FORWARDS)"
#   }
```

Karena `app.json` mobile mendaftar **BOTH** hosts di Android intent filter (`eccchurch.global` + `www.eccchurch.global`), Play Console v2.2.3 Deep Links tab shows **"Failed domain checks"** untuk semua 5 paths (`/event`, `/ibadah`, `/content`, `/renungan`, `/news`).

Impact: Android App Links **auto-verification FAIL** — user yang buka link `www.eccchurch.global/event/xxx` bakal dapat "Open with..." chooser dialog instead of langsung buka app. UX degraded, meskipun apex domain OK.

## Request

Serve `assetlinks.json` **directly** dari www subdomain (HTTP 200, no redirect), dengan **exact same content** sebagai apex.

**Current (bermasalah):**
```nginx
# www.eccchurch.global vhost — redirect all requests to apex
location / {
  return 301 https://eccchurch.global$request_uri;
}
```

**Fixed:**
```nginx
# www.eccchurch.global vhost
location = /.well-known/assetlinks.json {
  default_type application/json;
  # Serve file langsung, TIDAK redirect
  root /var/www/well-known;
  try_files /assetlinks.json =404;
}

location = /.well-known/apple-app-site-association {
  default_type application/json;
  root /var/www/well-known;
  try_files /apple-app-site-association =404;
}

# Redirect semua request lain ke apex
location / {
  return 301 https://eccchurch.global$request_uri;
}
```

**Atau Next.js version** kalau web di-host di Next:

```typescript
// pages/api/assetlinks.ts (or app/api/assetlinks/route.ts)
export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'idea.eccchurch.global',
        sha256_cert_fingerprints: [
          '7B:77:14:62:87:AD:35:1B:8A:15:6A:77:F0:66:83:47:AF:4D:25:76:6A:83:4C:85:30:1A:CD:88:DF:24:23:2B',
          '51:C7:A1:51:1C:81:C5:B3:96:25:0A:19:0E:EF:F5:AD:AF:05:9D:00:37:25:6F:60:AA:9B:13:A5:F1:44:A5:64'
        ]
      }
    }
  ]);
}
```

Rewrite di `next.config.js`:
```javascript
async rewrites() {
  return [
    {
      source: '/.well-known/assetlinks.json',
      destination: '/api/assetlinks',
      has: [{ type: 'host', value: 'www.eccchurch.global' }],
    },
    // ...same untuk apex kalau belum
  ];
}
```

**Same fix untuk AASA:**
Kalau `www.eccchurch.global/.well-known/apple-app-site-association` juga redirect ke apex, iOS Universal Links untuk www subdomain juga silent-fail. Serve direct dari www.

## Verification (setelah BE fix)

```bash
# 1. Direct fetch — must return 200 without redirect
curl -I "https://www.eccchurch.global/.well-known/assetlinks.json"
# Expected: HTTP/2 200, content-type: application/json
# NOT: HTTP/2 301 with Location header

# 2. Google's official verifier — must return statements[] no errorCode
curl "https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://www.eccchurch.global&relation=delegate_permission/common.handle_all_urls"
# Expected: {"statements":[{...2 statements with BOTH fingerprints...}]}

# 3. Same untuk AASA
curl -I "https://www.eccchurch.global/.well-known/apple-app-site-association"
# Expected: HTTP/2 200
```

## Setelah BE Fix — Mobile Side

**Tidak perlu rebuild app.** Play Console App Links verifier akan re-check periodically (biasanya hourly). Cara force re-verify:

1. Play Console → Els App → Grow → Deep Links → App configuration
2. Click on each failed row → **Verify domain** button (or wait for auto re-check)
3. Status akan berubah ke ✅ "Verified" dalam 1-24 jam setelah BE fix live

Existing installs juga akan auto re-verify saat app update ke v2.2.4+ atau saat OS periodic check (~monthly).

## Alternative (Not Recommended)

Kalau BE tidak bisa fix redirect dalam waktu dekat, mobile bisa **remove www.eccchurch.global** dari intent filter di next release. Tapi trade-off: user yang share link dengan www prefix akan open browser instead of app.

Fix BE side lebih clean karena:
- Consistent dengan iOS AASA yang juga dual-host
- Backward compat: user yang punya app terinstal tetap dapat benefit App Links untuk kedua host
- No mobile release cycle needed

## Timeline

Ideally deploy dalam 1-2 hari kerja supaya v2.2.3 Play Console status berubah ke ✅ sebelum promote ke production track.

---

Reply via `docs/be-update-*.md` atau chat kalau ada pertanyaan.
