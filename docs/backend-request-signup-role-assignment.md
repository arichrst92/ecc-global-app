# Backend Request: Signup-time Role Assignment (Jemaat Type + Fulltimer Sub-role)

**Untuk**: Tim Backend ECC (Claude session)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-23
**Priority**: 🟡 **MEDIUM** — UX improvement, pilot rollout ready boleh tanpa ini (admin manual assign), tapi ideal sebelum public release.
**Status**: 📝 **PROPOSED** — menunggu BE response

## TL;DR

Mobile request: extend `POST /auth/register` untuk accept 2 field baru
(`jenisJemaat`, `fulltimerSubRoleId`) + add public endpoint
`GET /public/roles/fulltimer-sub-roles` untuk picker dropdown.

Saat ini BE auto-assign role `Jemaat:Jemaat Tetap` ke semua signup baru.
Mobile mau give user choice:
1. **Apakah Anda berjemaat di sini?** → Jemaat Tetap vs New Comer
2. **Apakah Anda staf fulltimer?** → Yes/No
3. Kalau Yes (Q2): pilih **Bagian Pelayanan** (Worship, Tech, Administration, dll)

Tujuan: data role accurate dari hari-1, admin tidak harus manual re-assign.
Plus New Comer flagging berguna untuk follow-up program connect group.

---

## 1. Extension ke `POST /auth/register`

### Payload baru

```diff
POST /auth/register
Content-Type: application/json
(no auth — OTP enrollment verified flag dari sebelumnya)

{
  "noHp": "+6281234567890",
  "namaLengkap": "Budi Santoso",
  "jenisKelamin": "L",
  "cabangId": "uuid-cabang",

+ "jenisJemaat": "JEMAAT_TETAP" | "NEW_COMER",
+ "fulltimerSubRoleId": "uuid-subrole-fulltimer"   // optional
}
```

### Validation rules

- `jenisJemaat` — wajib (atau default `JEMAAT_TETAP` kalau missing untuk
  backwards-compat selama mobile rollout). Mobile akan selalu kirim.
- `fulltimerSubRoleId` — optional. Kalau ada, BE assign role "Fulltimer"
  dengan sub-role tersebut ke jemaat baru.
- Validate `fulltimerSubRoleId` exists di table sub-role dengan role parent
  = "Fulltimer". Reject 400 BAD_REQUEST kalau invalid.

### BE behavior expected

1. Validate semua field sesuai aturan existing
2. Create jemaat baru
3. Auto-assign role "Jemaat" dengan sub-role per `jenisJemaat`:
   - `JEMAAT_TETAP` → sub-role "Jemaat Tetap"
   - `NEW_COMER` → sub-role "New Comer"
4. Kalau `fulltimerSubRoleId` ada: assign role "Fulltimer" dengan sub-role
   tersebut sebagai role kedua jemaat
5. Set `user.isFulltimer = true` kalau ada role Fulltimer
6. Return AuthSuccessData seperti existing — JWT + user object

### Response sama persis seperti existing

```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": 900,
    "user": {
      ...
      "isFulltimer": true,    // ← reflect dari assignment baru
      "menuAccess": { ... }   // ← include fulltimer perms kalau applicable
    }
  }
}
```

---

## 2. Endpoint baru: `GET /public/roles/fulltimer-sub-roles`

Public endpoint (no auth) untuk picker dropdown di mobile signup screen.

### Request

```http
GET /public/roles/fulltimer-sub-roles
(no auth)
```

### Response 200

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "nama": "Worship",
      "deskripsi": "Tim pelayanan ibadah"
    },
    {
      "id": "uuid-2",
      "nama": "Administration",
      "deskripsi": "Tim admin gereja"
    },
    {
      "id": "uuid-3",
      "nama": "Tech",
      "deskripsi": "Tim teknis (sound, multimedia, IT)"
    },
    {
      "id": "uuid-4",
      "nama": "Pastor",
      "deskripsi": "Gembala / pelayan firman"
    },
    {
      "id": "uuid-5",
      "nama": "Other"
    }
  ]
}
```

### Filter

Hanya return sub-roles yang:
- Parent role = "Fulltimer"
- `isActive = true` (hidden kalau di-deactivate admin)
- Optional flag `isSelfAssignable = true` — admin bisa control mana yang user
  boleh self-select (mis. role sensitive seperti "Senior Pastor" tidak boleh
  user pilih sendiri, harus admin assign manual)

### Response empty case

Kalau tidak ada sub-role yang active + selfAssignable, return `data: []`.
Mobile sudah handle: tampilkan banner "Pilihan belum tersedia, hubungi admin".

---

## 3. Mobile implementation (commit M23)

### State extension

`src/stores/signup.store.ts`:
```typescript
type SignupState = {
  ...existing...,
  jenisJemaat: 'JEMAAT_TETAP' | 'NEW_COMER' | '',
  isFulltimer: boolean | null,
  fulltimerSubRoleId: string,
};
```

### Type extension

`src/types/auth.ts`:
```typescript
export type JenisJemaat = 'JEMAAT_TETAP' | 'NEW_COMER';

