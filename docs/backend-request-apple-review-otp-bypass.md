# Backend Request — Apple Review OTP Bypass

**Dari:** Tim Mobile (Ari)
**Untuk:** Tim Backend ECC (IDEA)
**Tanggal:** 2026-08-30
**Priority:** 🔴 URGENT — blocking App Store approval (v1.0.0 rejected)
**Status BE:** ✅ **DELIVERED 2026-08-30** — code merged, waiting deploy VPS + reviewer jemaat register.
**Related:**
- Apple rejection: Guideline 2.1 - Information Needed (2026-08-29)
- Reviewer feedback: "We were unable to sign in when magic link was unresponsive when tapped"
- Review Environment: iPad Air 11-inch (M3), iPadOS 27 beta, version 1.0.0 (4)

---

## TL;DR

Apple reviewer tidak bisa login karena **magic link `ecc://` di-block oleh iPadOS 27 beta email clients**. Solusi jangka pendek: setup **static WhatsApp OTP bypass** untuk 1 nomor test khusus yang akan di-share ke Apple sebagai demo account.

Tanpa fix ini, app iOS tidak akan lolos review → tidak bisa live di App Store.

**Effort BE estimate:** ~30-60 menit (add hardcoded bypass + register jemaat account).

---

## Context: Apple Rejection

Apple review email (2026-08-29):

> **Guideline 2.1 - Information Needed**
>
> We were unable to sign in when magic link was unresponsive when tapped.
>
> To avoid delays, it is essential to provide access to the app's full features
> and functionality with every submission.
>
> **Next Steps:** Provide the username and password for a valid demo account
> in App Store Connect that provides full access to the app's features and
> functionality or include a demonstration mode that shows all of the features
> and functionality available in the app.

Root cause: custom URL scheme `ecc://` di magic link email di-block oleh Apple Mail di iPadOS 27 beta (security tightening). Reviewer tap link → nothing happens → mereka tandai app broken.

Universal Links = proper solution jangka panjang, tapi butuh coordinated migration (mobile Android + iOS + BE hosting AASA/assetlinks). Estimated effort 1-2 hari, tidak realistis untuk resolve iOS submission cepat.

**Solusi immediate:** provide WhatsApp OTP method dgn static bypass — reviewer skip WA send entirely + langsung enter hardcoded OTP.

---

## Request Detail

### 1. Static OTP Bypass di Auth Handler

**File affected (estimated):** `apps/core-api/src/routes/auth/otp.ts` (atau file handler OTP request/verify)

**Add constants:**
```typescript
// Reviewer bypass — DO NOT REMOVE tanpa notif tim mobile
// Purpose: Apple/Google App Review reviewers tidak bisa terima WhatsApp OTP
// karena mereka pakai iPad review device (bukan phone dgn WA installed) +
// nomor Indonesia
const APP_REVIEW_BYPASS_NUMBERS = ['+6281805807807'];
const APP_REVIEW_BYPASS_OTP = '123456';
```

**Modify OTP request handler** (`POST /auth/otp/request`):
```typescript
// Sebelum trigger actual WA send:
if (APP_REVIEW_BYPASS_NUMBERS.includes(noHp)) {
  // Skip WA send — log entry for audit
  logger.info('app-review-otp-bypass-request', { noHp });
  return res.json({
    success: true,
    data: {
      message: 'OTP sent successfully',
      expiresIn: 300, // pura-pura 5 menit
    },
  });
}

// Normal flow — real WA send
await whatsappService.sendOtp(noHp, generatedOtp);
```

**Modify OTP verify handler** (`POST /auth/otp/verify`):
```typescript
if (APP_REVIEW_BYPASS_NUMBERS.includes(noHp) && otp === APP_REVIEW_BYPASS_OTP) {
  // Skip OTP validation, issue JWT langsung
  const jemaat = await prisma.jemaat.findUnique({ where: { noHp } });
  if (!jemaat) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Reviewer account not registered — contact BE team',
      },
    });
  }
  logger.info('app-review-otp-bypass-verify', { noHp, jemaatId: jemaat.id });
  return issueAuthTokens(jemaat); // Same helper yg dipakai flow normal
}

// Normal flow — validate stored OTP
const storedOtp = await getStoredOtp(noHp);
if (storedOtp !== otp) {
  return res.status(401).json({ /* invalid */ });
}
// ...
```

### 2. Register Reviewer Jemaat Account

Setup jemaat baru di production DB dgn data berikut:

| Field | Value |
|---|---|
| **noHp** | `+6281805807807` |
| **namaLengkap** | `Apple Reviewer` |
| **email** | `apple-review@eccchurch.global` (optional, kalau butuh) |
| **cabang** | Cabang pusat (mis. Jakarta / whichever cabang default) |
| **jenisKelamin** | `L` |
| **tanggalLahir** | `1990-01-01` (dummy) |
| **role/level** | Member biasa (**bukan admin/PIC**) — supaya reviewer test as regular jemaat |
| **isActive** | `true` |
| **isDependent** | `false` |

Bisa lewat:
- Portal admin `/admin/jemaat/new` (kalau ada UI create)
- Direct DB seed script
- Prisma studio manual insert

**Verify setelah setup:**
```bash
curl -X POST https://api.eccchurch.global/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"noHp":"+6281805807807"}'
# Expected: 200 { success: true, message: "OTP sent" }
# WA tidak di-send (bypass hit)

curl -X POST https://api.eccchurch.global/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"noHp":"+6281805807807","otp":"123456"}'
# Expected: 200 { success: true, data: { accessToken, refreshToken, user } }
```

