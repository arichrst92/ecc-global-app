# Backend Request: Signup-time Jenis Jemaat Sub-role Assignment

**Untuk**: Tim Backend ECC (Claude session)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-23 (revised 2026-05-24)
**Priority**: 🟡 **MEDIUM** — UX improvement, pilot rollout boleh tanpa ini (admin manual assign), tapi ideal sebelum public release.
**Status**: 📝 **PROPOSED** — menunggu BE response

## TL;DR

Mobile request: extend `POST /auth/register` untuk accept 1 field baru
(`jenisJemaat`).

Saat ini BE auto-assign role `Jemaat:Jemaat Tetap` ke semua signup baru.
Mobile mau give user choice:
1. **Apakah Anda berjemaat di sini?** → Jemaat Tetap vs New Comer

**Update 2026-05-24**: Question "Apakah Anda staf fulltimer?" **dihapus**.
Fulltimer assignment akan di-handle admin secara manual via portal — bukan
self-service dari mobile signup. Reason: keep signup flow simple + avoid
mis-classification, plus admin perlu verify fulltimer status anyway.

Tujuan: data role accurate dari hari-1 untuk Jemaat Tetap vs New Comer.
New Comer flagging berguna untuk follow-up program connect group.

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

+ "jenisJemaat": "JEMAAT_TETAP" | "NEW_COMER"
}
```

### Validation rules

- `jenisJemaat` — wajib (atau default `JEMAAT_TETAP` kalau missing untuk
  backwards-compat selama mobile rollout). Mobile akan selalu kirim.
- Tidak ada `fulltimerSubRoleId` lagi (dihapus per revisi 2026-05-24).
  Fulltimer di-assign manual oleh admin via portal.

### BE behavior expected

1. Validate semua field sesuai aturan existing
2. Create jemaat baru
3. Auto-assign role "Jemaat" dengan sub-role per `jenisJemaat`:
   - `JEMAAT_TETAP` → sub-role "Jemaat Tetap"
   - `NEW_COMER` → sub-role "New Comer"
4. **Tidak ada Fulltimer assignment di signup**. Kalau jemaat ternyata
   pengerja, admin cabang assign role Fulltimer + sub-role yang sesuai
   secara manual via portal Admin → Jemaat → Edit → Roles.
5. Return AuthSuccessData seperti existing — JWT + user object

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
      "isFulltimer": false,   // ← always false di signup baru;
                              //   admin set true via portal kalau perlu
      "menuAccess": { ... }   // ← sesuai role default Jemaat:Tetap/NewComer
    }
  }
}
```

---

## 2. Mobile implementation (commit M23 → M23.2)

### State

`src/stores/signup.store.ts`:
```typescript
type SignupState = {
  ...existing...,
  jenisJemaat: 'JEMAAT_TETAP' | 'NEW_COMER' | '',
  // isFulltimer + fulltimerSubRoleId DIHAPUS per revisi 2026-05-24
};
```

### Type

`src/types/auth.ts`:
```typescript
export type JenisJemaat = 'JEMAAT_TETAP' | 'NEW_COMER';

export type RegisterPayload = {
  ...existing...,
  jenisJemaat?: JenisJemaat,
  // fulltimerSubRoleId DIHAPUS per revisi 2026-05-24
};
```

### UI di signup data screen

`app/(auth)/signup/data.tsx` 1 section baru setelah cabang picker:
1. SegmentedControl: Jemaat Tetap | New Comer

Validation di form submit:
- jenisJemaat required

---

## 3. Backwards compatibility

- BE belum implement perubahan ini → mobile tetap bisa signup, payload baru
  di-ignore (extra fields = standard HTTP). Default behavior tetap auto-assign
  "Jemaat Tetap".
- Mobile tidak akan rusak baik BE accept atau ignore field `jenisJemaat`.

---

## 4. Schema impact

### `Role` + `SubRole` table (already exists per existing schema):
```
Role: Jemaat (id-1)
  SubRole: Jemaat Tetap (id-1a)
  SubRole: New Comer (id-1b)             ← perlu seed kalau belum ada
```

Tidak perlu touch Fulltimer sub-roles untuk signup endpoint (admin assign
manual via portal).

### Migration baru
```sql
-- Seed "New Comer" sub-role di role Jemaat (idempotent)
INSERT INTO sub_role (id, role_id, nama)
SELECT gen_random_uuid(), id, 'New Comer'
FROM role
WHERE nama = 'Jemaat'
ON CONFLICT DO NOTHING;
```

---

## 5. Action items BE

- [ ] Seed "New Comer" sub-role di role Jemaat (kalau belum)
- [ ] Extend `POST /auth/register` validation + handler:
  - Accept `jenisJemaat`, route ke sub-role yang sesuai
- [ ] Portal admin: pastikan ada UI untuk assign role Fulltimer + sub-role
      manual (admin → jemaat detail → roles). Sudah ada atau belum?
- [ ] Update API docs (Swagger / reference/mobile-api-guide.md)

---

## 6. Test cases

1. Happy path JEMAAT_TETAP: register dengan jenisJemaat='JEMAAT_TETAP' →
   jemaat dapat 1 role "Jemaat:Jemaat Tetap"
2. NEW_COMER: register dengan jenisJemaat='NEW_COMER' → jemaat dapat 1 role
   "Jemaat:New Comer"
3. Backwards compat: mobile lama yang tidak kirim `jenisJemaat` → default
   `JEMAAT_TETAP` (sama dengan behavior pra-2026-05-23)
4. Admin assign fulltimer manual: jemaat dengan role Jemaat:Tetap, admin
   tambah role Fulltimer:Worship via portal → user.isFulltimer auto true
   di next /auth/me/access fetch

---

## 8. Backend Response

*(diisi oleh BE setelah review)*