export type RegisterPayload = {
  ...existing...,
  jenisJemaat?: JenisJemaat,
  fulltimerSubRoleId?: string,
};
```

### API + hook

- `src/api/role.ts` — `listFulltimerSubRoles()` GET wrapper
- `src/hooks/useFulltimerSubRoles.ts` — `useFulltimerSubRoles(enabled)` lazy
  fetch (enabled hanya kalau user pilih isFulltimer=true). retry: false +
  suppressErrorReport (graceful fallback ke disabled picker).

### UI di signup data screen

`app/(auth)/signup/data.tsx` 3 section baru setelah cabang picker:
1. SegmentedControl: Jemaat Tetap | New Comer
2. SegmentedControl: Ya pengerja | Bukan
3. (conditional) Picker: sub-role list dari API

Validation di form submit:
- jenisJemaat required
- isFulltimer required
- fulltimerSubRoleId required HANYA kalau:
  - isFulltimer === true AND
  - subRolesQuery.data exists (BE endpoint live + ada pilihan)

Kalau BE endpoint belum live (404 atau empty), mobile show banner:
"Pilihan belum tersedia. Setelah daftar, hubungi admin cabang untuk assign
bagian pelayanan Anda." → user tetap bisa lanjut signup tanpa pilih
sub-role, BE bisa skip Fulltimer role assignment.

---

## 4. Backwards compatibility

- BE belum implement perubahan ini → mobile tetap bisa signup, payload baru
  di-ignore (extra fields = standard HTTP). Default behavior tetap auto-assign
  "Jemaat Tetap".
- BE implement endpoint sub-roles dulu, /auth/register extension belakangan
  → mobile bisa show picker tapi `fulltimerSubRoleId` di payload di-ignore
  (user effectively tidak dapat Fulltimer assignment sampai register
  endpoint updated).

---

## 5. Schema impact

### `Role` + `SubRole` table (already exists per existing schema):
```
Role: Jemaat (id-1)
  SubRole: Jemaat Tetap (id-1a)
  SubRole: New Comer (id-1b)             ← perlu seed kalau belum ada

Role: Fulltimer (id-2)
  SubRole: Worship (id-2a)               ← perlu seed
  SubRole: Administration (id-2b)
  SubRole: Tech (id-2c)
  SubRole: Pastor (id-2d)
  SubRole: Other (id-2e)
```

Mungkin perlu tambah column `isSelfAssignable BOOLEAN DEFAULT false` di
`sub_role` table untuk filter mana yang user boleh pilih sendiri.

### Migration baru
```sql
-- Add isSelfAssignable kalau perlu
ALTER TABLE sub_role ADD COLUMN is_self_assignable BOOLEAN DEFAULT false;

-- Seed sub-roles yang missing (idempotent)
INSERT INTO sub_role (id, role_id, nama, is_self_assignable)
VALUES
  (gen_random_uuid(), :jemaatRoleId, 'New Comer', true),
  (gen_random_uuid(), :fulltimerRoleId, 'Worship', true),
  ...
ON CONFLICT DO NOTHING;
```

---

## 6. Action items BE

- [ ] (Optional) Add `is_self_assignable` column di sub_role + seed
- [ ] Seed "New Comer" sub-role di role Jemaat (kalau belum)
- [ ] Seed fulltimer sub-roles (Worship, Admin, Tech, dst) sesuai
      kebutuhan organisasi
- [ ] Endpoint `GET /public/roles/fulltimer-sub-roles` — filter + return
- [ ] Extend `POST /auth/register` validation + handler:
  - Accept `jenisJemaat`, route ke sub-role yang sesuai
  - Accept `fulltimerSubRoleId`, validate + assign Fulltimer role kedua
- [ ] Update API docs (Swagger / reference/mobile-api-guide.md)

---

## 7. Test cases

1. Happy path JEMAAT_TETAP only: register dengan jenisJemaat='JEMAAT_TETAP' +
   isFulltimer=false → jemaat dapat 1 role "Jemaat:Jemaat Tetap"
2. NEW_COMER: register dengan jenisJemaat='NEW_COMER' → jemaat dapat 1 role
   "Jemaat:New Comer"
3. Fulltimer: jenisJemaat='JEMAAT_TETAP' + fulltimerSubRoleId=<worship-uuid>
   → jemaat dapat 2 roles: Jemaat:Tetap + Fulltimer:Worship, isFulltimer=true
4. Invalid sub-role ID: fulltimerSubRoleId='not-exist' → 400 BAD_REQUEST
5. Empty sub-roles list: BE return [], mobile gracefully fall back ke banner
6. Backwards compat: mobile lama yang tidak kirim field baru → default
   JEMAAT_TETAP, no Fulltimer

---

## 8. Backend Response

*(diisi oleh BE setelah review)*
