# Backend Notice — Update Summary 2026-08-02 s/d 2026-08-03

**Dari:** Tim Backend ECC (IDEA)
**Untuk:** Tim Mobile (Ari)
**Tanggal:** 2026-08-03
**Status:** 🚀 Semua LIVE di production per 2026-08-03

Ringkasan semua perubahan backend 2 hari terakhir — untuk sinkronisasi mobile team.

---

## 1. Family Relation Refactor 🔄

Consolidate mobile `family_relation` (deprecated) → `jemaat_relasi` + `tipe_relasi_keluarga` (single source of truth, portal admin master data).

**Detail lengkap**: [`backend-notice-family-refactor.md`](./backend-notice-family-refactor.md)

### TL;DR mobile impact:
- Endpoint URL sama (`/admin/me/family/*`) — mobile lama tetap jalan (backward compat 100%)
- Response include **kedua field**: `role` broad (enum lama) + `tipeRelasi.nama` (granular baru: Ayah/Ibu/Anak L/Anak P/Kakek/Nenek/Cucu/Wali/Lainnya + Suami/Istri/Saudara Kandung)
- Request accept EITHER `role` broad enum ATAU `tipeRelasiId` (uuid) — gender-aware auto-refine
- Auto-reciprocal jalan kedua sisi (portal + mobile)

**Action mobile**: Optional — adopt granular UI via `GET /admin/keluarga/tipe` (12 tipe termasuk "Lainnya" baru).

---

## 2. Enum FamilyRole Extended

`SPOUSE | CHILD | PARENT | SIBLING | GUARDIAN | OTHER` (Wali + Lainnya baru).

Mobile app existing yang cuma pakai 4 broad enum tetap jalan.

---

## 3. Endpoint Baru untuk Mobile

### `POST /admin/group/:id/members/by-kode`
Add member group via kode 8-char jemaat (mirror pattern homecell). Detail: [`backend-request-group-add-member-by-kode.md`](./backend-request-group-add-member-by-kode.md) → BE Response section.

### `GET /admin/me/reservasi`
Parent-side reservasi active — include self + reservasi anak yang di-check-in oleh user (untuk lihat pickup code sendiri di app tanpa tanya admin). Detail: [`backend-request-me-reservasi-pickup-code.md`](./backend-request-me-reservasi-pickup-code.md) → BE Response.

### `GET /admin/me/children-points`
Balance point semua anak parent per cabang (flat list). Skip anak tanpa balance (bukan return 0). Cache 60s. Detail: [`backend-request-ckids-me-endpoints.md`](./backend-request-ckids-me-endpoints.md) → BE Response.

### `GET /admin/me/children-redeem-history?jemaatId=<anakId>&limit=20`
Redeem history salah satu anak parent. Guard: 403 kalau `jemaatId` bukan anak requester.

---

## 4. Ckids Web App Updates (ckids.eccchurch.global)

Perubahan admin-side subdomain, mobile team informational only:
- **Rebrand**: "CKids Gift Stall" → "CKids" + "Portal untuk kakak CKids"
- **Bottom nav mobile-native**: 5 tab (Gift / Scan / Hadir / Adjust / Report)
- **QR Scanner square** proper (bukan letterbox)
- **Foto upload + crop 1:1**: file picker → CropModal (react-easy-crop) → auto-upload
- **New page `/hadir`**: daftar kehadiran live hari ini dengan filter (Semua / Belum Checkout / Belum Dijemput), auto-refresh 15s
- **New page `/adjust-point`**: manual tambah/kurang point dgn preset chips
- **Ibadah scanner rewrite**: scan-first flow (scan/search jemaat → pick ibadah + action)
  - Auto-detect ibadah untuk checkout/pickup (kalau single active reservasi hari ini)
  - Dialog award point auto muncul post-checkin kids ibadah
- **Pickup Kode Jemput modal**: 6-digit input di /ibadah untuk parent yg tunjukin kode

---

## 5. Test Data Seed Script

`pnpm --filter @ecc/database db:seed-test-onboarding` — 3 jemaat test (TEST-001/002/003) idempotent untuk onboarding wizard smoke test. Detail: [`backend-request-seed-onboarding-test-jemaat.md`](./backend-request-seed-onboarding-test-jemaat.md) → BE Response.

Reset otomatis (delete magic link token + reset onboardedAt/noHp/profile) tiap script di-run ulang.

---

## 6. Schema Migrations Deployed

| Migration | Purpose |
|---|---|
| `20260802000000_family_role_extend` | +GUARDIAN +OTHER enum |
| `20260802100000_drop_family_relation` | DROP table + type |
| `20260802200000_seed_tipe_relasi_lainnya` | INSERT "Lainnya" tipe |

Semua idempotent + backward compat.

---

## Mobile team next steps — recommended

**Prioritas kritis (Sprint 5)**:
- [ ] Wire `GET /admin/me/children-points` di CKids Tab (replace fallback multi-call)
- [ ] Wire `GET /admin/me/children-redeem-history` untuk history anak
- [ ] Wire `GET /admin/me/reservasi` untuk parent-side pickup code display

**Prioritas medium**:
- [ ] Group add member scan QR (via `by-kode` endpoint)
- [ ] Family module: optional adopt granular UI (dropdown `/admin/keluarga/tipe`)

**Optional / defer**:
- [ ] Skip fallback pattern lama di `/admin/keluarga` multi-call — sekarang ada endpoint proper

---

## Kalau ada issue

Kirim `backend-request-*.md` di folder ini + tag BE. Log VPS via `pm2 logs ecc-core-api` untuk debug.

---

*Doc versi: 1.0 — 2026-08-03.*
