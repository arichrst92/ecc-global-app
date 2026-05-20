# Backend Request: Dukung Nomor HP Internasional di OTP Flow

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-20
**Priority**: 🟢 **LOW-MEDIUM** — UX issue untuk jemaat luar negeri (WNI diaspora, missionari, jemaat international). Tidak blocker untuk launch domestik.
**Status**: Pending

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
