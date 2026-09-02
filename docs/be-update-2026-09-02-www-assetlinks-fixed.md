# BE Update — www Subdomain assetlinks.json + AASA Direct Serve

**Dari:** Tim Backend ECC (IDEA)
**Untuk:** Tim Mobile (Ari)
**Tanggal:** 2026-09-02
**Reply ke:** `backend-request-www-assetlinks-no-redirect.md`

---

## Status

✅ **FIXED & VERIFIED** — kedua endpoint di www subdomain sekarang serve direct HTTP/1.1 200 tanpa redirect. Google Digital Asset Links verifier PASS.

---

## Fix Applied

**Nginx config** (`/etc/nginx/sites-available/eccchurch.global`) — server block `www.eccchurch.global` port 443 di-refactor:

```nginx
server {
  server_name www.eccchurch.global;

  # Universal Links / App Links — direct serve, JANGAN redirect
  location = /.well-known/apple-app-site-association {
    proxy_pass http://127.0.0.1:3200;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location = /.well-known/assetlinks.json {
    proxy_pass http://127.0.0.1:3200;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Catch-all: redirect ke apex
  location / {
    return 301 https://eccchurch.global$request_uri;
  }

  listen [::]:443 ssl;
  listen 443 ssl;
  ...
}
```

**Kunci fix:** `return 301` dipindah dari server scope ke `location / { }` supaya `location = /.well-known/*` (exact match) tidak ter-intercept redirect.

Bonus: juga cleanup file backup `eccchurch.global.bak-*` yg tercecer di `/etc/nginx/sites-enabled/` (bikin `conflicting server name` warning + first-block-wins bug).

---

## Verify Results

```bash
# www subdomain — direct 200
$ curl -sI "https://www.eccchurch.global/.well-known/assetlinks.json"
HTTP/1.1 200 OK
Content-Type: application/json
cache-control: public, max-age=3600

$ curl -sI "https://www.eccchurch.global/.well-known/apple-app-site-association"
HTTP/1.1 200 OK
Content-Type: application/json

# Apex — tetap 200 (unchanged)
$ curl -sI "https://eccchurch.global/.well-known/assetlinks.json"
HTTP/1.1 200 OK

$ curl -sI "https://eccchurch.global/.well-known/apple-app-site-association"
HTTP/1.1 200 OK

# Google Digital Asset Links verifier — PASS untuk www
$ curl -s "https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://www.eccchurch.global&relation=delegate_permission/common.handle_all_urls" | jq .
{
  "statements": [
    { "target": { "androidApp": { "packageName": "idea.eccchurch.global", "certificate": { "sha256Fingerprint": "7B:77:...:2B" }}}},
    { "target": { "androidApp": { "packageName": "idea.eccchurch.global", "certificate": { "sha256Fingerprint": "51:C7:...:64" }}}}
  ],
  "maxAge": "3599s"
}
# ✅ NO errorCode — verification pass
```

Catch-all redirect untuk path lain masih jalan:
```
https://www.eccchurch.global/  →  301 https://eccchurch.global/
https://www.eccchurch.global/tentang  →  301 https://eccchurch.global/tentang
```

---

## Mobile Team Next Steps

### Android

**Trigger Play Console re-verify:**
1. Play Console → Els App → **Grow → Deep Links → App configuration**
2. Untuk tiap failed row (5 paths × 2 hosts = 10 entries), click **Verify domain**
3. Status akan berubah ke ✅ **Verified** dalam 1-24 jam
4. Existing installs auto re-verify saat next app update atau OS periodic check (~monthly)

**adb sanity check** setelah verify pass:
```bash
adb shell pm get-app-links idea.eccchurch.global
# Expected:
#   eccchurch.global      : verified
#   www.eccchurch.global  : verified
```

### iOS

**Fresh install** v2.2.4+ (Universal Link verification hanya trigger saat install baru):
1. Tap `https://www.eccchurch.global/event/{event-id}` dari Notes / Mail
2. Expected: langsung buka Els App tanpa dialog "Open in App?"

**Apple validator (browser):**
- https://search.developer.apple.com/appsearch-validation-tool
- Input `https://www.eccchurch.global` → validate AASA response

---

## Non-Breaking

- Apex domain endpoints tidak berubah, tetap 200 direct
- Existing v2.2.3 tidak break — cuma Play Console verification status yg berubah dari Failed → Verified
- iOS Universal Links yg sudah verified untuk apex tetap jalan; extend ke www otomatis after next install/OS check

---

## Timeline

- **BE fix:** ✅ 2026-09-02 (nginx config edit + reload)
- **Mobile Play Console re-verify:** trigger manual, ~24 jam propagate
- **v2.2.4 iOS TestFlight:** fresh install test setelah cache stale

---

## Contact

- **BE:** Tim IDEA
- **Config file:** `/etc/nginx/sites-available/eccchurch.global`
- **Ref request:** `backend-request-www-assetlinks-no-redirect.md`

Kabari kalau Play Console verify masih fail setelah 24 jam atau ada issue lain.

---

*Doc versi: 1.0 — 2026-09-02.*
