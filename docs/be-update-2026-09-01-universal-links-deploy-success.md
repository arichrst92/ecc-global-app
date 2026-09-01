# BE Update — Universal Links DEPLOYED & VERIFIED

**Dari:** Tim Backend ECC (IDEA)
**Untuk:** Tim Mobile (Ari)
**Tanggal:** 2026-09-01 23:26 WIB
**Reply ke:**
- `backend-request-universal-links-aasa-assetlinks.md`
- `be-update-2026-09-01-universal-links-hosted.md` (code delivery)

---

## Status

✅ **DEPLOYED & VERIFIED** — kedua endpoint live di production dgn kedua SHA-256 fingerprint dari mobile team.

---

## Live Verification

### iOS AASA

```
GET https://eccchurch.global/.well-known/apple-app-site-association
→ HTTP/1.1 200 OK
→ Content-Type: application/json
```

Response:
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

### Android assetlinks.json

```
GET https://eccchurch.global/.well-known/assetlinks.json
→ HTTP/1.1 200 OK
→ Content-Type: application/json
```

SHA-256 fingerprints registered:
```json
[
  "7B:77:14:62:87:AD:35:1B:8A:15:6A:77:F0:66:83:47:AF:4D:25:76:6A:83:4C:85:30:1A:CD:88:DF:24:23:2B",
  "51:C7:A1:51:1C:81:C5:B3:96:25:0A:19:0E:EF:F5:AD:AF:05:9D:00:37:25:6F:60:AA:9B:13:A5:F1:44:A5:64"
]
```

Full response:
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "idea.eccchurch.global",
      "sha256_cert_fingerprints": [
        "7B:77:14:62:87:AD:35:1B:8A:15:6A:77:F0:66:83:47:AF:4D:25:76:6A:83:4C:85:30:1A:CD:88:DF:24:23:2B",
        "51:C7:A1:51:1C:81:C5:B3:96:25:0A:19:0E:EF:F5:AD:AF:05:9D:00:37:25:6F:60:AA:9B:13:A5:F1:44:A5:64"
      ]
    }
  }
]
```

---

## Action Mobile Team — Testing

### iOS (v2.1.0 TestFlight)

1. Fresh install (uninstall + reinstall — Universal Link verification hanya trigger saat install baru)
2. Buka Notes/Safari/Mail → type/tap `https://eccchurch.global/event/{event-id}`
3. **Expected:** langsung buka Els App tanpa dialog "Open in App?"
4. Long-press link → context menu → "Open in Els App" option harus muncul

**Kalau tidak buka app:**
- Delete app + reinstall (Universal Link cache stale)
- Check device console via Xcode → search log "swcd" untuk Universal Link errors
- Verify AASA lagi dgn Apple tool: https://search.developer.apple.com/appsearch-validation-tool

### Android (v2.1.0 internal testing)

1. Install dari Play Store internal track
2. Run:
   ```bash
   adb shell pm get-app-links idea.eccchurch.global
   ```
   **Expected:** `eccchurch.global` → **verified**
3. Tap `https://eccchurch.global/event/xxx` dari Gmail/WhatsApp/dll → langsung buka app

**Kalau `not verified`:**
- Confirm APK yg di-install pakai key yg SHA-256-nya ada di assetlinks
- Check Play Console → App Integrity → SHA-256 harus sama
- Google Digital Asset Links tester: https://developers.google.com/digital-asset-links/tools/generator

### Fallback (app tidak installed)

- Tap `https://eccchurch.global/event/xxx` → harus open Safari/Chrome (bukan error)
- Install app → tap ulang → buka app

---

## Compliance URLs (Stay in Browser)

Sesuai Apple 3.2.2(iv) — path exclusion di AASA membuat URL berikut **TIDAK** buka app, tetap open di Safari/Chrome:

- `https://eccchurch.global/persembahan` — index cabang selector
- `https://eccchurch.global/persembahan/{kode}` — detail per cabang
- `https://eccchurch.global/event/{id}/pembayaran` — event donation payment page

Verify di iOS: long-press URL `/persembahan/BDG` → context menu **TIDAK** boleh muncul "Open in Els App". Kalau muncul → exclusion tidak jalan → cek AASA path rule.

---

## Deploy Summary (BE)

- Code: `apps/landing/src/app/api/well-known/{aasa,assetlinks}/route.ts`
- Rewrite: `next.config.mjs` — `.well-known/*` → `/api/well-known/*`
- Middleware: `.well-known/*` whitelisted dari coming-soon mode
- Env production `.env`:
  - `ANDROID_ASSETLINKS_SHA256_UPLOAD=7B:...:2B`
  - `ANDROID_ASSETLINKS_SHA256_PLAY=51:...:64`
- PM2 `ecc-landing` restarted dgn fresh env — `Ready in 347ms`

Nginx TLS + www→apex redirect existing — tidak butuh perubahan.

---

## Next Steps

- [ ] Mobile team run test iOS + Android sesuai section testing
- [ ] Kalau lolos → v2.1.0 promote ke production release (App Store + Play Store)
- [ ] Sprint 8 Universal Links closed

---

## Contact

- **BE:** Tim IDEA
- **Ref request:** `backend-request-universal-links-aasa-assetlinks.md`
- **AASA URL:** https://eccchurch.global/.well-known/apple-app-site-association
- **assetlinks URL:** https://eccchurch.global/.well-known/assetlinks.json

Kalau QA menemukan issue post-deployment, reply doc ini.

---

*Doc versi: 1.0 — 2026-09-01.*
