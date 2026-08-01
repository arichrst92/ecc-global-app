# Backend Notice — Checkout Ibadah (Modul 26)

**Dari:** Tim Backend ECC (IDEA)
**Untuk:** Tim Mobile (Ari)
**Tanggal:** 2026-08-01
**Status:** ✅ Selesai local, pending deploy production
**Related:** [`backend-notice-shiftsoft-migration.md`](./backend-notice-shiftsoft-migration.md)

---

## TL;DR

Extend flow check-in ibadah dengan opsi **checkout** (scan QR jemaat saat keluar). Toggle per ibadah — biasanya wajib untuk ibadah anak (security tracking), opsional untuk ibadah dewasa.

Mobile perlu update:
1. Scanner: tambah mode toggle "Check-in / Checkout" — pakai endpoint berbeda
2. UI reservasi detail: tampilkan `checkedOutAt` kalau ada
3. Icon indicator status: RESERVE / JOIN (checked-in) / COMPLETED (checked-in + checked-out) / CANCEL

---

## Schema patch

### `Ibadah` +1 field

| Field | Type | Deskripsi |
|---|---|---|
| `requiresCheckout` | `Boolean @default(false)` | Toggle per ibadah — kalau `true`, wajib checkout via scan admin |

### `Reservasi` +2 field

| Field | Type | Deskripsi |
|---|---|---|
| `checkedOutAt` | `DateTime?` | Timestamp saat admin scan QR untuk checkout. NULL = belum checkout |
| `checkedOutBy` | `String? UUID` | Admin (jemaat) yang scan |

**Backward compat**: semua field nullable / default false. Mobile lama tetap jalan tanpa perubahan (tapi user experience-nya kurang lengkap).

**Migration:** `20260801000000_ibadah_checkout` — additive only, no data migration.

---

## Endpoint baru

### `POST /admin/reservasi/checkout`

Symmetric dengan existing `/admin/reservasi/checkin`.

**Auth:** WAJIB Bearer JWT (admin scanner, sama dgn checkin).

**Body:**
```json
{ "kode": "R7K2X9P" }
```

**Response 200 (sukses):**
```json
{
  "success": true,
  "message": "Checkout berhasil",
  "data": {
    "id": "uuid",
    "kode": "R7K2X9P",
    "status": "JOIN",
    "joinedAt": "2026-08-01T09:00:00Z",
    "checkedOutAt": "2026-08-01T10:30:00Z",
    "checkedOutBy": "admin-uuid",
    "jemaatId": "...",
    "ibadahId": "..."
  }
}
```

**Response 200 (idempotent — sudah pernah checkout):**
```json
{
  "success": true,
  "data": { ... },
  "message": "Sudah checkout sebelumnya (2026-08-01T10:30:00Z)"
}
```

**Errors:**
| HTTP | Kondisi | Message |
|---|---|---|
| 400 | Ibadah tidak require checkout | "Ibadah ini tidak require checkout — skip aja." |
| 400 | Reservasi status CANCEL | "Reservasi sudah dibatalkan" |
| 400 | Belum check-in (status RESERVE) | "Jemaat belum check-in — tidak bisa checkout." |
| 404 | Kode tidak ditemukan | "Kode reservasi tidak ditemukan" |

---

## Mobile UX flow

### 1. Scanner Screen — mode toggle

```
┌────────────────────────────────────────┐
│   Scanner Kehadiran                    │
├────────────────────────────────────────┤
│   [ Check-in ] [ Checkout ]           │  ← mode toggle
│                                        │
│   ┌──────────────────────────────┐    │
│   │                              │    │
│   │       CAMERA VIEWFINDER      │    │
│   │       (scan QR jemaat)       │    │
│   │                              │    │
│   └──────────────────────────────┘    │
│                                        │
│   Atau ketik manual: [_________]      │
└────────────────────────────────────────┘
```

Kalau mode = **Check-in** → POST `/admin/reservasi/checkin`
Kalau mode = **Checkout** → POST `/admin/reservasi/checkout`

### 2. Detail Reservasi — tampil status

```
┌─────────────────────────┐
│ ← Reservasi #R7K2X9P    │
├─────────────────────────┤
│ Budi Santoso            │
│ Ibadah Anak Minggu Pagi │
│ 2026-08-04              │
│                         │
│ ✅ Check-in    09:00    │
│ ✅ Checkout   10:30    │  ← baru
│                         │
│ [ Scan Checkout QR ]    │  ← show kalau requiresCheckout=true
└─────────────────────────┘  ← && belum checkout
```

### 3. Ibadah List — filter "belum checkout"

Optional feature — admin bisa lihat jemaat yang masih di dalam ibadah (untuk kids ibadah, monitoring safety):

```
GET /admin/reservasi?ibadahId=X&tanggal=2026-08-04&status=JOIN&hasNotCheckedOut=true
```

⚠️ Query param `hasNotCheckedOut` belum ada di backend — kalau mobile butuh, kirim `backend-request-*.md`.

---

## Portal admin sudah support

- Ibadah edit form: switch **"Wajib Checkout?"** dengan helper text
- Kehadiran page: tombol **"Checkout via Kode"** di header (mirror tombol Check-in via Kode)
- Modal input kode sama pattern dgn check-in — beda endpoint saja

---

## Deployment status

Local: ✅ selesai. Prod: pending deploy per 2026-08-01.

Deploy step:
1. Push commit ke origin/main
2. VPS: `git pull`
3. `prisma migrate deploy` (apply 20260801000000_ibadah_checkout)
4. `prisma generate` + `pnpm build` + `pm2 restart ecc-core-api ecc-portal --update-env`

Bundle bareng Modul 27 (Kode Jemput) + Modul 28 (Point + Hadiah) kalau mau 1x deploy, atau standalone deploy sekarang.

---

## Testing sample

```bash
JWT="<admin-jemaat-jwt>"

# 1. Set ibadah wajib checkout
curl -X PATCH -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"requiresCheckout": true}' \
  https://api.eccchurch.global/admin/ibadah/<ibadah-id>

# 2. Reservasi + check-in jemaat (existing flow)
# ... check-in via /admin/reservasi/checkin

# 3. Checkout
curl -X POST -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"kode":"R7K2X9P"}' \
  https://api.eccchurch.global/admin/reservasi/checkout
```

---

## Action items mobile

- [ ] Update scanner UI: mode toggle Check-in / Checkout
- [ ] Handle response `checkedOutAt` di reservasi detail
- [ ] (Optional) Tampil badge status "COMPLETED" kalau `checkedOutAt` != null
- [ ] (Optional) Reject scan kalau ibadah `requiresCheckout=false` di client (backend juga reject)

---

*Doc versi: 1.0 — 2026-08-01.*
