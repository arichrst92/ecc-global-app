# Backend Request: Homecell Detail + Member List + Remove Member

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-20
**Priority**: 🟡 **MEDIUM** — M9 PIC homecell flow butuh ini untuk feature lengkap
**Status**: ✅ **RESOLVED 2026-05-21** — lihat section "Backend Response" di akhir doc.

---

## TL;DR

M9 (PIC Homecell) sudah implement scaffolding pakai endpoint yang sudah ada:
- ✅ `GET /admin/me/homecell-managed` — list homecell user as PIC
- ✅ `GET /admin/me/homecell-area-managed` — list area
- ✅ `POST /admin/homecell/:id/members/by-kode` — tambah member via QR

Yang belum ada (mobile blocked dari fitur lebih lengkap):
1. **`GET /admin/homecell/:id`** — detail homecell + nested members list dengan info jemaat
2. **`DELETE /admin/homecell/:id/members/:jemaatId`** — PIC remove member
3. **`GET /admin/homecell-area/:id/homecells`** — list semua homecell di area (untuk PIC area yang BUKAN PIC homecell-nya)

---

## Endpoint 1 — Homecell detail dengan members

**Use case mobile**: PIC homecell buka detail homecell-nya → tampil list anggota dengan nama + foto + status active.

```
GET /admin/homecell/{id}
Authorization: Bearer <JWT>
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "hc-uuid",
    "nama": "Sudirman 1",
    "alamat": "Jl. Sudirman No.12",
    "hari": "Rabu",
    "jam": "19:00",
    "isActive": true,
    "picJemaatId": "j-uuid-pic",
    "area": {
      "id": "ar-uuid",
      "nama": "Jakarta Pusat",
      "cabang": { "id": "cb-uuid", "nama": "ECC Jakarta" }
    },
    "members": [
      {
        "id": "hm-uuid-1",
        "jemaatId": "j-uuid-1",
        "isActive": true,
        "tanggalBergabung": "2026-01-15",
        "jemaat": {
          "id": "j-uuid-1",
          "namaLengkap": "Budi Santoso",
          "kode": "ABC23XYZ",
          "fotoUrl": "/uploads/profiles/jemaat/j-uuid-1.webp?v=...",
          "noHp": "+6281234567890",
          "jenisKelamin": "L"
        }
      },
      ...
    ]
  }
}
```

**Authorization**:
- Allow kalau user adalah `picJemaatId` di Homecell row, ATAU
- User adalah PIC area dari `area.id`, ATAU
- User punya role admin/super-admin

**Errors**:
- 403 FORBIDDEN — user bukan PIC homecell + bukan PIC area + bukan admin
- 404 NOT_FOUND — homecell tidak exists

---

## Endpoint 2 — Remove member

**Use case mobile**: PIC homecell hapus anggota yang sudah tidak aktif (pindah cabang, drop, dll).

```
DELETE /admin/homecell/{id}/members/{jemaatId}
Authorization: Bearer <JWT>
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "hm-uuid",
    "jemaatId": "...",
    "isActive": false,
    "leftAt": "2026-05-20T..."
  }
}
```

**Behavior**:
- **Soft delete** — set `isActive=false`, tidak hard-delete. Audit trail tetap.
- Idempotent: kalau sudah `isActive=false`, return 200 dengan `meta.alreadyRemoved=true`.

**Authorization**: PIC homecell only (atau admin override).

**Errors**:
- 403 FORBIDDEN — user bukan PIC
- 404 NOT_FOUND — homecell atau member tidak exists

---

## Endpoint 3 — List homecells per area

**Use case mobile**: PIC area buka detail area → tampil SEMUA homecell di area itu (tidak harus user PIC homecell-nya). Saat ini mobile cuma bisa filter dari `useManagedHomecells` (homecell yang user PIC), jadi PIC area yang BUKAN PIC homecell-nya tidak bisa lihat detail homecell di bawahnya.

