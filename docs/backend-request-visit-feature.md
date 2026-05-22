# Backend Handoff: Visit feature (Movement)

**Untuk**: Mobile dev (Ari Christian)
**Dari**: Tim Backend ECC
**Tanggal**: 2026-05-22
**Priority**: 🟢 **NORMAL** — fitur baru
**Status**: ✅ **READY** — endpoints + schema deployed, awaiting mobile UI

## TL;DR

Fitur **Visit** (Movement → Visit): jemaat A bertemu jemaat B di dunia
nyata, A scan QR kode B di mobile → row Visit langsung tercipta. A set
judul + lokasi (opsional) saat scan. Setelah itu A & B masing-masing
bisa nulis "note" untuk lawan bicaranya.

Portal admin hanya menampilkan daftar (read-only) + delete moderasi —
**aktivitas inti di mobile app**.

## Schema (Prisma → DB)

```prisma
model Visit {
  id                String   @id @default(uuid())
  initiatorJemaatId String   // = jemaat yang melakukan scan
  targetJemaatId    String   // = jemaat pemilik QR yang di-scan
  judul             String   // single shared, di-set initiator
  lokasi            String?  // text bebas (opsional)
  noteDariInitiator String?  // A nulis tentang B (visible ke keduanya)
  noteDariTarget    String?  // B nulis tentang A (visible ke keduanya)
  tanggalVisit      DateTime @default(now())
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

Constraint: tidak bisa scan diri sendiri (`targetKode` resolve ke `initiator` → 400).

## Endpoint mobile — `/admin/me/visits/*`

Semua endpoint pakai **JWT Bearer** (sama dengan endpoint /admin/me lainnya).
`req.user.jemaatId` = current jemaat.

### 1. List visit saya

```http
GET /admin/me/visits
  ?role=all|initiator|target   (default: all)
  &from=YYYY-MM-DD             (optional)
  &to=YYYY-MM-DD               (optional)
  &search=<keyword>            (judul/lokasi)
  &page=1&limit=20
  &sortBy=tanggalVisit&sortOrder=desc
```

**Response shape** (sudah dibentuk dari perspektif caller):

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "judul": "Kunjungan ke Pak Budi",
      "lokasi": "Cafe Senopati",
      "tanggalVisit": "2026-05-22T08:30:00.000Z",
      "createdAt": "2026-05-22T08:30:00.000Z",
      "updatedAt": "2026-05-22T08:35:00.000Z",
      "iAmInitiator": true,
      "lawan": {
        "id": "uuid-jemaat-b",
        "namaLengkap": "Budi Santoso",
        "fotoUrl": "/uploads/profiles/jemaat/uuid.webp",
        "noHp": "+6281234567890",
        "cabang": { "id": "...", "nama": "ECC Pusat" }
      },
      "myNote": "Beliau sharing tentang ...",
      "noteLawan": null
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 12, "totalPages": 1 }
}
```

`iAmInitiator: true` → caller adalah yang scan.
`lawan` = peserta lawan (siapapun yang bukan caller).
`myNote` = note yang ditulis caller. `noteLawan` = note dari lawan.

### 2. Create visit (scan QR)

```http
POST /admin/me/visits
Content-Type: application/json

{
  "targetKode": "A1B2C3D4",      // kode QR jemaat yang di-scan
  "judul": "Kunjungan rumah",     // wajib, 2-255 chars
  "lokasi": "Komplek X No 12"     // opsional, max 500 chars
}
```

**Error cases:**
- `404` — kode tidak ditemukan
- `400` — target sudah nonaktif
- `400` — `targetKode` resolve ke diri sendiri

Response: 201 + shaped object (sama dengan list item shape).

### 3. Detail

```http
GET /admin/me/visits/:id
```

Hanya bisa di-akses kalau caller = initiator atau target. Selain itu 403.

### 4. Edit judul / lokasi (initiator-only)

```http
PATCH /admin/me/visits/:id
Content-Type: application/json

{ "judul": "...", "lokasi": "..." }   // keduanya opsional, min satu wajib
```

403 kalau caller bukan initiator.

### 5. Edit own note (initiator OR target)

```http
PATCH /admin/me/visits/:id/note
Content-Type: application/json

{ "note": "Catatan saya tentang lawan..." }   // string kosong = hapus
```

Auto-routing: kalau caller initiator → update `noteDariInitiator`;
kalau target → update `noteDariTarget`. UI mobile tidak perlu tahu sisi-nya.
Max 2000 chars.

### 6. Cancel visit (initiator-only, dalam 1 jam)

```http
DELETE /admin/me/visits/:id
```

- Hanya initiator yang bisa
- Hanya kalau visit < 1 jam pasca create (untuk fix typo / mis-scan)
- Setelah 1 jam → 409 (hubungi admin untuk hapus via portal)

## Suggested mobile UX

1. **Entry point** — di QuickAccess atau tab Movement, button "Visit".
2. **Scan flow** — pakai existing QR scanner (sama dengan family-link).
   Setelah scan → modal input judul + lokasi → submit.
3. **List screen** — tampilkan visit chronological, group by tanggal.
   Badge "Saya yang scan" / "Di-scan saya" pakai `iAmInitiator`.
4. **Detail screen** — header judul + lokasi + tanggal,
   kemudian dua kartu: lawan profile + 2 note section (myNote editable,
   noteLawan read-only).
5. **Edit modes**:
   - Tap "Edit judul" — hanya muncul kalau `iAmInitiator`.
   - Tap myNote area — buka editor.

## Portal admin — sudah selesai

- Sidebar group **Movement** → menu **Visit**
- `/dashboard/visit` list page (filter cabang/tanggal/search)
- Delete moderasi (audit logged)
- RBAC: menuKey `visit`, default Fulltimer dapat full access via migration backfill

## Catatan TZ

Sesuai patch `2026-05-22b` (ibadah TZ fix), tanggal-filter di endpoint
list pakai UTC-bound. Field `tanggalVisit` adalah `TIMESTAMP` full (bukan
`@db.Date`) karena waktu visit relevan (mis. "10:30 pagi"). Display di
mobile cukup pakai `Date.toLocaleString` (TZ-safe untuk timestamp).

## Action items mobile

- [ ] `src/api/visit.ts` — create, list, detail, patch (meta + note), delete
- [ ] `src/types/visit.ts` — Visit interface (samakan dengan response shape)
- [ ] `src/hooks/useMyVisits.ts` — infinite scroll list
- [ ] `app/visit/index.tsx` — list screen
- [ ] `app/visit/scan.tsx` — scanner + create modal
- [ ] `app/visit/[id].tsx` — detail + edit note
- [ ] Tab entry / QuickAccess link

## Migration deployment

```bash
# Backend tim sudah commit + apply migration di dev.
# Untuk env lain:
cd packages/database
DATABASE_URL=... npx prisma migrate deploy
```

Migration name: `20260522100000_movement_visit`. Aman: tidak modifikasi
table existing, hanya CREATE TABLE visit + insert role_menu_access untuk
'visit' menuKey ke role Fulltimer.

---

Backend ready untuk integrasi. Tinggal mobile build UI-nya. Tanya kalau ada
edge case yang belum ke-cover di doc ini.
