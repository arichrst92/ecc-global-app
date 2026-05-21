# Backend Request: Profile Edit Completeness — kode, foto, dependent edit

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-21
**Priority**: 🟡 **MEDIUM** — UX polish, blocking edit-profile feature complete
**Status**: 🆕 **PROPOSED**

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
