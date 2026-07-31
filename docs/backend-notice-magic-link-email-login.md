# Backend Notice — Magic Link Email Login + Onboarding Wizard

**Dari:** Tim Backend ECC (IDEA)
**Untuk:** Tim Mobile (Ari)
**Tanggal:** 2026-07-28
**Status:** 🚀 **DEPLOYED PRODUCTION** per 2026-07-29 — semua 4 endpoint magic-link + onboarding wizard + session 365d live di `api.eccchurch.global`. SendGrid + deep link URL config aktif.
**Related:** [`backend-notice-shiftsoft-migration.md`](./backend-notice-shiftsoft-migration.md)

---

## TL;DR

3 fitur baru siap consume dari mobile:

1. **Magic Link Email Login** — jemaat login pakai email → dapat link ke inbox → klik → auto login. Untuk jemaat legacy dgn email valid tapi noHp missing/invalid.
2. **Onboarding Wizard Gate** — response login sekarang punya `user.needsOnboarding: boolean`. Kalau `true`, mobile route ke wizard first-login (mostly untuk 6736 legacy jemaat).
3. **Register form** — sekarang bisa terima `email` (optional field baru).

Plus infrastruktur:
- **Session extended ke 365 hari** (sliding refresh) — user active bulanan = effectively permanent login.
- **SendGrid integration** untuk email delivery.

---

## Konteks & Motivasi

Setelah migrate 6782 jemaat dari Shiftsoft:
- ~332 jemaat kena collision noHp/email → salah satu field di-null
- Banyak jemaat legacy `noHp` invalid (16-digit typo, dll) → gak bisa OTP WA login
- Tapi mayoritas punya `email` valid

Tanpa magic link, 500-1000 jemaat legacy stuck gak bisa login. Magic link = jalur recovery via email.

---

## Perubahan Schema

### `Jemaat` +1 field baru

| Field | Type | Deskripsi |
|---|---|---|
| `onboardedAt` | `DateTime?` | NULL = wizard belum selesai. Set otomatis saat POST /auth/register sukses (jemaat baru) atau POST /auth/onboarding/complete sukses (legacy jemaat). |

**Backfill state di production** (setelah deploy):
- 6736 legacy jemaat (`legacyShiftsoftId IS NOT NULL`) → `onboardedAt = NULL` → wizard triggered first login
- ~10 seed jemaat (Ari, Pastor, dll) → `onboardedAt = now()` (via migration backfill)
- Register baru → auto set now() di handler

### `MagicLinkToken` model baru

```prisma
model MagicLinkToken {
  id           String    // UUID
  jemaatId     String    // FK Jemaat
  email        String    // snapshot email
  token        String    // random 64-char hex, unique
  expiresAt    DateTime  // 15 menit dari created (configurable via env)
  usedAt       DateTime? // one-time use — reject subsequent verify
  requestedIp  String?   // audit
  createdAt    DateTime
}
```

- Token expire 15 menit (via `MAGIC_LINK_TTL_MINUTES` env)
- One-time use (reject reuse)
- Cascade delete kalau jemaat di-hapus

### `OtpPurpose` enum +1 value

Sekarang: `LOGIN` | `ENROLLMENT` | `RESET_FACE` | **`ONBOARDING_ADD_NOHP`** (baru).

`ONBOARDING_ADD_NOHP` dipakai wizard onboarding untuk set noHp baru (existing jemaat via magic link).

---

## Login Response Shape — UPDATED

