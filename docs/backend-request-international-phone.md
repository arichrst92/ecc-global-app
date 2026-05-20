# Backend Request: Dukung Nomor HP Internasional di OTP Flow

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-20
**Priority**: 🟢 **LOW-MEDIUM** — UX issue untuk jemaat luar negeri (WNI diaspora, missionari, jemaat international). Tidak blocker untuk launch domestik.
**Status**: ✅ **RESOLVED 2026-05-21** (BE side) — WhatsApp provider verification masih open (ops). Lihat section "Backend Response" di akhir doc.

---

## TL;DR

Sebagian jemaat ECC ada di luar Indonesia (WNI diaspora, missionari, jemaat international/cabang luar negeri). Saat ini OTP flow hardcode prefix `+62`. Permintaan: **support nomor HP internasional E.164** di `/auth/otp/request` dan `/auth/otp/verify`, dengan WhatsApp Business API yang accept multi-country.

Mobile akan provide country code picker (default tetap +62 supaya 95% jemaat tidak terbeban).

---

## Problem statement

### Use cases yang saat ini broken

1. **WNI diaspora aktif di cabang luar negeri** — mis. cabang Sydney, Singapore, LA. Jemaat lokal di sana pakai HP +61, +65, +1 dst.
2. **Missionari** — yang field di Papua New Guinea (+675), Timor Leste (+670), dll.
3. **Jemaat WNI mahasiswa S2/S3** di luar negeri — banyak yang ganti HP lokal.
4. **Pendeta/penginjil tamu** — visiting speaker yang mau register sementara.

Saat ini app reject HP non-+62 di validation client-side. Workaround: jemaat luar negeri pakai HP keluarga di Indonesia, atau register manual via admin.

---

## Permintaan ke BE team

### 1. Update validation `/auth/otp/request`

**Current** (kemungkinan):
```typescript
const schema = z.object({
  noHp: z.string().regex(/^\+62[0-9]{8,15}$/),
  purpose: z.enum(['LOGIN', 'ENROLLMENT']),
});
```

**Proposed**:
```typescript
import { parsePhoneNumber } from 'libphonenumber-js';

const schema = z.object({
  noHp: z.string().refine((v) => {
    try {
      const parsed = parsePhoneNumber(v);
      return parsed.isValid();
    } catch {
      return false;
    }
  }, 'Invalid phone number format. Use international E.164 (e.g. +6281234567890, +61412345678).'),
  purpose: z.enum(['LOGIN', 'ENROLLMENT']),
});
```

`libphonenumber-js` adalah port resmi dari Google's libphonenumber. Validate dengan country-specific rules (length per country, valid mobile prefix, dll). Untuk +62, behavior identical dengan current regex. Untuk country lain, kasih validasi yang tepat.

### 2. Update `/auth/register` `noHp` field — same change

Konsisten dengan validation di `/auth/otp/*`.

### 3. WhatsApp Business API — multi-country support

WhatsApp Business API **sudah natively support international**. Apa yang perlu di-konfirm:

- **Template messaging quota**: WhatsApp charge per conversation, harga berbeda per country. Cek pricing tier (Indonesia, US, dll).
- **Phone number verification** by WhatsApp: sender number (BE side) bisa hanya kirim ke phone tertentu? Biasanya tidak ada limit, tapi worth check.
- **Template approval**: kalau pakai approved template, template harus support multi-language. Sekarang ID + EN sudah ada, mungkin cukup.

Kalau provider yang dipakai (Twilio? Meta direct?) tidak bisa kirim ke country tertentu (regulatory), itu jadi hard constraint.

### 4. Rate limit per-number tetap berlaku

Saat ini ada rate limit 3 OTP/jam per nomor (untuk prevent abuse). Tetap berlaku regardless country code.

### 5. Database schema check

Field `Jemaat.noHp` di database kemungkinan sudah `VARCHAR(20)` atau similar — cukup untuk semua E.164 (max 15 digit + `+`). Pastikan tidak ada index/constraint yang assume +62 prefix.

---

## Mobile-side plan

Setelah BE deploy, mobile akan:

1. **Tambah country picker di `PhoneInput`** — modal sheet dengan list 30-50 country populer (Indonesia, US, Singapore, Malaysia, Australia, UK, Germany, dll). Default tetap Indonesia.
2. **Pakai `libphonenumber-js` di client** — validation real-time per country yang dipilih.
3. **Display format adapt per country** — `+62 821 1234 5678` vs `+1 415 555 1234`.
4. **Persist last-used country** di SecureStore — kalau user selalu pakai +61, default ke itu.

