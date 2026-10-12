# Backend Request — Ministry Join Approval oleh Leader

**Date**: 2026-10-12
**Requester**: Mobile team (Ari)
**Priority**: 🟠 HIGH (product decision)
**Related**: `backend-request-ministry-endpoints.md` item 4 (2026-08-03 — direct-join, approval di-skip; dokumen itu sudah menyebut "kalau nanti butuh formal approval, extend endpoint + status field")

---

## Keputusan Produk (Ari, 2026-10-12)

Jemaat yang ingin bergabung ke ministry **mengajukan permintaan**, lalu **leader ministry menyetujui atau menolak**. Saat menyetujui, leader **menentukan peran pelayanan** anggota baru (boleh berbeda dari peran yang diminta).

Saat ini `POST /admin/ministry/:id/join` langsung membuat membership `ACTIVE` — perlu diubah.

---

## Request #1 — Schema

Tambah status di membership (`JemaatPelayanan`), atau tabel terpisah `PelayananJoinRequest` — silakan BE pilih. Field yang dibutuhkan:

| Field | Keterangan |
|---|---|
| `status` | `PENDING` / `ACTIVE` / `REJECTED` (membership lama di-migrate = `ACTIVE`) |
| `requestedRoleId` | peran yang dipilih pemohon (nullable) |
| `motivasi` | catatan pemohon (sudah ada di payload join) |
| `reviewedBy`, `reviewedAt` | jemaat yang approve/reject + waktu |
| `rejectReason` | alasan penolakan (nullable) |

Semua query anggota (`memberCount`, `members[]`, `/admin/me` ministries, jadwal) **hanya hitung `ACTIVE`**.

## Request #2 — Ubah `POST /admin/ministry/:id/join`

Body tetap `{ roleId?, motivasi? }`. Response:
```json
{
  "membershipId": "uuid",
  "status": "PENDING",
  "ministry": { "id": "uuid", "nama": "Worship Team" },
  "posisi": "Singer"
}
```
- `posisi` = nama peran yang **diminta**
- Sudah ada request `PENDING` → `409 CONFLICT` ("Permintaan Anda masih menunggu persetujuan")
- Sudah anggota `ACTIVE` → `409` seperti sekarang
- Pernah `REJECTED` → boleh mengajukan lagi (buat `PENDING` baru)
- Notif ke leader (in-app + WA kalau aktif): type **`MINISTRY_JOIN_REQUESTED`**, meta `{ ministryId, requestId }`

## Request #3 — Tambah field di `GET /admin/ministry/:id`

```json
{
  "...field existing...": "",
  "myMembership": null,
  "myJoinRequest": {
    "id": "uuid",
    "status": "PENDING",
    "requestedRole": { "id": "uuid", "nama": "Singer", "level": 1 },
    "motivasi": "Saya biasa nyanyi di homecell",
    "createdAt": "2026-10-12T08:00:00Z",
    "rejectReason": null
  },
  "canManageRequests": true,
  "pendingRequestCount": 3
}
```
- `myMembership` tetap hanya untuk `ACTIVE`
- `myJoinRequest` = request terakhir user (PENDING atau REJECTED terbaru); `null` kalau tidak ada / sudah ACTIVE
- `canManageRequests` = boleh approve/reject. Minimal: **leader ministry**. BE boleh tambahkan role lain (mis. level tertinggi / admin cabang / Fulltimer) — mobile hanya baca flag ini.
- `pendingRequestCount` = jumlah request PENDING (0 kalau `canManageRequests=false`)

(Opsional) `GET /admin/ministry` list: tambah `pendingRequestCount` untuk badge di list.

## Request #4 — Endpoint Leader

```
GET  /admin/ministry/:id/join-requests              (status PENDING, urut createdAt ASC)
POST /admin/ministry/:id/join-requests/:reqId/approve   { "roleId": "uuid" }
POST /admin/ministry/:id/join-requests/:reqId/reject    { "reason": "opsional, max 300" }
```
Response list:
```json
[
  {
    "id": "uuid",
    "createdAt": "2026-10-12T08:00:00Z",
    "motivasi": "...",
    "requestedRole": { "id": "uuid", "nama": "Singer", "level": 1 },
    "jemaat": {
      "id": "uuid", "namaLengkap": "Dewi", "kode": "ABC23XYZ",
      "fotoUrl": null, "noHp": "+62...",
      "cabang": { "id": "uuid", "nama": "ECC Bandung" }
    }
  }
]
```
- Guard: `canManageRequests` → selain itu `403`
- Approve: `roleId` **wajib** dan harus role milik ministry ini → membership `ACTIVE` dengan role tsb, `sinceDate = now`. Notif ke pemohon: **`MINISTRY_JOIN_APPROVED`**, meta `{ ministryId }`
- Reject: status `REJECTED` + reason. Notif: **`MINISTRY_JOIN_REJECTED`**, meta `{ ministryId }`
- Request sudah bukan PENDING → `409` (idempotent-safe kalau 2 leader klik bersamaan)

## Request #5 — Batalkan Request Sendiri (opsional, disarankan)

```
DELETE /admin/ministry/:id/join-request
```
Hapus/akhiri request PENDING milik user. `404` kalau tidak ada.

---

## Mobile Side (sudah disiapkan)

- Join → kalau `status: "PENDING"` tampil "Permintaan terkirim, menunggu persetujuan leader"; kartu status menunggu + tombol batalkan
- Leader (`canManageRequests`) melihat section **"Permintaan Bergabung (N)"** di detail ministry → tap → popup: data pemohon, motivasi, **pilih peran** (default = peran yang diminta) → Setujui / Tolak (alasan opsional)
- Notif `MINISTRY_JOIN_*` dibuka ke halaman ministry
- Selama BE belum deploy: field baru tidak ada → UI lama (direct join) tetap jalan, endpoint baru `404` → section leader disembunyikan. Tidak ada regresi.

## Testing

```bash
# Jemaat A request
curl -X POST -H "Authorization: Bearer $TOK_A" -H "Content-Type: application/json" \
  https://api.eccchurch.global/admin/ministry/$MID/join -d '{"roleId":"'$ROLE_SINGER'","motivasi":"test"}'
# → status PENDING; detail A: myMembership null, myJoinRequest.status PENDING; memberCount tidak bertambah

# Leader list + approve dengan peran berbeda
curl -H "Authorization: Bearer $TOK_LEADER" https://api.eccchurch.global/admin/ministry/$MID/join-requests
curl -X POST -H "Authorization: Bearer $TOK_LEADER" -H "Content-Type: application/json" \
  https://api.eccchurch.global/admin/ministry/$MID/join-requests/$REQ/approve -d '{"roleId":"'$ROLE_MUSIC'"}'
# → A jadi ACTIVE dengan posisi Music; notif MINISTRY_JOIN_APPROVED ke A

# Non-leader coba list → 403
```

---

Reply via `docs/be-update-*.md` atau chat.
