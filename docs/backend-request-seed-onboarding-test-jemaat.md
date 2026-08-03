# Backend Request — Seed Jemaat Testing untuk Onboarding Wizard

**Dari:** Tim Mobile (Ari)
**Untuk:** Tim Backend ECC (IDEA)
**Tanggal:** 2026-07-31
**Priority:** 🟡 Medium — blocking smoke test M37 (onboarding wizard) sebelum release v1.2.0
**Status:** ✅ **RESOLVED** (2026-08-02) — script idempotent + siap execute. Lihat "BE Response" di bawah.
**Related:** [`backend-notice-magic-link-email-login.md`](./backend-notice-magic-link-email-login.md)

---

## TL;DR

Mohon seed **1-3 jemaat testing** di production DB dengan `onboardedAt=NULL` supaya mobile team bisa smoke test onboarding wizard end-to-end tanpa impact ke data jemaat legacy real (6736 orang).

Data test ini akan dipakai untuk verify:
1. Magic link email → wizard trigger correctly
2. Wizard step-by-step UI + validation
3. Add noHp flow (OTP purpose=ONBOARDING_ADD_NOHP)
4. Profile field submission → `POST /auth/onboarding/complete`
5. Post-submit state: `onboardedAt` di-set, user session persist, landing di main app

---

## Konteks

Sprint 2 Phase 2B (M37) — onboarding wizard multi-step — sudah **code complete** di mobile. Ref: `docs/sprint-plan-2026-q3.md`.

Sebelum release v1.2.0 ke Play Store, butuh smoke test E2E di production BE (bukan staging karena tidak ada environment staging terpisah). Test menggunakan real data legacy jemaat kurang aman:
- Data profile real ter-update saat wizard complete
- Butuh koordinasi jemaat legacy real (tidak scalable untuk testing berulang)
- Kalau ada bug submit, data legacy corrupted

Solusi: **seed jemaat testing khusus** yang bisa di-reset oleh BE kapan saja.

---

## Request Detail

### Jemaat testing yang dibutuhkan

Bikin **1-3 jemaat** dengan spesifikasi berikut, masing-masing untuk skenario berbeda:

#### Jemaat Test 1 — Full onboarding (missingNoHp + missingProfile)

```sql
INSERT INTO jemaat (
  id, kode, nama_lengkap, email, no_hp,
  jenis_kelamin, tanggal_lahir, cabang_id,
  onboarded_at, legacy_shiftsoft_id,
  is_active, created_at
) VALUES (
  gen_random_uuid(),
  'TEST-001',
  'Test User Onboarding Full',
  'test-onboarding-1@ide.asia',  -- email yang bisa Ari akses
  NULL,                            -- no_hp NULL → wizard trigger add-phone
  NULL,                            -- jenis_kelamin NULL → wizard requires
  NULL,                            -- tanggal_lahir NULL → wizard requires
  '<pilih 1 cabang aktif>',
  NULL,                            -- onboarded_at NULL → wizard trigger
  'test-legacy-001',               -- marker legacy untuk consistency
  true,
  now()
);
```

Expected mobile behavior:
- Login via magic link → `user.needsOnboarding=true`
- `onboardingReason.missingNoHp=true`
- `onboardingReason.missingProfile=['jenisKelamin', 'tanggalLahir']`
- Wizard flow: intro → add-phone-input → add-phone-otp → profile → submit

#### Jemaat Test 2 — Missing profile only (noHp sudah ada)

```sql
INSERT INTO jemaat (
  id, kode, nama_lengkap, email, no_hp,
  jenis_kelamin, tanggal_lahir, cabang_id,
  onboarded_at, legacy_shiftsoft_id,
  is_active, created_at
) VALUES (
  gen_random_uuid(),
  'TEST-002',
  'Test User Onboarding Profile',
  'test-onboarding-2@ide.asia',
  '+628XXXXXXXXX',                 -- noHp valid (nomor testing, bukan real)
  NULL, NULL,
  '<pilih 1 cabang aktif>',
  NULL,
  'test-legacy-002',
  true,
  now()
);
```

Expected mobile behavior:
- Login via magic link → `user.needsOnboarding=true`
- `onboardingReason.missingNoHp=false` → skip add-phone step
- Wizard flow: intro → profile → submit

#### Jemaat Test 3 — Sudah onboarded (control test)

```sql
INSERT INTO jemaat (
  id, kode, nama_lengkap, email, no_hp,
  jenis_kelamin, tanggal_lahir, cabang_id,
  onboarded_at,
  is_active, created_at
) VALUES (
  gen_random_uuid(),
  'TEST-003',
  'Test User Sudah Onboarded',
  'test-onboarding-3@ide.asia',
  '+628XXXXXXXXX',
  'L', '1990-01-01',
  '<pilih 1 cabang aktif>',
  now(),                           -- sudah onboarded → wizard skip
  true,
  now()
);
```

Expected mobile behavior:
- Login via magic link → `user.needsOnboarding=false`
- Skip wizard, landing langsung di `/(tabs)`

### Email deliverability

