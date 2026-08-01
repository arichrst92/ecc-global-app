# Backend Notice — Ibadah Anak + Kode Jemput (Modul 27)

**Dari:** Tim Backend ECC (IDEA)
**Untuk:** Tim Mobile (Ari)
**Tanggal:** 2026-08-01
**Status:** ✅ Selesai local, pending deploy
**Related:** [`backend-notice-checkout-ibadah.md`](./backend-notice-checkout-ibadah.md) (Modul 26 checkout)

---

## TL;DR

Ibadah punya flag baru `isKidsIbadah`. Kalau ON, saat admin check-in anak backend auto-generate **6-digit kode jemput** — parent lihat kode di app. Saat jemput: admin input kode + verify → set `pickedUpAt`.

Mobile perlu update:
1. List ibadah: tampil badge 🧒 "Ibadah Anak" kalau `isKidsIbadah=true`
2. Reservasi detail (anak): tampil kode jemput 6-digit besar + reminder "Tunjukkan ke admin saat jemput"
3. (Sprint next) Menu CKids: tab khusus untuk anak (point + katalog + history)

---

## Schema patch

### `Ibadah` +1 field

| Field | Type | Deskripsi |
|---|---|---|
| `isKidsIbadah` | `Boolean @default(false)` | Flag ibadah anak — trigger pickup code + point (Modul 28) |

### `Reservasi` +3 field

| Field | Type | Deskripsi |
|---|---|---|
| `pickupCode` | `String? VarChar(6)` | 6-digit numeric, auto-gen saat check-in kalau `ibadah.isKidsIbadah=true`. Unique per (ibadah, tanggal) |
| `pickedUpAt` | `DateTime?` | Timestamp saat admin verify pickup |
| `pickedUpByJemaatId` | `String? UUID` | Parent/wali yg jemput (nullable, optional scan admin) |

**Migration:** `20260801100000_kids_ibadah_pickup` — additive.

---

## Behavior — extended check-in flow

Endpoint existing `POST /admin/reservasi/checkin` — **response berubah**:

**Kalau `ibadah.isKidsIbadah = false`** (unchanged):
```json
{
  "success": true,
  "message": "Check-in berhasil",
  "data": { ..., "pickupCode": null }
}
```

**Kalau `ibadah.isKidsIbadah = true`**:
```json
{
  "success": true,
  "message": "Check-in berhasil. Kode jemput: 483920 — sampaikan ke parent",
  "data": {
    "id": "...",
    "kode": "R7K2X9P",
    "status": "JOIN",
    "joinedAt": "2026-08-04T09:00:00Z",
    "pickupCode": "483920",  ← baru, mobile display ke parent
    "checkedInBy": "parent-jemaat-uuid",
    ...
  }
}
```

**Backward compat**: mobile lama yg ignore `pickupCode` tetap jalan. Recommended untuk mobile update UI display kode.

---

## Endpoint baru

### `POST /admin/reservasi/pickup`

Admin verify pickup code + set `pickedUpAt`. Untuk stall pickup di lokasi ibadah anak.

**Body:**
```json
{
  "pickupCode": "483920",             // wajib, 6 digit
  "kodeReservasi": "R7K2X9P",         // opsional, disambiguation
  "pickedUpByJemaatId": "uuid-parent" // opsional, scan QR parent
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Anak Budi Junior berhasil di-pickup",
  "data": {
    "reservasi": { ..., "pickedUpAt": "2026-08-04T11:00:00Z" },
    "anak": { "id": "...", "namaLengkap": "Budi Junior", "fotoUrl": null },
    "ibadahNama": "Ibadah Anak Minggu Pagi"
  }
}
```

**Errors:**
| HTTP | Kondisi |
|---|---|
| 400 | Multiple match untuk kode 6-digit — perlu kirim `kodeReservasi` juga |
| 400 | Parent jemaat tidak ditemukan |
| 400 | `kodeReservasi` tidak match dengan pickup code |
| 404 | Kode jemput tidak ada atau sudah expired (>24 jam) atau sudah di-pickup |