Semua response login (`/auth/otp/verify`, `/auth/email/verify-magic-link`, `/auth/face/login`) sekarang punya field baru di `user`:

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 604800,
    "user": {
      "id": "uuid",
      "jemaatId": "uuid",
      "namaLengkap": "Budi Santoso",
      "noHp": "+6281234567890",
      "email": "budi@example.com",      // NEW — dari jemaat.email
      "isFulltimer": false,
      "canAccessPortal": false,
      "menuAccess": {...},
      "hasFaceEnrolled": false,
      "fotoUrl": "/uploads/...",
      "needsOnboarding": true,          // NEW — mobile route ke wizard kalau true
      "onboardingReason": {              // NEW — hint field yg missing (kalau needsOnboarding=true)
        "missingNoHp": true,
        "missingProfile": ["jenisKelamin", "tanggalLahir"]
      }
    }
  }
}
```

**Backward compat**: mobile lama yg ignore `needsOnboarding` tetap jalan (skip wizard). Tapi untuk 6736 legacy jemaat, mereka akan langsung ke main app dengan profile incomplete. Rekomendasi: mobile update untuk handle wizard.

---

## Endpoints Baru

### 1. Magic Link Login (3 endpoints)

#### `POST /auth/email/request-magic-link`

Request magic link ke email jemaat.

**Body:**
```json
{ "email": "budi@example.com" }
```

**Response 200 (always, anti-enumeration):**
```json
{
  "success": true,
  "message": "Kalau email terdaftar, link login sudah dikirim. Cek inbox Anda."
}
```

Response GENERIC — tidak leak apakah email exists di DB (protection dari account enumeration).

**Rate limit:** 5 request per 1 jam per IP.

**Email content:**
- Subject: "Login ke aplikasi ECC — link masuk Anda"
- Body: HTML branded (orange ECC gradient) + CTA button + expiry note
- URL: `EMAIL_MAGIC_LINK_MOBILE_URL?token=xxx` (default `ecc://auth/email/verify?token=xxx`)

#### `POST /auth/email/verify-magic-link`

Consume magic link token → issue JWT.

**Body:**
```json
{ "token": "abcd1234...64char-hex" }
```

**Response 200 — Success:**
Sama dengan OTP verify response (lihat "Login Response Shape" di atas).

**Errors:**
- `401 Unauthorized` — "Link tidak valid atau sudah kadaluarsa" (token not found, expired, atau already used)

**Rate limit:** 10 per 15 menit per IP.

**Token behavior:**
- One-time use — sekali verify, `usedAt = now()`. Retry same token = 401.
- Expire 15 menit dari created.

#### `POST /auth/email/resend-magic-link`

Alias dari request-magic-link — kalau user salah ketik email atau email hilang.

**Body:** Same as request-magic-link.
**Rate limit:** Same limiter (5 per 1 jam per IP shared).

### 2. Onboarding Wizard (2 endpoints)

#### `POST /auth/otp/request` — extend purpose

Existing endpoint, sekarang terima `purpose: "ONBOARDING_ADD_NOHP"`.

**Body:**
```json
{
  "noHp": "+6281234567890",
  "purpose": "ONBOARDING_ADD_NOHP"
}
```

Behavior khusus:
- Cek noHp belum dipakai jemaat lain (409 Conflict kalau ya)
- Kirim OTP WA seperti biasa

Response sama dengan OTP request lainnya:
```json
{ "success": true, "message": "OTP telah dikirim via WhatsApp" }
```

#### `POST /auth/otp/verify` — extend purpose

Existing endpoint, sekarang terima `purpose: "ONBOARDING_ADD_NOHP"`.

**⚠️ WAJIB kirim Authorization header** — Bearer JWT (dari magic link verify sebelumnya). Ini bedanya dari OTP verify normal.

**Headers:**
```
Authorization: Bearer <access-token dari magic link verify>
Content-Type: application/json
```

**Body:**
```json
{
  "noHp": "+6281234567890",
  "kode": "123456",
  "purpose": "ONBOARDING_ADD_NOHP"
}
```

Behavior khusus:
- Extract jemaatId dari JWT (bukan lookup by noHp)
- Verify OTP → set `Jemaat.noHp = noHp` untuk authenticated jemaat
- **TIDAK issue JWT baru** (user sudah punya)

**Response 200:**
```json
{
  "success": true,
  "message": "Nomor HP berhasil di-verify + di-set",
  "data": { "noHp": "+6281234567890" }
}
```

**Errors:**
- `401` — JWT invalid atau missing
- `401` — OTP salah / expired
- `409` — noHp sudah dipakai jemaat lain

#### `POST /auth/onboarding/complete`

Save profile fields + set `onboardedAt=now()`.

**Auth:** Requires JWT.
**Rate limit:** 20 per 15 menit per user.

**Body (semua field opsional):**
```json
{
  "namaLengkap": "Budi Santoso",
  "jenisKelamin": "L",
  "tanggalLahir": "1990-01-15",
  "alamat": "Jl. Sudirman No. 12",
  "cabangId": "uuid-cabang-baru",
  "email": "budi.new@example.com"
}
```

