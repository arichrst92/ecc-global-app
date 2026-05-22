# Backend Request: Profile Edit Completeness — kode, foto, dependent edit

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-21
**Priority**: 🟡 **MEDIUM** — UX polish, blocking edit-profile feature complete
**Status**: ✅ **RESOLVED** (BE patch 2026-05-22a)

## TL;DR

3 hal terkait profile edit yang perlu BE confirm/implement:

1. **Kode jemaat kadang kosong** di `/admin/me` response (?). Cek BE: ensure `Jemaat.kode` always populated saat user registered.
2. **Foto upload untuk DEPENDENT family member** — endpoint?
3. **Edit profile dependent family** — endpoint untuk update nama/dob/alamat anggota keluarga yang isDependent (anak tanpa HP).

---

## Issue 1: Kode jemaat kosong

User report: di halaman QR Card, "kode masih kosong" — tidak tampil.

Mobile flow:
1. Login OTP → `accessToken + user` (User.kode field)
2. Buka QR Card → render `user.kode` jadi QR + display text
3. Kalau kosong → tampil placeholder

Possible BE issues:
- User di-create tapi `kode` belum di-assign (race condition di registration?)
- Field `kode` di `/admin/me` response berbeda nama (mis. `memberCode`)?
- Field memang kosong karena registration manual via admin portal, baru auto-generate saat login?

**Request**: 
- Confirm `/admin/me` selalu return `kode` non-empty untuk active user
- Kalau ada user dengan kode kosong di production, apakah bisa auto-generate retroactively?
- Document expected behavior + naming convention (KJ-2026-XXXXX format misalnya)

## Issue 2: Photo upload untuk dependent

Existing endpoint: `POST /admin/me/foto` (multipart) — untuk current user only.

Untuk dependent family member (anak/lansia tanpa HP yang current user adalah primaryGuardian), saat ini **tidak ada endpoint** untuk upload foto profil mereka via mobile.

**Request**:
```
POST /admin/me/family/:jemaatId/foto
Content-Type: multipart/form-data

(form field: 'foto' = File)

Response 200:
{ "id": "<jemaat-id>", "fotoUrl": "https://cdn..." }
```

Authorization rule: hanya boleh kalau current user adalah primaryGuardian dari jemaatId tersebut (cek via FamilyRelation).

## Issue 3: Edit profile dependent

Existing: `PATCH /admin/me` untuk current user.
Untuk dependent: **tidak ada endpoint** yang accessible dari mobile.

**Request**:
```
PATCH /admin/me/family/:jemaatId
Content-Type: application/json

{
  "namaLengkap": "...",
  "tanggalLahir": "YYYY-MM-DD",
  "jenisKelamin": "L"|"P",
  "alamat": "..."
}

Response 200: updated Jemaat row
```

Authorization rule: current user must be primaryGuardian + jemaat must have `isDependent=true` (no noHp). Email + cabang change tidak di-allow via endpoint ini (admin only).

---

## Why now

Edit Profile feature di mobile (M5.4 + iter 3) butuh complete coverage:
- User edit dirinya sendiri ✅ (PATCH /admin/me works)
- User edit anak balita (dependent) ❌ (tidak ada endpoint)
- Foto upload sendiri ✅ (POST /admin/me/foto works)
- Foto upload anak ❌ (tidak ada endpoint)

Tanpa endpoint dependent edit/upload, parent harus telepon admin tiap mau update info anak — frustrating UX.

## Effort estimate

- Issue 1 (kode investigation): 30 min audit + fix jika ditemukan
- Issue 2 (POST family foto): 1-2 jam (re-use POST /admin/me/foto logic + authorization check)
- Issue 3 (PATCH family jemaat): 1-2 jam (re-use PATCH /admin/me handler + authorization check)

Total: **~4-5 jam BE work**.

## Action items BE

- [ ] Audit: cek ada user dengan kode kosong? Fix kalau ada
- [ ] POST /admin/me/family/:jemaatId/foto
- [ ] PATCH /admin/me/family/:jemaatId
- [ ] Update mobile-api-guide section 13 (Family) dengan endpoint baru
- [ ] Reply doc ini atau Slack

## Mobile-side plan (after BE ready)

- `src/api/family.ts` — tambah `updateFamilyJemaat()` + `uploadFamilyFoto()`
- `app/family/[id].tsx` — show "Edit Profile" button kalau dependent
- Reuse `EditProfileScreen` dengan `mode='dependent', jemaatId` param

Mobile-side estimasi: 2-3 jam setelah BE ready.

---

## ✅ Backend Response — 2026-05-22 (patch 2026-05-22a)

3 issues di-tangani sekaligus. Path endpoint final ada beda kecil dari spec (lihat per-issue di bawah).

