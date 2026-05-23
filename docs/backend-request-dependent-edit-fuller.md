# Backend Request: Extend Dependent Edit Endpoint dengan noHp/email

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-22
**Priority**: 🟡 **MEDIUM** — UX completeness, dependent yang sudah punya HP sendiri perlu di-promote
**Status**: ✅ **RESOLVED** (BE patch 2026-05-22c) — lihat section "Backend Response" di akhir doc.

## TL;DR

`PATCH /admin/me/family/:jemaatId/profile` saat ini accept fields:
`namaLengkap`, `tanggalLahir`, `jenisKelamin`, `alamat` saja.

User feedback iter 9 minta dependent edit "secara lengkap (foto, role, noHp, dll)
seperti edit profil sendiri". Foto sudah ada (separate endpoint), role
relationship sudah ada (separate PATCH endpoint). Yang missing: **noHp** dan
**email**.

Use case utama: anak balita yang dulu dependent (no HP) sekarang sudah remaja
dan punya HP sendiri. Guardian/parent ingin add HP ke profile mereka. Setelah
ada HP, jemaat tsb bisa di-promote dari dependent ke full member (login mandiri).

## Endpoint extension request

```http
PATCH /admin/me/family/:jemaatId/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "namaLengkap": "...",
  "tanggalLahir": "...",
  "jenisKelamin": "L"|"P",
  "alamat": "...",
  "noHp": "+628211234567",   // NEW — optional, E.164 format
  "email": "name@email.com"  // NEW — optional
}
```

## Validation

**noHp:**
- Format E.164 `+62...` (sama dengan field di self-edit)
- Optional — null/undefined untuk tidak ubah
- Empty string `""` → set to null (clear field)
- Uniqueness: BE harus check `noHp` belum dipakai jemaat aktif lain
  - Kalau sudah dipakai → 409 CONFLICT "Nomor HP sudah terdaftar di akun jemaat lain"
- **Important**: setelah noHp di-set, jemaat dapat login mandiri dengan OTP ke
  nomor itu — BE rule tetap `isDependent = (noHp == null)` automatic flag

**email:**
- Standard email validation (Zod email)
- Optional
- Uniqueness optional (kalau email digunakan untuk login di future, perlu unique)

## Authorization rules (tetap)

`assertDependentGuardian(currentJemaatId, targetJemaatId)`:
1. currentId !== targetId (bukan self-edit)
2. target exists dan active
3. target.primaryGuardianId === currentJemaatId
4. **NEW Rule**: Setelah noHp ditambahkan dan jemaat login pertama kali,
   `primaryGuardianId` perlu di-clear (atau jemaat tetap dependent sampai
   first login? Need decision)

## Schema impact

Tidak ada schema baru. Field `noHp` + `email` sudah ada di table `jemaat`.
Cuma extend Zod `editDependentJemaatSchema` di shared-types/auth.ts:

```typescript
const editDependentJemaatSchema = z.object({
  namaLengkap: z.string().min(2).max(255).optional(),
  tanggalLahir: emptyToNull(z.string().date()),
  jenisKelamin: z.enum(['L', 'P']).optional().nullable(),
  alamat: emptyToNull(z.string().max(500)),
  noHp: emptyToNull(z.string().regex(/^\+62\d{8,15}$/)),  // NEW
  email: emptyToNull(z.string().email()),                  // NEW
});
```

## Side effects (cascade)

Saat noHp ditambahkan ke dependent:
- **`isDependent` flag** otomatis flip kalau BE compute dari `noHp != null`
- **Login enable** — jemaat sekarang bisa request OTP ke noHp baru
- **Guardian relationship** — tetap exist (family link tidak putus), tapi
  jemaat tsb sekarang punya autonomi sendiri
- **Audit log** — `kind: 'dependent-promoted'` saat noHp pertama kali di-set

## UX flow di mobile

1. Guardian buka family detail anak (yang dulu dependent)
2. Tap "Edit Profil Anggota" → /settings/edit-profile?dependent=<jemaatId>
3. Form sekarang juga menampilkan field noHp + email (sebelumnya hidden)
4. Helper text: "Tambahkan nomor HP kalau anak sudah punya HP sendiri.
   Setelah ditambahkan, mereka bisa login mandiri dengan OTP."
5. Submit → BE validate uniqueness → success
6. Toast "Profil diperbarui. {Nama} sekarang bisa login mandiri kalau punya HP."

## Effort estimate BE

- Zod schema extension: 15 menit
- Uniqueness check + 409 error: 30 menit
- isDependent flag re-compute (verify existing logic): 30 menit
- Audit log entry tambahan: 15 menit
- Test cases (set, clear, conflict): 30 menit
- Document update mobile-api-guide section 13.8

Total: **~2 jam BE work**.

## Action items BE

- [ ] Extend `editDependentJemaatSchema` dengan noHp + email
- [ ] Uniqueness check di handler (return 409 kalau noHp/email duplicate)
- [ ] Update audit log entry kind = `dependent-promoted` saat noHp first-set
- [ ] Verify `isDependent` flag re-compute setelah noHp ditambahkan
- [ ] Document di mobile-api-guide section 13.8 (extend)

## Mobile-side plan (after BE ready)