Field yg tidak di-set (undefined) di-skip. Untuk sekali submit final, mobile UI biasanya sudah collect semua field di wizard.

**Response 200:**
```json
{
  "success": true,
  "message": "Onboarding selesai",
  "data": {
    "id": "uuid",
    "namaLengkap": "...",
    "noHp": "...",
    "email": "...",
    "jenisKelamin": "L",
    "tanggalLahir": "1990-01-15",
    "alamat": "...",
    "cabangId": "uuid",
    "onboardedAt": "2026-07-28T..."
  }
}
```

**Idempotent** — kalau `onboardedAt` sudah NOT NULL (user re-submit wizard), field lain tetap ke-update tapi `onboardedAt` gak berubah.

---

## Mobile Flow Recommendations

### 1. Login Screen — 2 opsi

```
┌────────────────────────────┐
│  Login ke ECC              │
├────────────────────────────┤
│  [ 🔒 Nomor WhatsApp   ]   │  ← OTP existing
│  [ 📧 Email             ]   │  ← Magic Link BARU
└────────────────────────────┘
```

**Kalau pilih Email path:**
1. Input email → POST `/auth/email/request-magic-link`
2. Show screen: "Cek inbox lo untuk link login. [ Kirim ulang ]"
3. User click link di email → open app (via deeplink `ecc://auth/email/verify?token=xxx`)
4. App: POST `/auth/email/verify-magic-link` dengan token
5. Response 200: issue JWT + check `needsOnboarding`
   - `false` → main app
   - `true` → onboarding wizard

### 2. Onboarding Wizard — flow

Trigger: `user.needsOnboarding === true` dari login response.

**Step 1** — Kalau `onboardingReason.missingNoHp === true`:
- Input noHp → POST `/auth/otp/request` dengan `purpose: "ONBOARDING_ADD_NOHP"`
- Input OTP → POST `/auth/otp/verify` dengan `purpose: "ONBOARDING_ADD_NOHP"` + Bearer JWT
- Response 200 → lanjut step 2

Skip step 1 kalau `missingNoHp === false` (jemaat sudah punya noHp).

**Step 2** — Profile fields (single form):
- Nama lengkap (pre-fill dari user object, allow edit)
- Jenis Kelamin (L/P) — mandatory kalau di `missingProfile`
- Tanggal Lahir — mandatory kalau di `missingProfile`
- Alamat (optional)
- Cabang (allow change — dropdown dari /public/cabang)
- Email (allow set/edit kalau kosong)

**Submit** → POST `/auth/onboarding/complete` dengan body all fields → Response 200 → main app.

### 3. Deeplink Configuration (mobile side)

**Android** — `AndroidManifest.xml`:
```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="ecc" android:host="auth" />
</intent-filter>
```

**iOS** — `Info.plist`:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>ecc</string>
    </array>
  </dict>
</array>
```

Handle URL: `ecc://auth/email/verify?token=xxx` → extract token param → call verify endpoint.

### 4. Session Extended

- Access token TTL: **7 hari** (existing)
- Refresh token TTL: **365 hari** (baru, extended dari 30d)
- **Sliding rotation** — setiap `POST /auth/refresh`, refresh token baru dgn expiry +365 hari

**Effective**: user active bulanan → forever logged in. Only re-login required kalau idle > 365 hari OR explicit logout.

Mobile tidak perlu ubah apa-apa — logic sama, cuma lebih long-lived.

---

## Register Form — Update

**Field baru optional**:

```json
POST /auth/register
{
  "noHp": "+6281234567890",   // existing, required
  "namaLengkap": "...",         // existing, required
  "jenisKelamin": "L",          // existing, required
  "cabangId": "uuid",           // existing, required
  "email": "budi@example.com",  // NEW, OPTIONAL — disarankan
  "tanggalLahir": "1990-01-15", // existing, optional
  "alamat": "...",              // existing, optional
  "homecellId": "uuid",         // existing, optional
  "fotoBase64": "...",          // existing, optional
  "jenisJemaat": "JEMAAT_TETAP" // existing, optional
}
```