Ketiga jemaat test pakai email di domain `@ide.asia` (yang bisa Ari akses langsung untuk cek inbox + klik magic link).

---

## Setelah smoke test selesai

Setelah semua skenario tested + dokumentasi hasil, BE bisa:

**Opsi A — Retain untuk future testing:**
Simpan 3 jemaat test ini untuk regression testing di release berikutnya. Sebelum test:
```sql
-- Reset ke state initial
UPDATE jemaat
SET onboarded_at = NULL, no_hp = NULL, jenis_kelamin = NULL, tanggal_lahir = NULL
WHERE kode IN ('TEST-001', 'TEST-002');
```

**Opsi B — Hapus:**
```sql
DELETE FROM jemaat WHERE kode LIKE 'TEST-%';
```

Rekomendasi: **Opsi A** — retain supaya bisa dipakai buat regression testing kalau ada perubahan onboarding flow di v1.3+.

---

## Timeline

- **Preferred:** dalam 1-2 hari (blocking release v1.2.0 ke Play Store Internal testing)
- **Acceptable:** 3-5 hari
- **Kalau > 1 minggu:** mobile team akan skip wizard smoke test at production, deploy v1.2.0 dgn hanya magic link tested + wait organic testing dari jemaat legacy real

---

## Confirmation dari BE

Kalau OK, BE reply dengan:
1. UUID / kode 3 jemaat test yang di-insert
2. Cabang ID yang dipakai (supaya mobile bisa verify branch resolution)
3. Konfirmasi SendGrid config aktif untuk kirim ke domain `@ide.asia`

Kalau tidak bisa / ada masalah:
- Ganti approach — mobile team switch ke skenario C3 (deploy tanpa wizard smoke test, wait organic testing)

---

## Contact

- Mobile team: Ari (arichrst@ide.asia)
- Ref: `docs/sprint-plan-2026-q3.md` Sprint 2 Phase 2B
- Related BE notice: `backend-notice-magic-link-email-login.md`

---

*Doc versi: 1.0 — 2026-07-31.*

---

## 🔧 BE RESPONSE (2026-08-02)

Selesai — script idempotent siap execute. Detail:

### Approach

Bikin script `packages/database/prisma/scripts/seed-test-onboarding.ts` yang:
- **Idempotent** — kalau kode `TEST-001/002/003` sudah ada, di-reset ke state initial (regression testing berulang)
- **Auto-cleanup magic link token** lama saat reset supaya test fresh
- **Configurable**: cabang, email prefix, noHp custom via CLI flags
- **Create User row** otomatis supaya auth login bisa jalan

Alias `pnpm --filter @ecc/database db:seed-test-onboarding` (ada di `packages/database/package.json`).

### Execute di production

```bash
ssh deploy@187.77.118.85
cd /var/www/ecc-core-platform

# Default: cabang aktif pertama, email @ide.asia
pnpm --filter @ecc/database db:seed-test-onboarding

# Atau custom cabang (case-insensitive):
pnpm --filter @ecc/database db:seed-test-onboarding -- --cabang="Jakarta"
```

Output print 3 UUID + cabang ID + noHp assigned untuk TEST-002/003.

### Data yang di-seed

| Kode | Email | noHp | Onboarded? | Skenario |
|---|---|---|---|---|
| TEST-001 | `test-onboarding-1@ide.asia` | NULL | NO | Full wizard: intro → add-phone → OTP → profile → submit |
| TEST-002 | `test-onboarding-2@ide.asia` | random `+628…` | NO | Wizard skip add-phone, profile only |
| TEST-003 | `test-onboarding-3@ide.asia` | random `+628…` | YES (now) | Control — skip wizard, langsung main app |

### Testing steps

1. Buka mobile → **Login pakai Email** → input `test-onboarding-1@ide.asia`
2. Cek inbox `@ide.asia` — magic link ter-kirim via SendGrid
3. Klik link → app open + auto-verify → response `needsOnboarding=true`
4. Wizard trigger → step-by-step complete
5. Landing di main app → `onboardedAt` di DB sudah set

### Reset untuk regression testing

Jalanin ulang script — otomatis reset:
- `onboardedAt` back to NULL
- `noHp/jenisKelamin/tanggalLahir` back to initial
- MagicLinkToken di-delete (biar link email fresh)

### Konfirmasi checklist

- [x] SendGrid **live di prod** (verified deploy 2026-07-29). Delivery ke `@ide.asia` OK (test done Ari earlier).
- [x] Endpoint `POST /auth/onboarding/complete` **live di prod** per Sprint 2 deploy.
- [x] Rate limit magic link 5/jam/IP — cukup untuk smoke test.
- [x] User row auto-created oleh script.

### Kalau ada issue

- **Magic link gak masuk**: cek SendGrid dashboard Activity Feed
- **Endpoint verify fail**: log core-api via `pm2 logs ecc-core-api --lines 30`
- **Wizard state stuck**: reset via jalanin script ulang

Bilang kalau ada issue lain / butuh tambahan skenario test.

— IDEA dev
