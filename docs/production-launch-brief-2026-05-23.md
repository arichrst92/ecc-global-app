# Backend Handoff: Portal Production Live — API Migration

**Untuk**: Mobile dev (Ari Christian)
**Dari**: Tim Backend ECC
**Tanggal**: 2026-05-23
**Priority**: 🔴 **HIGH** — semua build mobile yang akan di-distribute harus pakai endpoint baru
**Status**: ✅ **LIVE** — backend + portal sudah running di production

---

## TL;DR

**Portal admin + Core API ECC sudah live di production.** Domain `eccchurch.global` (3 huruf 'c', registered di Namecheap).

| Service          | Production URL                        | Sebelumnya (dev)        |
|------------------|---------------------------------------|-------------------------|
| Core API         | `https://api.eccchurch.global`        | `http://localhost:4100` atau `http://<LAN-IP>:4100` |
| Portal admin     | `https://portal.eccchurch.global`     | `http://localhost:3100` |
| Static uploads   | `https://api.eccchurch.global/uploads/*` | `http://localhost:4100/uploads/*` |
| API docs         | `https://api.eccchurch.global/docs`   | `http://localhost:4100/docs` |

**Yang harus dilakukan mobile:**
1. Update `baseURL` di production build → `https://api.eccchurch.global`
2. Dev/staging build tetap bisa pakai LAN IP / localhost (no change)
3. Test login, OTP, face login, semua fitur jemaat-facing di production endpoint
4. Submit build ke TestFlight / Play Console internal track dulu sebelum public release

**TIDAK ada breaking API contract change.** Semua endpoint, response shape, dan auth flow sama persis dengan dev environment. Cuma URL yang berubah dari `localhost` → production domain.

---

## 1. Configuration Update — Mobile App

### 1.1 Pattern recommended — environment-aware baseURL

Pakai env file Expo / app.config supaya bisa switch antara dev/staging/prod tanpa edit code:

```typescript
// app.config.ts (atau eas.json untuk EAS build profiles)
export default {
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  },
};
```

```bash
# .env.development (dev local)
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:4100

# .env.production (production build)
EXPO_PUBLIC_API_BASE_URL=https://api.eccchurch.global
```

### 1.2 Konsumsi di app code

```typescript
// lib/api.ts
import Constants from 'expo-constants';

const apiBaseUrl =
  Constants.expoConfig?.extra?.apiBaseUrl ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  'http://localhost:4100'; // dev fallback

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  // ... existing config
});
```

### 1.3 EAS Build profiles

```json
// eas.json
{
  "build": {
    "development": {
      "env": { "EXPO_PUBLIC_API_BASE_URL": "http://192.168.1.10:4100" }
    },
    "preview": {
      "env": { "EXPO_PUBLIC_API_BASE_URL": "https://api.eccchurch.global" }
    },
    "production": {
      "env": { "EXPO_PUBLIC_API_BASE_URL": "https://api.eccchurch.global" }
    }
  }
}
```

---

## 2. URL References yang Berubah

### 2.1 API endpoints — direct replace

Semua hit ke `localhost:4100` di code mobile → `https://api.eccchurch.global`. Contoh transformasi:

```diff
- http://localhost:4100/auth/otp/request
+ https://api.eccchurch.global/auth/otp/request

- http://localhost:4100/admin/jemaat
+ https://api.eccchurch.global/admin/jemaat

- http://192.168.1.10:4100/auth/face-login
+ https://api.eccchurch.global/auth/face-login
```

### 2.2 Image URLs dari backend response

Backend response (mis. `GET /admin/jemaat/:id`) sekarang return `fotoUrl` dengan domain produksi:

```json
{
  "id": "uuid-xxx",
  "namaLengkap": "Budi Santoso",
  "fotoUrl": "https://api.eccchurch.global/uploads/profiles/jemaat/uuid-xxx.webp"
}
```

Sebelumnya di dev mungkin return:
```json
{ "fotoUrl": "http://localhost:4100/uploads/profiles/jemaat/uuid-xxx.webp" }
```

**Mobile tidak perlu transformasi** — URL dari backend sudah lengkap absolute. Tinggal pass ke `<Image source={{ uri: fotoUrl }} />`.

### 2.3 Pdf / legal documents

Sama — backend return absolute URL ke production domain:

```json
{
  "title": "Privacy Policy",
  "pdfUrl": "https://api.eccchurch.global/uploads/legal/privacy-2026.pdf"
}
```

---

## 3. SSL / HTTPS Considerations

### 3.1 Certificate

- **Issuer**: Let's Encrypt
- **Expire**: 2026-08-21 (auto-renew aktif via certbot.timer 2x daily)
- **Both subdomain covered**: `portal.eccchurch.global` + `api.eccchurch.global`

### 3.2 Mobile platform considerations