### Issue 1 — Kode jemaat kosong ✅ Self-heal

**Root cause analysis:**
- `Jemaat.kode` di schema = `String?` (nullable, intentional untuk backward compat dengan row lama)
- `generateUniqueKode()` helper sudah ada (di `lib/kode-reservasi.ts`) — 8 char alphanumeric uppercase no ambiguous chars
- `POST /auth/register` (self-register) + `POST /admin/me/family/register-new` keduanya **sudah** generate kode otomatis
- Yang affected: user lama (legacy data dari sebelum kode field di-introduce) — di-create admin manual via portal tanpa kode

**Fix: self-heal di GET /admin/me handler** (idempotent, no admin intervention):

```typescript
// apps/core-api/src/routes/admin/me.ts
if (!jemaat.kode) {
  const newKode = await generateUniqueKode(...);
  jemaat = await prisma.jemaat.update({ where: { id }, data: { kode: newKode }, include: {...} });
}
```

First time user buka /admin/me, kode di-generate + persist. Subsequent fetches → kode sudah ada, no overhead. Self-healing pattern menghindari migration backfill yang invasive.

**Tidak perlu** batch migration SQL — endpoint heal di-trigger by user activity, lazy backfill.

**Mobile side**: tidak perlu special handling. QR Card akan tampil kode secara konsisten setelah first /admin/me fetch.

### Issue 2 — POST foto dependent ✅

**Endpoint**: `POST /admin/me/family/:jemaatId/foto`

Mirror dari existing `POST /admin/me/foto` dengan auth check tambahan via helper `assertDependentGuardian(currentJemaatId, targetJemaatId)`:

1. Reject 400 kalau `currentId === targetId` (self → pakai /admin/me/foto)
2. Reject 404 kalau target tidak ditemukan
3. Reject 401 kalau `target.primaryGuardianId !== currentJemaatId`
4. Reject 400 kalau `target.noHp` non-null (artinya bukan dependent, harus self-edit)

Setelah pass auth → flexImageUpload + saveProfilePhoto + update fotoUrl. Audit log capture `kind: 'dependent-foto-mobile'` + `guardianJemaatId`.

**Request:**
```
POST /admin/me/family/abc-123/foto
Content-Type: multipart/form-data
field: foto (atau file/image/bukti — field name agnostic)
```

**Response 200**: `{ id, fotoUrl }`.

### Issue 3 — PATCH dependent profile ✅

**Path**: `PATCH /admin/me/family/:jemaatId/profile` — tambah `/profile` suffix.

**Reason**: existing `PATCH /admin/me/family/:jemaatId` sudah ada untuk update **FamilyRelation.role** (mis. ganti CHILD → SIBLING). Path collision kalau di-overload. Sub-path `/profile` jelas semantic: ini edit profile, bukan edit relation.

**Schema baru** (`editDependentJemaatSchema`):
```typescript
{
  namaLengkap?: string,
  tanggalLahir?: string (ISO date) | null,
  jenisKelamin?: 'L' | 'P' | null,
  alamat?: string | null
}
```

**Disallowed**: noHp, email, cabangId, kode, primaryGuardianId, isActive (semua admin-only).

Auth check pakai `assertDependentGuardian()` yang sama dengan foto endpoint.

**Mobile call shape:**
```typescript
PATCH /admin/me/family/abc-123/profile
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "namaLengkap": "Nama Baru",
  "tanggalLahir": "2018-03-12"
}

// → 200 updated Jemaat
// → 401 "Hanya primary guardian yang boleh edit profile dependent ini."
// → 400 "Target punya nomor HP sendiri — bukan dependent."
```

### Files

- New schema: `editDependentJemaatSchema` di `shared-types/auth.ts`
- New handlers: `meRouter.patch('/family/:jemaatId/profile', ...)` + `.post('/family/:jemaatId/foto', ...)`
- New helper: `assertDependentGuardian(currentId, targetId)` di `routes/admin/me.ts`
- GET /admin/me handler — kode self-heal logic
- mobile-api-guide section 13.8 baru

### Mobile-side plan

```typescript
// src/api/family.ts
export const updateDependentProfile = (jemaatId, data) =>
  apiClient.patch(`/admin/me/family/${jemaatId}/profile`, data);

export const uploadDependentFoto = (jemaatId, formData) =>
  apiClient.post(`/admin/me/family/${jemaatId}/foto`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
```

EditProfileScreen sudah ada — tinggal pass `jemaatId` prop dan switch endpoint pakai dependent variant kalau parent edit anak.

### Git

Lihat combined push command di `backend-request-ministry-endpoints.md` Backend Response (semua 5 patch hari ini di-bundle).