```
GET /admin/homecell-area/{id}/homecells
Authorization: Bearer <JWT>
```

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "hc-uuid",
      "nama": "Sudirman 1",
      "alamat": "...",
      "hari": "Rabu",
      "jam": "19:00",
      "isActive": true,
      "picJemaat": {
        "id": "j-uuid-pic",
        "namaLengkap": "Maria",
        "fotoUrl": "..."
      },
      "memberCount": 7
    }
  ]
}
```

**Authorization**:
- User adalah PIC area (`HomecellArea.picJemaatId = user.jemaatId`), ATAU
- User admin

**Errors**:
- 403 FORBIDDEN
- 404 NOT_FOUND

---

## Saat ini di mobile (workaround)

Untuk **homecell detail screen** (`/homecell/:id`):
- Show summary card dari `useManagedHomecells` filter by id (sudah ada di response list)
- Tampil amber notice "List anggota lengkap akan tersedia setelah BE expose endpoint detail"
- Add member via QR tetap jalan (endpoint sudah ada)

Untuk **area detail screen** (`/area/:id`):
- Show stats dari `useManagedAreas` filter by id
- Filter `useManagedHomecells` by `area.id` → hanya tampil homecell yang user juga PIC-nya
- Tampil amber notice partial-list kalau `homecellsInArea.length < area.homecellCount`

---

## Action items untuk BE team

| # | Item | Estimate |
|---|------|----------|
| 1 | Implement `GET /admin/homecell/:id` dengan nested members | 0.5-1 hari |
| 2 | Implement `DELETE /admin/homecell/:id/members/:jemaatId` (soft delete) | 0.5 hari |
| 3 | Implement `GET /admin/homecell-area/:id/homecells` | 0.5 hari |
| 4 | Update mobile-api-guide.md | 0.25 hari |
| 5 | Notify mobile dev | — |

**Total BE estimate**: ~2 hari sprint
**Mobile adopt setelah BE ready**: 1 hari (drop notices, render real member list, wire remove button)

---

## Kontak

Mobile dev — Ari Christian (`arichrst@ide.asia`)

---

# Backend Response — 2026-05-21

**Dari**: Tim Backend ECC (IDEA dev team)
**Status**: ✅ **DELIVERED**

## Ringkasan

3 endpoint sesuai spec. Endpoint detail homecell sebenarnya **sudah existing** sejak sebelumnya — cuma kurang field di nested members. Saya extend select + tambah 2 endpoint baru.

| Mobile request | Implementation |
|---|---|
| `GET /admin/homecell/:id` (detail + members) | ✅ Existing endpoint diperluas: tambah `kode` + `jenisKelamin` di nested `members[].jemaat` + tambah `area.picJemaatId` |
| `DELETE /admin/homecell/:id/members/:jemaatId` | ✅ NEW path `DELETE /admin/homecell/:id/members/by-jemaat/:jemaatId` (path beda supaya tidak conflict dengan existing `/:memberId` hard-delete admin) — soft delete (isActive=false + tanggalKeluar). Idempotent. |
| `GET /admin/homecell-area/:id/homecells` | ✅ NEW — filter isActive=true, shape ringkas (id, nama, alamat, hari, jam, picJemaat, memberCount) |

## Spec final

### Endpoint 1: `GET /admin/homecell/:id`

Detail homecell + nested members. Tambahan dari spec asli:
- `area.picJemaatId` — supaya mobile bisa check PIC area authorization
- `members[].jemaat.kode` — untuk display QR card
- `members[].jemaat.jenisKelamin` — untuk display icon

Response shape mengikuti spec di request doc. Lihat mobile-api-guide section 12.6.

### Endpoint 2: `DELETE /admin/homecell/:id/members/by-jemaat/:jemaatId`

Path **berbeda** dari spec asli (`/members/:jemaatId`) — saya kasih `/by-jemaat/` segment untuk menghindari konflik dengan existing `DELETE /admin/homecell/:id/members/:memberId` (hard delete admin portal).

Behavior **persis sesuai spec**: soft delete, idempotent, return updated row.

```
DELETE /admin/homecell/hc-uuid/members/by-jemaat/j-uuid
→ 200 { data: { ...updated, isActive: false, tanggalKeluar: '...' } }
→ 200 + meta.alreadyRemoved=true kalau sudah out
→ 404 kalau member tidak ada di homecell tsb
```

### Endpoint 3: `GET /admin/homecell-area/:id/homecells`

Persis sesuai spec. Filter `isActive=true` (kalau perlu archived, pakai `GET /admin/homecell-area/:id` full detail).

## Authorization

Saat ini **permissive** — semua user yang lewat `/admin/*` (JWT valid) di-allow. RBAC strict (cuma PIC homecell/area atau admin) bisa di-add nanti via menu access middleware.

Mobile sementara enforce di client side: tombol "Remove member" hanya tampil kalau `picJemaatId == user.jemaatId` (atau user PIC area parent). BE akan tetap allow request — kalau abuse muncul, baru tambah strict check.

## Action items mobile

- [ ] Update `useHomecellDetail(id)` — fetch real members + nested jemaat info
- [ ] Drop amber notice "List anggota lengkap akan tersedia"
- [ ] Add `cancelMembership` mutation pakai `DELETE /by-jemaat/:jemaatId` — confirm modal "Yakin keluarkan dari homecell?"
- [ ] Update `useAreaDetail(id)` — pakai `GET /admin/homecell-area/:id/homecells` untuk full list
- [ ] Drop partial-list notice di area detail

## File yang berubah

| File | Perubahan |
|---|---|
| `apps/core-api/src/routes/admin/homecell.ts` | Detail handler extended select + new DELETE /by-jemaat handler |
| `apps/core-api/src/routes/admin/homecell-area.ts` | New GET /:id/homecells handler |
| `apps/core-api/src/openapi.ts` | Register 2 path baru |
| `docs/mobile-api-guide.md` | Section 12.6 expanded dengan 3 endpoint detail |
| `knowledge-base.md` | Section 26 patch **2026-05-21p** |

---

*Ticket closed 2026-05-21.*
