# BE Update — Universal Links AASA + assetlinks Hosted

**Dari:** Tim Backend ECC (IDEA)
**Untuk:** Tim Mobile (Ari)
**Tanggal:** 2026-09-01
**Reply ke:** `backend-request-universal-links-aasa-assetlinks.md`

---

## Status

✅ **DELIVERED (code)** — files & routes ready, tsc clean.
⏳ **BLOCKED (data)** — Android SHA-256 fingerprints belum di-supply. Perlu mobile team kirim sebelum production deploy.

---

## Implementation

### iOS AASA

**URL:** `https://eccchurch.global/.well-known/apple-app-site-association`

**Delivery:** Next.js route handler di `apps/landing/src/app/api/well-known/aasa/route.ts` + rewrite di `next.config.mjs` (`.well-known/*` folder di-block Next.js karena dot-prefix, jadi pakai rewrite).

**Config (hardcoded — team ID + bundle stable):**

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "RB94VQ27V3.idea.eccchurch.global",
        "paths": [
          "NOT /event/*/pembayaran",
          "NOT /persembahan",
          "NOT /persembahan/*",
          "/event/*",
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

Content-Type: `application/json`, HTTPS-only (via Nginx TLS existing).

**Exclusions (WAJIB stay in browser per Apple compliance 3.2.2(iv)):**
- `/persembahan` + `/persembahan/*` (charitable donation)
- `/event/*/pembayaran` (event donation payment page)

### Android assetlinks.json

**URL:** `https://eccchurch.global/.well-known/assetlinks.json`

**Delivery:** route handler di `apps/landing/src/app/api/well-known/assetlinks/route.ts` + rewrite.

**SHA-256 dari ENV (bisa rotate tanpa deploy code):**

```bash
ANDROID_ASSETLINKS_SHA256_UPLOAD="AA:BB:CC:...:FF"
ANDROID_ASSETLINKS_SHA256_PLAY="DD:EE:FF:...:AA"
```

Kalau env kosong → response return placeholder yang tidak valid (fail-safe untuk dev). **Production WAJIB set kedua env**.

**Response shape:**

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "idea.eccchurch.global",
      "sha256_cert_fingerprints": [
        "<upload key>",
        "<play app signing key>"
      ]
    }
  }
]
```

### Middleware whitelist

`apps/landing/src/middleware.ts` — `/.well-known/*` di-whitelist dari coming-soon rewrite, jadi tetap accessible walau `LANDING_MODE=coming-soon`.

### www subdomain

Nginx config existing sudah redirect `www.eccchurch.global` → `eccchurch.global` (dari session sebelumnya). AASA/assetlinks tetap accessible via redirect chain. Kalau Apple/Google strict butuh direct host, tambah symlink Nginx untuk `/.well-known/*` di www server block (bisa saya siapkan kalau perlu).

---

## Action Required dari Mobile Team

**Kirim 2 SHA-256 fingerprints via secure channel** (Signal/Slack DM):

**1. Upload key fingerprint** (dari mobile team local keystore):
```bash
keytool -list -v -keystore path/to/upload-key.keystore -alias upload | grep SHA256
```

Format: `AA:BB:CC:DD:EE:FF:...` (65 char, colons)

**2. Play App Signing key fingerprint** (dari Play Console):

Login Google Play Console → App → **Setup → App Integrity → App signing key certificate → SHA-256 certificate fingerprint** → Copy.

---

## Deploy Steps (BE)

**Setelah receive SHA-256:**

```bash
# 1. Set env di production
ssh root@187.77.118.85
cd /var/www/ecc-core-platform
nano .env
# Tambahkan (replace dgn value real):
#   ANDROID_ASSETLINKS_SHA256_UPLOAD=<UPLOAD_SHA256>
#   ANDROID_ASSETLINKS_SHA256_PLAY=<PLAY_SHA256>

# 2. Git pull + rebuild landing
git pull origin main
rm -rf apps/landing/.next
pnpm --filter @ecc/landing build 2>&1 | tail -10

# 3. Restart PM2
pm2 delete ecc-landing
pm2 start "pnpm --filter @ecc/landing start" --name ecc-landing
pm2 save
sleep 3

# 4. Verify
curl -sI https://eccchurch.global/.well-known/apple-app-site-association | head -3
# → HTTP/2 200, content-type: application/json

curl -s https://eccchurch.global/.well-known/apple-app-site-association | jq .
# → JSON with applinks.details[0].appID = RB94VQ27V3.idea.eccchurch.global

curl -sI https://eccchurch.global/.well-known/assetlinks.json | head -3
# → HTTP/2 200, content-type: application/json

curl -s https://eccchurch.global/.well-known/assetlinks.json | jq '.[0].target.sha256_cert_fingerprints'
# → 2 fingerprints (real, not placeholder)
```

---

## Testing (Mobile Side)

**iOS Universal Link:**
1. Deploy v2.1.0 build ke TestFlight
2. Install di iPhone (fresh install atau uninstall + reinstall — Universal Link verify hanya trigger saat install)
3. Buka Notes / Safari → type `https://eccchurch.global/event/{some-event-id}`
4. Long-press link → context menu → pilih "Open in Els App" (kalau AASA valid)
5. Atau tap link dari email/chat → langsung buka app tanpa dialog

Kalau tidak muncul opsi "Open in Els App":
- Delete app + reinstall (Universal Link cache stale)
- Cek AASA response dgn curl (Content-Type + JSON valid)
- Cek device console log via Xcode (search "swcd" untuk Universal Link errors)

**Android App Link:**
1. Deploy v2.1.0 ke Play Store internal testing
2. Install di Android device
3. Run:
   ```bash
   adb shell pm get-app-links idea.eccchurch.global
   ```
   Should show `verified` untuk `eccchurch.global` domain
4. Kalau `not verified` → check assetlinks.json (both fingerprints match APK signing)

**Fallback test:**
1. Uninstall app
2. Tap `https://eccchurch.global/event/xxx` → open di browser (bukan error)
3. Install app kembali → tap link lagi → open app

---

## Files Changed (BE)

- `apps/landing/src/app/api/well-known/aasa/route.ts` (NEW)
- `apps/landing/src/app/api/well-known/assetlinks/route.ts` (NEW)
- `apps/landing/next.config.mjs` — tambah rewrite `.well-known/*` → `/api/well-known/*`
- `apps/landing/src/middleware.ts` — whitelist `/.well-known/*` dari coming-soon rewrite
- `.env.example` — tambah `ANDROID_ASSETLINKS_SHA256_UPLOAD` + `_PLAY` + `LANDING_MODE`

---

## Post-Deploy Checklist

- [ ] Mobile supply SHA-256 fingerprints (2 pcs)
- [ ] BE set env di production `.env`
- [ ] Landing deploy (build + PM2 restart delete+start)
- [ ] Verify curl AASA + assetlinks response (200 + application/json + real fingerprints)
- [ ] Verify dengan Apple Universal Link tool (kalau perlu): https://search.developer.apple.com/appsearch-validation-tool
- [ ] Verify dengan Google Digital Asset Links tester: https://developers.google.com/digital-asset-links/tools/generator
- [ ] Mobile TestFlight/internal testing build → test end-to-end di real device

---

## Contact

- **BE:** Tim IDEA
- **Deploy target:** production `eccchurch.global` (landing)
- **Env vars:** production `.env`

Kirim SHA-256 fingerprints via Signal/Slack DM secure channel. Jangan taruh di git commit atau chat public.

---

*Doc versi: 1.0 — 2026-09-01.*