- `app/settings/edit-profile.tsx`:
  - Remove `!isDependent` conditional yang hide phone+email
  - Tampil noHp + email inputs juga untuk dependent mode, dengan helper text:
    "Optional — isi kalau anak sudah punya HP sendiri"
  - Pass noHp+email ke updateDependentProfile mutation
- `src/api/family.ts` — `UpdateDependentProfilePayload` tambah noHp + email field

Mobile-side estimasi: **1 jam** setelah BE ready.

## Related

- Existing dependent edit endpoint: `backend-request-profile-edit-completeness.md`
- Mobile commit iter 9: Profile family section + dependent edit fuller scaffold

---

## ✅ Backend Response — 2026-05-22 (patch 2026-05-22c)

### Schema extension

`editDependentJemaatSchema` di `packages/shared-types/src/schemas/auth.ts`:

```typescript
export const editDependentJemaatSchema = z.object({
  namaLengkap: z.string().trim().min(2).max(255).optional(),
  tanggalLahir: z.string().date().nullable().optional(),
  jenisKelamin: z.enum(['L', 'P']).nullable().optional(),
  alamat: z.string().trim().max(500).nullable().optional(),
  // NEW — preprocess '' → null, lalu union noHpSchema | null.
  noHp: z.preprocess(
    (v) => (v === '' || v === null ? null : v),
    z.union([noHpSchema, z.null()]),
  ).optional(),
  email: z.preprocess(
    (v) => (v === '' || v === null ? null : v),
    z.union([z.string().trim().email().max(255), z.null()]),
  ).optional(),
});
```

**Semantik field:**
- `undefined` (key tidak dikirim) → skip, tidak ubah
- `null` atau `""` → clear field ke null
- string non-empty → update + uniqueness check

### Uniqueness check

Handler `PATCH /admin/me/family/:jemaatId/profile` di-tambah:

- Kalau `noHp` di-set ke value non-null AND berbeda dengan existing → query
  jemaat lain aktif dengan noHp sama. Kalau ada → **409 CONFLICT** dengan
  message `"Nomor HP +62XYZ sudah terdaftar di akun jemaat lain (<nama>)."`
- Sama untuk `email`.
- Skip kalau value sama dengan existing (no-op update tidak trigger error).
- Filter `isActive: true` di check supaya inactive jemaat dengan noHp/email
  sama tidak block — kalau perlu reactivate, admin route via portal.

### Audit log

`metadata.kind` switch antara 2 nilai:

- `dependent-promoted` — kalau `before.noHp == null && updated.noHp != null` (first-time set HP)
- `dependent-edit-mobile` — edit normal (apa pun selain promote event)

`resourceLabel` include prefix `[promote]` di promoted event untuk visibility cepat di audit log viewer.

### Sample request/response

```http
PATCH /admin/me/family/<dependent-jemaat-id>/profile
Authorization: Bearer <token>
{
  "namaLengkap": "Andi Pratama Jr.",
  "noHp": "+6281234567890",
  "email": "andi.jr@example.com"
}
```

**Success 200:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "namaLengkap": "Andi Pratama Jr.",
    "noHp": "+6281234567890",
    "email": "andi.jr@example.com",
    "primaryGuardianId": "<guardian-id>",
    ...
  }
}
```

**Errors:**
- 400 `confirmText` tidak match (Zod validation pada noHp format / email format)
- 401 caller bukan primary guardian
- 409 noHp atau email sudah dipakai jemaat aktif lain

### `isDependent` flag (no schema change needed)

Tidak ada field eksplisit `isDependent` di model `Jemaat`. Logic computed:

- **Dependent** = `primaryGuardianId != null` (relationship-based, bukan noHp-based)
- noHp == null bisa untuk balita ATAU jemaat aktif yg memang tidak mau share noHp

Setelah noHp di-set, `primaryGuardianId` TIDAK di-clear otomatis — relationship tetap exist untuk family network purpose. Promoted jemaat sekarang bisa login mandiri (OTP ke noHp baru), tapi tetap appear sebagai "dependent" di guardian's family list sampai admin explicit clear `primaryGuardianId` via portal (decision: defer admin manual cleanup, supaya family link tidak putus).

Mobile UX bisa show badge "Sudah punya HP sendiri" kalau `dependent.noHp != null` sebagai indicator promosi (tanpa mengubah behavior server).

### Action items mobile (handoff)

- [ ] `src/api/family.ts` — `UpdateDependentProfilePayload` tambah `noHp?: string | null` + `email?: string | null`
- [ ] `app/settings/edit-profile.tsx`: hapus conditional `!isDependent` yang hide phone+email; tampilkan dengan helper text "Optional — kalau anak sudah punya HP sendiri"
- [ ] Handle 409 error → toast "Nomor HP/email sudah dipakai jemaat lain"
- [ ] Optional: badge "Punya HP sendiri" di family list kalau `dependent.noHp != null`

### Notes

- **Tidak ada side effect ke session existing.** Dependent yang baru di-set noHp tidak otomatis dapat session — mereka harus explicit login OTP ke nomor itu via mobile app.
- **Reverse direction (clear noHp)**: guardian bisa kirim `"noHp": null` atau `"noHp": ""` untuk clear. Setelah clear, jemaat tidak bisa login mandiri lagi (kembali dependent-only).