**Mobile UI nudge** di form register:
```
[ 📧 Email (opsional)          ]
   Disarankan — untuk login backup
   pakai magic link kalau HP hilang.
```

Register handler:
- Save `jemaat.email = input.email` kalau ada
- Set `jemaat.onboardedAt = now()` — new user skip wizard (data lengkap dari form)

---

## Env Vars Baru (BE only — mobile tidak perlu)

```env
SENDGRID_API_KEY=""                  # Get from https://sendgrid.com dashboard
EMAIL_FROM="noreply@eccchurch.global"
EMAIL_FROM_NAME="Elshaddai Creative Community"
EMAIL_MAGIC_LINK_MOBILE_URL="ecc://auth/email/verify"  # deeplink app
EMAIL_MAGIC_LINK_WEB_URL="https://portal.eccchurch.global/auth/email/verify"  # web fallback
MAGIC_LINK_TTL_MINUTES=15

# Session extended
JWT_REFRESH_EXPIRES_IN="365d"        # was 30d
```

---

## Testing (setelah deploy production)

Test flow end-to-end:

1. Ambil 1 jemaat legacy dengan email valid (mis. via Studio):
   ```sql
   SELECT id, nama_lengkap, email, no_hp
   FROM jemaat
   WHERE email IS NOT NULL AND legacy_shiftsoft_id IS NOT NULL
   LIMIT 5;
   ```
2. Request magic link:
   ```
   curl -X POST https://api.eccchurch.global/auth/email/request-magic-link \
     -H "Content-Type: application/json" \
     -d '{"email":"<email-jemaat>"}'
   ```
3. Cek inbox — klik link → grab token dari URL
4. Verify:
   ```
   curl -X POST https://api.eccchurch.global/auth/email/verify-magic-link \
     -H "Content-Type: application/json" \
     -d '{"token":"<token-dari-email>"}'
   ```
5. Response: JWT + `user.needsOnboarding: true` (kalau legacy)
6. Test onboarding complete via JWT:
   ```
   curl -X POST https://api.eccchurch.global/auth/onboarding/complete \
     -H "Authorization: Bearer <JWT>" \
     -H "Content-Type: application/json" \
     -d '{"jenisKelamin":"L","tanggalLahir":"1990-01-15"}'
   ```

---

## Action Items untuk Mobile

- [ ] Tambah UI "Login dengan Email" di login screen (button + form)
- [ ] Handle deeplink `ecc://auth/email/verify?token=xxx`
- [ ] Update login response handler — cek `user.needsOnboarding`
- [ ] Build onboarding wizard multi-step:
  - Step 1: Add noHp (kalau missing) via OTP flow
  - Step 2: Profile fields form
  - Submit → complete-onboarding
- [ ] Register form — tambah field email (optional)
- [ ] Testing (Android + iOS) — deeplink + email delivery
- [ ] (Optional) Update user profile page tampil `email` field

---

## Contact + Follow-up

- **BE team:** IDEA dev (ping via ECC repo issue atau langsung)
- **Related docs:**
  - `backend-notice-shiftsoft-migration.md` — 6736 legacy jemaat data
  - `backend-request-face-login-deprecation.md` — related auth cleanup

Kalau ada request/questions, kirim `backend-request-*.md` di folder ini.

---

*Doc versi: 1.1 — 2026-07-29. Update log: v1.1 status DEPLOYED PRODUCTION.*

---

## Sample test end-to-end (prod live)

```bash
# 1. Request magic link ke email jemaat legacy yang punya email valid
curl -X POST https://api.eccchurch.global/auth/email/request-magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"<email-jemaat>"}'
# Expect: {"success":true,"message":"Kalau email terdaftar..."}
# Cek inbox — link akan datang dari noreply@eccchurch.global

# 2. Extract token dari email URL (format: ecc://auth/email/verify?token=xxx)
TOKEN="paste-64char-hex-here"

# 3. Verify → dapat JWT
curl -X POST https://api.eccchurch.global/auth/email/verify-magic-link \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\"}"
# Expect: {"success":true, "data":{"accessToken":"...", "user":{"needsOnboarding":true|false, ...}}}
```

Test di dev/staging: sama pattern, cuma ganti host. Kalau `needsOnboarding=true` → route ke wizard, panggil `POST /auth/onboarding/complete` untuk selesaikan.
