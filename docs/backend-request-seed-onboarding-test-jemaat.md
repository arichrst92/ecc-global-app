# Backend Request — Seed Jemaat Testing untuk Onboarding Wizard

**Dari:** Tim Mobile (Ari)
**Untuk:** Tim Backend ECC (IDEA)
**Tanggal:** 2026-07-31
**Priority:** 🟡 Medium — blocking smoke test M37 (onboarding wizard) sebelum release v1.2.0
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
