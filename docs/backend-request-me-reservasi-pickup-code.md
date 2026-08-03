# Backend Request — Parent Reservasi Endpoint + Kids Ibadah Test Data

**Dari:** Tim Mobile (Ari)
**Untuk:** Tim Backend ECC (IDEA)
**Tanggal:** 2026-08-02
**Priority:** 🟡 Medium — enable parent-side pickup code UX + smoke test M41
**Related:** [`backend-notice-kids-ibadah-pickup.md`](./backend-notice-kids-ibadah-pickup.md), [`backend-notice-checkout-ibadah.md`](./backend-notice-checkout-ibadah.md)

---

## TL;DR

Sprint 4 (M41) — Kids Bundle (Checkout scan + Pickup code) sudah **code complete** di mobile admin side.

Butuh 2 hal dari BE untuk complete E2E:

1. **Parent-side reservasi endpoint** — supaya parent bisa lihat pickup code sendiri di mobile tanpa tanya admin (currently: admin scanner tampil toast, tapi kalau parent buka app kemudian, kode hilang)
2. **Testing data** — set 1 ibadah production jadi `isKidsIbadah=true` + `requiresCheckout=true` untuk smoke test admin scanner

---

## Konteks

Sprint 4 code done:
- Admin scanner mendukung 3 mode: Check-in / Checkout / Pickup (kondisional per ibadah flag)
- Component `PickupCodeCard` reusable untuk parent view — siap integrate
- Response check-in include `pickupCode` kalau ibadah kids

Blocking parent-side use:
- Setelah admin check-in anak, response `pickupCode` cuma visible di admin scanner (toast)
- Parent tidak bisa "lookup my active reservation" — endpoint tidak ada
- Kalau parent lupa kode, harus tanya admin ulang (bad UX)

---

## Request 1 — Parent Reservasi Endpoint

### `GET /admin/me/reservasi` (BARU)

Fetch active reservasi user untuk lihat pickup code + status check-in/checkout.

**Auth:** Bearer JWT parent (any authenticated jemaat)

**Query params:**
| Param | Type | Deskripsi |
|---|---|---|
| `ibadahId` | uuid | Optional, filter by ibadah |
| `tanggal` | YYYY-MM-DD | Optional, filter by tanggal |
| `status` | RESERVE\|JOIN\|COMPLETED | Optional |
| `activeOnly` | boolean | Default true — hanya reservasi yg belum expired (last 24 jam untuk kids) |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "kode": "R7K2X9P",
      "ibadahId": "uuid",
      "tanggalIbadah": "2026-08-04",
      "status": "JOIN",
      "joinedAt": "2026-08-04T09:00:00Z",
      "checkedOutAt": null,
      "pickupCode": "483920",
      "pickedUpAt": null,
      "jemaatId": "uuid",
      "ibadah": {
        "id": "uuid",
        "nama": "Ibadah Anak Minggu Pagi",
        "jamMulai": "09:00",
        "jamSelesai": "10:30",
        "isKidsIbadah": true,
        "requiresCheckout": true
      }
    }
  ]
}
```

**Behavior:**
- Include reservasi user (`jemaatId=self`) DAN reservasi anak (via JemaatRelasi tipeRelasi='Anak' + `checkedInBy=self`)
- Kalau kids ibadah: return `pickupCode` visible ke parent
- Sort: `joinedAt` desc

**Rate limit:** admin-tier (300/menit/user).

**Alternative simpler**: kalau nested `ibadah` object heavy, cukup return flat IDs — mobile fetch ibadah detail on-demand.

---

## Request 2 — Testing Data untuk Smoke Test

### Setup 1 ibadah test dengan kids + checkout flags

Set 1 ibadah aktif production (mis. "Ibadah Anak Minggu Pagi" atau bikin dummy) dengan:

```sql
UPDATE ibadah
SET is_kids_ibadah = true,
    requires_checkout = true
WHERE id = '<pilih 1 ibadah aktif>';
```

Kasih tau UUID ibadah ini ke mobile team — akan dipakai untuk:
- Test admin scanner mode Check-in → verify pickupCode di response
- Test admin scanner mode Checkout → verify checkedOutAt set
- Test admin scanner mode Pickup → input 6-digit dari response check-in → verify pickedUpAt set
- Test error scenarios (kode expired, kode salah, dll)

**Cleanup after test:**
Tidak perlu — flags additive, tidak break flow existing.

---

## Timeline

- **Request 1** (parent endpoint):
  - Preferred: dalam 2 minggu (target v1.4.0 release)
  - Acceptable: 4 minggu (mobile ship v1.4.0 admin-only, parent view v1.4.1)

- **Request 2** (testing setup):
  - Preferred: dalam 1-2 hari (blocking smoke test)

---

## Confirmation dari BE

**Request 1:**
1. ETA + confirm path final
2. Confirm rate limit + auth model
3. Confirm reservasi anak juga included (bukan cuma reservasi diri sendiri)

**Request 2:**
1. UUID ibadah test yang diset (untuk mobile team pakai di scanner)
2. Confirm nomor kode reservasi test yang bisa dipakai (kalau perlu seed)

---

## Contact

- Mobile team: Ari (arichrst@ide.asia)
- Ref: `docs/sprint-plan-2026-q3.md` Sprint 4 Phase 4B
- Related BE notice: `backend-notice-kids-ibadah-pickup.md`

---

*Doc versi: 1.0 — 2026-08-02.*