**Guard:**
- Cuma cari reservasi dengan `ibadah.isKidsIbadah=true`
- Cuma cari yang belum di-pickup (`pickedUpAt IS NULL`)
- Cuma cari yang sudah check-in (`status=JOIN`)
- Scope 24 jam terakhir supaya kode kemarin gak reused

---

## Mobile UX

### 1. List Ibadah — badge

```
┌─────────────────────────────────┐
│  Ibadah Minggu 04 Aug 2026     │
│  09:00 - 10:30 · Sanctuary Lt.2│
│  Weekly · Aktif                 │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  Ibadah Anak Minggu Pagi   🧒  │  ← badge tampil kalau isKidsIbadah=true
│  09:15 - 10:15 · Ruang Anak    │
│  Weekly · Aktif                 │
└─────────────────────────────────┘
```

Endpoint list: `GET /admin/ibadah` sudah include field `isKidsIbadah`. Mobile filter/render sesuai.

### 2. Reservasi Detail (Parent view)

Kalau reservasi punya `pickupCode`, tampil prominent di detail screen:

```
┌─────────────────────────────────┐
│ ← Reservasi Anak                │
├─────────────────────────────────┤
│ Budi Junior                     │
│ Ibadah Anak Minggu Pagi         │
│ 2026-08-04                      │
│                                  │
│ ✅ Check-in    09:15            │
│                                  │
│  ┌───────────────────────┐      │
│  │  KODE JEMPUT          │      │
│  │                        │      │
│  │      4 8 3 9 2 0       │      │  ← big display
│  │                        │      │
│  │  Tunjukkan ke admin    │      │
│  │  saat jemput anak      │      │
│  └───────────────────────┘      │
│                                  │
└─────────────────────────────────┘
```

Kode reusable sampai pickup — kalau app tertutup / logout / lupa, buka lagi ke reservasi detail tampil lagi.

### 3. Notif recommendation (optional)

Push notif waktu check-in sukses ibadah anak:
> "Anak Anda sudah check-in ke Ibadah Anak Minggu Pagi. Kode jemput: 483920"

Backend belum kirim WA/push otomatis — mobile bisa lokal push saat receive response check-in (yang biasanya parent tap check-in sendiri via mobile → dapat kode di response langsung).

---

## Portal admin sudah support

- Ibadah edit form: switch **"Ibadah Anak? 🧒"** + helper text
- Kehadiran page: 3 tombol scan — Check-in / Checkout / **Pickup Anak** (warna pink)
- Modal Pickup Anak: 6-digit input + optional `kodeReservasi`

---

## Deployment

Local: ✅ selesai. Prod: pending.

Deploy step:
1. Push commit
2. VPS: `git pull` + `prisma migrate deploy` + `prisma generate` + `pnpm build` + `pm2 restart --update-env`

Migration `20260801100000_kids_ibadah_pickup` — additive only, backward compat.

---

## Testing sample

```bash
JWT="<admin-jwt>"

# 1. Toggle ibadah jadi kids
curl -X PATCH -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"isKidsIbadah": true, "requiresCheckout": true}' \
  https://api.eccchurch.global/admin/ibadah/<ibadah-id>

# 2. Bikin reservasi + check-in anak → dapat kode
curl -X POST -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"kode":"R7K2X9P"}' \
  https://api.eccchurch.global/admin/reservasi/checkin
# response.data.pickupCode = "483920"

# 3. Pickup — verify kode
curl -X POST -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"pickupCode":"483920"}' \
  https://api.eccchurch.global/admin/reservasi/pickup
```

---

## Action items mobile

- [ ] Detect + display badge 🧒 di list ibadah
- [ ] Handle `pickupCode` di response check-in — tampil di reservasi detail
- [ ] (Optional) Push notif lokal saat receive pickupCode
- [ ] (Optional) Reservasi list filter: "Anak saya" — pakai JemaatRelasi.tipeRelasi='Anak' atau history checkedInBy

---

*Doc versi: 1.0 — 2026-08-01.*