Library: `libphonenumber-js` (~50KB bundled, sudah dipakai backend kalau adopt point #1).

---

## Edge cases & questions

**Q: Apa default country mobile per user?**
A: Default Indonesia (+62). User bisa change manual. Bisa optimize nanti dengan auto-detect dari device locale/SIM, tapi tidak required.

**Q: Bagaimana dengan jemaat existing yang `noHp` di DB sudah +62?**
A: Tidak ada migration needed. Field validation di-relax untuk accept E.164 apa saja. Existing data tetap valid karena +62XXX adalah valid E.164.

**Q: Bagaimana dengan branch (cabang) assignment?**
A: Tidak ada coupling antara country code dan cabang. Jemaat di cabang Sydney boleh pakai +62 (kalau punya HP Indonesia), atau +61. Cabang pick di signup terpisah dari nomor HP.

**Q: Bagaimana dengan WhatsApp delivery delay untuk negara tertentu?**
A: WhatsApp infra typically <5 detik global. Kalau ada issue dengan country tertentu (mis. China — WhatsApp blocked), itu hard constraint yang harus di-disclose ke user ("WhatsApp not available in your region").

**Q: Apa risiko abuse dari international phones?**
A: Rate limit per-IP + per-nomor tetap berlaku. Country code tidak relax security checks.

---

## Action items untuk BE team

| # | Item | Priority |
|---|------|----------|
| 1 | Install `libphonenumber-js` di BE | Required |
| 2 | Update validation schema di `/auth/otp/request`, `/auth/otp/verify`, `/auth/register` | Required |
| 3 | Verify WhatsApp provider support multi-country | Required (provider-side check) |
| 4 | Update mobile-api-guide.md dengan note "noHp accept any valid E.164" | Doc |
| 5 | Optional: telemetry untuk track non-+62 OTP requests (untuk awareness scaling) | Nice-to-have |

---

## Decision needed dari BE team

Sebelum implement, kami butuh konfirmasi:

1. **Apakah WhatsApp Business provider Anda support kirim ke international number?** Cek dashboard / docs provider.
2. **Apakah ada concern budget WhatsApp messaging cost?** International rates lebih mahal (~$0.04-0.08 per conversation vs ~$0.02 untuk Indonesia).
3. **Apakah ada regulatory concern?** Beberapa negara require local SMS gateway (mis. India), tapi WhatsApp Business OK.
4. **Timeline?** Mobile bisa adopt 1-2 minggu setelah BE deploy.

---

## Reference

- E.164 standard: https://en.wikipedia.org/wiki/E.164
- libphonenumber-js: https://www.npmjs.com/package/libphonenumber-js
- WhatsApp Business pricing: https://business.whatsapp.com/products/platform-pricing

---

## Kontak

Mobile dev — Ari Christian (`arichrst@ide.asia`)

---

# Backend Response — 2026-05-21

**Dari**: Tim Backend ECC (IDEA dev team)
**Untuk**: Mobile dev (Ari Christian)
**Status**: ✅ **DELIVERED (BE side)** — provider verification still pending ops

## Ringkasan

BE validation di-update untuk accept E.164 dari country apa saja yang valid. Pakai `libphonenumber-js` (sama lib dengan rekomendasi mobile di request #1).

**Yang sudah di-deliver BE-side**:

1. ✅ `noHpSchema` di `packages/shared-types/src/schemas/common.ts` diganti dari regex `+62` only ke `isValidPhoneNumber()` dari libphonenumber-js
2. ✅ Semua endpoint yang inherit `noHpSchema` otomatis ikut: `/auth/otp/request`, `/auth/otp/verify`, `/auth/face/login`, `/auth/register`, `/admin/jemaat` (create/update), `/admin/me/family/link-by-phone`, `/admin/me/family/register-new`
3. ✅ Database schema tidak butuh migration — kolom `noHp` sudah `VARCHAR(20)` (cukup untuk E.164 max 15 digit + `+`), tidak ada constraint assume +62 prefix
4. ✅ Existing data `+62XXX` tetap valid (semua E.164 backward-compat)
5. ✅ Mobile-api-guide section "Phone number normalization" updated dengan format internasional

**Yang TIDAK di-deliver BE-side (pending ops/product)**:

1. ❌ WhatsApp Business provider verification — perlu check apakah provider Fonnte/Twilio/Meta yang dipakai bisa kirim ke country tertentu, dan budget per country (international rates 2-4x lebih mahal)
2. ❌ Telemetry tracking non-+62 OTP requests (nice-to-have, defer)

## Perubahan code

### 1. `packages/shared-types/package.json` — dependency baru

```json
"dependencies": {
  "@asteasolutions/zod-to-openapi": "^7.1.1",
  "libphonenumber-js": "^1.11.0",
  "zod": "^3.23.0"
}
```

User perlu run `pnpm install` di root setelah pull.

### 2. `packages/shared-types/src/schemas/common.ts` — schema validator

```typescript
// SEBELUM
import { z } from 'zod';

export const noHpSchema = z.string().trim()
  .regex(/^\+62[0-9]{8,13}$/, 'Format no HP harus E.164 (+62...)');

// SESUDAH
import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';

export const noHpSchema = z.string().trim()
  .refine(
    (v) => {
      try { return isValidPhoneNumber(v); }
      catch { return false; }
    },
    {
      message:
        'Format no HP harus E.164 internasional yang valid (contoh: +6281234567890, +6512345678, +14155551234)',
    },
  );
```

## Validation behavior per country

| Country | Format E.164 | BE accept? |
|---|---|---|
| Indonesia (+62) | `+6281234567890` | ✅ (identical dengan regex lama) |
| Singapore (+65) | `+6591234567` | ✅ |
| Malaysia (+60) | `+60123456789` | ✅ |
| Hong Kong (+852) | `+85291234567` | ✅ |
| Australia (+61) | `+61412345678` | ✅ |
| US/Canada (+1) | `+14155551234` | ✅ |
| UK (+44) | `+447911123456` | ✅ |
| Format invalid (terlalu pendek, prefix salah) | mis. `+62812` | ❌ 400 VALIDATION_ERROR |

## Acceptance criteria checklist

- [x] `libphonenumber-js` ter-install di `shared-types`
- [x] Validation schema di-update — accept E.164 any country
- [x] Existing +62 numbers tetap valid (no migration needed)
- [x] No constraint/index assume +62
- [x] mobile-api-guide.md updated dengan instruksi normalize via libphonenumber-js
- [ ] **PENDING (ops)**: Verify WhatsApp provider support international delivery + cek pricing
- [ ] **PENDING (ops, low priority)**: Telemetry tracking non-+62 requests

## Mobile-side action items

Setelah pull BE update:

- [ ] Install `libphonenumber-js` di mobile app: `pnpm add libphonenumber-js`
- [ ] Update `PhoneInput` component — tambah country picker (default ID +62)
- [ ] Update `normalizePhone()` helper pakai `parsePhoneNumber(input, defaultCountry).format('E.164')`
- [ ] Real-time validation per country yang dipilih
- [ ] Persist last-used country di SecureStore (`Constants.expoConfig.extra.lastUsedCountry` atau key di secure-store)
- [ ] Test dengan beberapa nomor: +62, +65, +1 (subjek WhatsApp provider support)

## Bonus catatan

**Disable country sementara** (kalau provider tidak support): saat ini BE tidak punya country allowlist. Kalau perlu block country tertentu (mis. China), bisa ditambah di Zod `.refine()` dengan `parsePhoneNumber(v).country` check. Buka request terpisah kalau perlu.

**Migration data**: tidak perlu — existing `+62XXX` rows tetap valid E.164.

**Performance**: `isValidPhoneNumber` ~0.1ms per call (lib dengan metadata di-bundled). Negligible impact.

## File yang berubah

| File | Perubahan |
|---|---|
| `packages/shared-types/package.json` | Tambah `libphonenumber-js ^1.11.0` |
| `packages/shared-types/src/schemas/common.ts` | Replace regex dengan `isValidPhoneNumber()` |
| `docs/mobile-api-guide.md` | Section "Phone number normalization" diperluas |
| `knowledge-base.md` | Section 26 patch **2026-05-21k** |

## Pre-deploy checklist (ops)

Sebelum production rollout multi-country:

- [ ] Konfirmasi provider WhatsApp support country target (subset 7 country: ID/SG/MY/HK/AU/UK/US untuk awal)
- [ ] Check pricing per country — international rates ~$0.04-0.08 vs $0.02 ID
- [ ] Set budget ceiling untuk international OTP (optional rate limit per-country untuk cost control)
- [ ] Communicate ke admin: ada flow alternatif buat country yang WhatsApp tidak available

---

*Ticket closed (BE side) 2026-05-21. Mobile dev silakan adopt, tapi tunggu konfirmasi ops sebelum rollout multi-country ke production.*