### 3. Audit Trail

Log setiap kali bypass hit, supaya security team tahu berapa sering dipakai + siapa yang trigger:

```typescript
logger.info('app-review-otp-bypass', {
  event: 'request' | 'verify',
  noHp: '+6281805807807',
  timestamp: new Date().toISOString(),
  userAgent: req.headers['user-agent'],
  ip: req.ip,
});
```

**Optional:** kirim Slack alert ke channel `#security` setiap kali bypass hit → visibility.

---

## Timeline

- **BE deliver:** ASAP (ideally today) — apps iOS masih menunggu Apple response
- **Mobile action after BE deploy:** reply Apple Review dgn credentials + wait re-review (24-48 jam)
- **Long-term:** Universal Links migration (mobile Android + iOS + BE hosting) — planned Sprint 7

---

## Security Considerations

- **Static OTP `123456` sangat weak** — tapi hanya applicable ke **1 nomor spesifik** (`+6281805807807`) yang di-hardcode di allowlist. Nomor lain tetap butuh real WhatsApp OTP.
- Nomor `+6281805807807` **jangan diberikan** ke user real / production access — reservasi khusus untuk App/Play Store reviewers.
- Bypass ini bisa di-remove kapan saja setelah Universal Links live (Sprint 7).
- Kalau khawatir security audit compliance:
  - Store bypass config di ENV variable (bukan hardcoded), mudah rotate/disable
  - Rate limit khusus untuk bypass numbers (mis. max 20 request/hari)
  - Auto-expire bypass setelah 90 hari kalau tidak dipakai

**Trade-off:** kalau tidak setup bypass → iOS tidak bisa live di App Store.

---

## Alternative kalau BE tidak bisa modify auth handler

**Fallback plan:**
- Setup jemaat account dgn WA nomor **real** yang tim BE control (mis. WA Business dgn SIM tersedia di kantor IDEA)
- Setiap kali Apple reviewer request OTP → tim BE monitor WA device tsb + reply Apple dgn OTP code yg diterima
- Trade-off: butuh coordinated timing (Apple review bisa test kapan saja dalam 24-48 jam window setelah re-submit)

---

## Confirm sebelum deploy

- [ ] Nomor `+6281805807807` sudah register sebagai jemaat aktif di production
- [x] Bypass code merged di `apps/core-api/src/routes/auth.ts` (2026-08-30)
- [ ] `.env` production di-set `APP_REVIEW_BYPASS_NUMBERS` + `APP_REVIEW_BYPASS_OTP`
- [ ] Deploy: `pnpm --filter @ecc/core-api build` + `pm2 restart ecc-core-api`
- [ ] Verification curl request test lolos (dua-duanya request + verify)
- [ ] Audit log entry tercatat saat bypass hit (`grep "app-review bypass" pm2 logs`)
- [ ] Reply confirmation ke tim mobile (Ari) → mobile lanjut reply Apple

## BE Implementation Notes (2026-08-30)

**Approach chosen:** ENV-based allowlist (lebih flexible drpd hardcoded), controlled dgn 2 var:
- `APP_REVIEW_BYPASS_NUMBERS` — comma-separated E.164
- `APP_REVIEW_BYPASS_OTP` — static code
- Bypass **hanya aktif untuk purpose=LOGIN**. ENROLLMENT / RESET_FACE / ONBOARDING_ADD_NOHP normal flow.
- Rate limiter `otpRequestLimiter` + `authVerifyLimiter` **tetap apply** ke nomor bypass.
- Kalau ENV kosong → bypass total OFF (default aman).

**Log format** (grep-able):
- `[auth-otp] app-review bypass request (no WA send)`
- `[auth-otp] app-review bypass verify success`
- `[auth-otp] app-review bypass wrong OTP`

**Config production (untuk deploy op):**
```bash
# /var/www/ecc-core-platform/.env
APP_REVIEW_BYPASS_NUMBERS=+6281805807807
APP_REVIEW_BYPASS_OTP=123456
```

**Register reviewer jemaat via portal admin:**
1. Login portal sebagai Fulltimer
2. Buka `/dashboard/jemaat` → tombol tambah
3. Isi: noHp=+6281805807807, namaLengkap="Apple Reviewer", cabang=pusat, jenisKelamin=L, tanggalLahir=1990-01-01, isActive=on
4. Save

Atau via Prisma:
```typescript
await prisma.jemaat.create({
  data: {
    noHp: '+6281805807807',
    namaLengkap: 'Apple Reviewer',
    email: 'apple-review@eccchurch.global',
    cabangId: '<cabang-id-pusat>',
    jenisKelamin: 'L',
    tanggalLahir: new Date('1990-01-01'),
    isActive: true,
  },
});
```

---

## Contact

- **Mobile team:** Ari Christian — arichrst@ide.asia / arichrst@gmail.com / +62 821 1567 8446
- **Apple submission ID:** a3b9d530-97a9-4ad5-877f-256283ea6849
- **App:** ELS Global App v1.0.0 (build 4), Bundle ID `idea.eccchurch.global`

Kalau ada question atau alternative approach yang lebih clean, ping via ECC repo issue atau langsung reply doc ini.

---

*Doc versi: 1.0 — 2026-08-30. Priority urgent — waiting on BE untuk unblock iOS deployment.*