**iOS (App Transport Security):**
- HTTPS dengan valid CA-signed cert (Let's Encrypt qualified) — **no special config needed**
- Tidak perlu `NSAllowsArbitraryLoads` exception
- ATS default behavior sudah accept

**Android:**
- Network security config default sudah accept HTTPS dengan trusted CA — **no special config**
- Kalau pakai `react-native` (bukan Expo managed) dan punya custom `network_security_config.xml`, pastikan tidak block production domain

**Expo Go (dev):**
- Tetap bisa hit production API dari Expo Go untuk testing (CORS sudah allow mobile fetch via no-origin)
- Tapi untuk test face login / camera — perlu dev build, bukan Expo Go (face-api.js native module)

### 3.3 Test HTTPS dari device

```bash
# Dari terminal di Mac (verify connectivity)
curl https://api.eccchurch.global/health
# Expected: {"status":"ok","service":"core-api","timestamp":"..."}

# Dari mobile device (verify dari aplikasi)
# Open Expo Go → fetch test endpoint
```

---

## 4. Backward Compatibility & Deprecation

### 4.1 Dev environment TIDAK berubah

- `localhost:4100` / LAN IP `:4100` tetap accessible kalau backend dev jalan lokal
- Dev/staging build mobile tetap bisa pakai env yang sama
- TIDAK perlu force migrate semua build

### 4.2 Production release strategy

Recommended:
1. **Build production** dengan `EXPO_PUBLIC_API_BASE_URL=https://api.eccchurch.global`
2. **TestFlight (iOS) / Play internal track (Android)** dulu — 1 minggu soak
3. Verify dengan beta tester (10-20 jemaat) sebelum public release
4. Setelah stable, push ke App Store + Play Store production

### 4.3 Force update strategy

Backend punya fitur **App Version Check** (sudah deployed):

```http
GET /public/app-version
```

Mobile call endpoint ini di splash:
- Kalau response `minSupportedVersion > currentVersion` → tampilkan modal "Update required" + link ke store
- Kalau response `latestVersion > currentVersion` (tapi minSupported masih OK) → tampilkan banner "Update available"

Admin bisa update min version via portal **App Settings → App Versions** kalau perlu force user migrate ke build baru yang pakai production URL.

---

## 5. Maintenance Mode — Production Coordination

Backend punya fitur **Maintenance Mode** (lihat `backend-request-maintenance-mode.md` untuk detail). Saat di-enable via portal admin:

- `GET /public/maintenance` return `{ isEnabled: true, message, estimatedEndAt }`
- Mobile harus poll endpoint ini di splash + periodic (mis. setiap 60 detik)
- Render full-screen modal "Sedang maintenance" blocking semua action

**Use case production:**
- Backend ECC akan enable maintenance mode sebelum deploy major migration
- Mobile yang sudah polling → otomatis blocked, user lihat pesan
- Setelah deploy selesai → admin disable, mobile next poll auto-unblock

**Kalau belum implement maintenance modal di mobile**, tolong prioritaskan sebelum production release. Ini critical untuk safe deploy production ke depan.

---

## 6. Login & Auth — Test Checklist

Semua flow auth harus di-test di production endpoint sebelum release:

- [ ] **OTP signup** — `POST /auth/otp/request { purpose: 'ENROLLMENT' }` → terima WhatsApp dari Fonnte → `POST /auth/otp/verify` → `POST /auth/register`
- [ ] **OTP login** — `POST /auth/otp/request { purpose: 'LOGIN' }` → verify → JWT issued
- [ ] **Face login** — login pertama, kemudian try face-login dari device lain (test cross-device biometric)
- [ ] **Liveness gate** — face login dengan signed nonce HMAC (lihat `backend-request-liveness-nonce.md`)
- [ ] **JWT refresh** — token expire setelah 7 hari → refresh token auto-renew
- [ ] **Logout** — token invalidated di server (refresh token table)
- [ ] **Delete account** — `DELETE /admin/me` → confirm jemaat soft-deleted (deactivatedAt set), login berikutnya rejected
- [ ] **WhatsApp delivery** — verify pesan masuk dengan footer "Powered by IDEA (https://ide.asia)"

---

## 7. CORS — Production Allow List

Backend production set:

```
CORS_ALLOWED_ORIGINS="https://portal.eccchurch.global"
```

**Mobile fetch (RN/Expo)** biasanya tanpa `Origin` header → backend auto-allow (lihat `apps/core-api/src/app.ts:55`). Tidak perlu masuk allow list.

**Kalau ke depan ada web companion** dari mobile (mis. share link target ke webpage), domain web-nya perlu di-tambah ke `CORS_ALLOWED_ORIGINS`.

---

## 8. Rate Limiting — Production Settings

Backend pakai `express-rate-limit` dengan trust proxy untuk Nginx X-Forwarded-For. Limit per IP:

| Endpoint group        | Limit                     |
|-----------------------|---------------------------|
| `/auth/otp/request`   | 5 / menit / IP            |
| `/auth/otp/verify`    | 10 / menit / IP           |
| `/auth/cabang`        | 30 / menit / IP (public)  |
| `/admin/*`            | 100 / menit / IP per user |
| `/upload/*`           | 20 / menit / IP per user  |
| `/api/v1/*` (public)  | 60 / menit / API key      |

Mobile sebaiknya implement client-side throttle juga (debounce request, queue retry dengan backoff) supaya tidak hit limit saat user impatient tap berkali-kali.

---

## 9. Troubleshooting Production Issues

### 9.1 `ERR_CONNECTION_REFUSED` / `NETWORK_ERROR`

- ✅ Cek `apiBaseUrl` di app config — pastikan production build pakai `https://api.eccchurch.global`
- ✅ Cek device internet connection
- ✅ Cek `curl https://api.eccchurch.global/health` dari Mac — kalau 200, backend OK; kalau timeout, backend down (escalate ke backend team)

### 9.2 SSL handshake fail

- Sangat rare dengan Let's Encrypt. Kalau muncul:
  - Cek device tanggal/waktu — kalau drift > 24 jam, SSL cert validation gagal
  - Escalate kalau persistent di device dengan tanggal benar

### 9.3 Image broken di production

- Backend return `fotoUrl` lengkap — pastikan tidak ada transformasi di mobile yang strip protocol
- Test direct: paste `fotoUrl` ke browser, harus muncul gambar

### 9.4 OTP tidak ke-terima WhatsApp

- Backend pakai Fonnte gateway (paid service)
- Cek log di backend: `pm2 logs ecc-core-api` di VPS
- Atau lihat **Server Health** menu di portal → ada section status Fonnte

### 9.5 Cara escalate ke backend

Kalau issue tidak ke-resolve dari sisi mobile:
- Buat file `backend-request-<topic>.md` di `docs/`
- Mention symptom, reproduce steps, device info, screenshot kalau bisa
- Tag prioritas (🔴 high / 🟡 medium / 🟢 low)

---

## 10. Action Items — Mobile Side

### Mandatory (sebelum public release)

- [ ] Update `EXPO_PUBLIC_API_BASE_URL` di production EAS profile → `https://api.eccchurch.global`
- [ ] Build production via `eas build --profile production --platform all`
- [ ] Test login flow end-to-end di TestFlight + Play internal track
- [ ] Verify image upload + display di profile + content (news/renungan/event)
- [ ] Test face login dengan device different dari registration device
- [ ] Implement maintenance mode modal (kalau belum) — polling `GET /public/maintenance`
- [ ] Implement version check (kalau belum) — splash call `GET /public/app-version`

### Recommended (post-release improvements)

- [ ] Bump build version + submit ke store dengan release notes
- [ ] Update API documentation di repo mobile kalau pakai swagger/postman → swap baseURL
- [ ] Setup error reporting (Sentry?) untuk monitor production issue
- [ ] Implement retry strategy dengan exponential backoff untuk network errors

### Nice-to-have

- [ ] Cache `/public/cabang` (24 jam local store) — already recommended di `backend-request-cabang-list.md`
- [ ] Pre-warm splash dengan `/public/app-version` + `/public/maintenance` parallel request
- [ ] Implement offline mode fallback untuk read-only data (jemaat profile, last ibadah)

---

## 11. Future-Proofing — Heads Up

Beberapa hal yang akan datang dari backend (sudah deployed tapi mungkin belum semua di-consume mobile):

1. **Visit feature** (peer-to-peer scan QR) — endpoint ready, mobile UI belum di-update
2. **Local Market / Local Business** — UMKM directory, browse + create dari mobile
3. **Credential Vault** — admin-only fitur, tidak relevan untuk mobile
4. **Audit Log retention** — auto-purge >365 hari, tidak impact mobile
5. **WA reminder** — auto-send H-1 reminder untuk ibadah + event, tidak perlu mobile action

Untuk detail tiap fitur, lihat docs di `/Users/idea/Projects/ecc-mobile-app/docs/backend-request-*.md`.

---

## 12. Kontak

| Role                | Email                  | Notes                          |
|---------------------|------------------------|--------------------------------|
| Mobile dev          | arichrst@ide.asia      | Ari Christian                  |
| Backend dev (Claude)| via session ini        | Tim Backend ECC (PT IDEA)      |
| Certbot admin       | arichrst@ide.asia      | Email untuk Let's Encrypt cert notice |
| Domain owner        | Namecheap account ECC  | Renew tahunan, set auto-renew kalau belum |

---

*Brief ini di-update kalau ada perubahan production setup. Source of truth: `knowledge-base.md` section 27 + `docs/future-changes-deploy-workflow.md` di repo `ecc-core-platform`.*
