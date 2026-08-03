# Backend Notice — Scanner Walk-in Flow (Konsistensi dgn Ckids)

**Dari:** Tim Backend ECC (IDEA)
**Untuk:** Tim Mobile (Ari)
**Tanggal:** 2026-08-03
**Priority:** 🟡 Medium — UX improvement, optional refactor Sprint 5/6
**Status:** 🚀 Backend LIVE (endpoint sudah production per 2026-08-03)
**Related:** [`backend-notice-checkout-ibadah.md`](./backend-notice-checkout-ibadah.md), [`backend-notice-kids-ibadah-pickup.md`](./backend-notice-kids-ibadah-pickup.md)

---

## TL;DR

Ckids web sudah pakai flow **walk-in universal** (scan QR profile jemaat → auto detect/pilih ibadah → 1-tap check-in / checkout / pickup). Mobile admin scanner (M41) sekarang masih pakai flow **kode-reservasi based** (scan QR kode reservasi → tap action).

Untuk konsistensi cross-platform + support walk-in tanpa reservasi upfront, mobile bisa switch pakai endpoint yang sama dengan ckids: `POST /admin/reservasi/walk-in`.

**Backend endpoint sudah live**. Mobile side optional refactor — flow existing tetap jalan.

---

## Perbandingan Flow Sekarang

| Aspek | Ckids web (`/ibadah`) | Mobile admin scanner (M41) |
|---|---|---|
| Input | Scan QR **profile jemaat** atau search nama | Scan QR **kode reservasi** existing |
| Endpoint check-in | `POST /admin/reservasi/walk-in { action: 'checkin' }` | `POST /admin/reservasi/checkin { kode }` |
| Endpoint checkout | `walk-in { action: 'checkout' }` | `POST /admin/reservasi/checkout { kode }` |
| Endpoint pickup | `walk-in { action: 'pickup' }` **atau** kode 6-digit | `POST /admin/reservasi/pickup { pickupCode }` |
| Prasyarat reservasi | Tidak — auto-create kalau belum ada | Butuh reservasi existing dulu (RESERVE → JOIN) |
| Auto-detect ibadah | Ya (via `GET /admin/reservasi/active-today`) | Tidak — kode reservasi built-in ibadahId |

---

## Endpoint Baru untuk Mobile

### `POST /admin/reservasi/walk-in`

**Auth:** Bearer JWT admin/Fulltimer (rate limit 300/menit)

**Request body:**
```json
{
  "jemaatId": "uuid",
  "ibadahId": "uuid",
  "tanggalIbadah": "2026-08-04",
  "action": "checkin"
}
```

**Field `action`**: `'checkin' | 'checkout' | 'pickup'`

**Behavior per action**:
- `checkin`: upsert reservasi (create baru atau flip RESERVE→JOIN). Generate `kode` + `pickupCode` kalau kids ibadah.
- `checkout`: cari reservasi existing (jemaat + ibadah + tanggal) → set `checkedOutAt`. Guard: `ibadah.requiresCheckout` harus true.
- `pickup`: cari kids reservasi existing → set `pickedUpAt`. Skip validate pickupCode karena admin verify fisik via scan QR anak.

**Response 200/201:**
```json
{
  "success": true,
  "data": {
    "reservasi": {
      "id": "uuid",
      "kode": "R7K2X9P",
      "status": "JOIN",
      "joinedAt": "2026-08-04T09:00:00Z",
      "checkedOutAt": null,
      "pickedUpAt": null,
      "pickupCode": "483920"
    },
    "jemaat": {
      "id": "uuid",
      "namaLengkap": "Budi Junior",
      "kode": "ANAK1234"
    },
    "ibadahNama": "Ibadah Anak Minggu Pagi",
    "pickupCode": "483920"
  },
  "message": "Check-in berhasil. Kode jemput: 483920"
}
```

**Errors:**
| HTTP | Kondisi | Message |
|---|---|---|
| 404 | Jemaat tidak ditemukan | "Jemaat tidak ditemukan" |
| 400 | Jemaat/ibadah tidak aktif | "Ibadah tidak valid / tidak aktif" |
| 400 | Checkout tapi belum check-in | "Jemaat belum check-in di ibadah ini" |
| 400 | Ibadah bukan kids (untuk pickup) | "Ibadah ini bukan ibadah anak" |

### `GET /admin/reservasi/active-today?jemaatId=<id>&mode=<checkout|pickup|none>`

Helper untuk auto-detect ibadah aktif hari ini per jemaat. Return array reservasi status=JOIN.

**Mode filter:**
- `checkout`: hanya reservasi ibadah `requiresCheckout=true` yang belum di-checkout
- `pickup`: hanya reservasi kids yang belum di-pickup
- `none`: semua reservasi JOIN hari ini

Pakai ini di mobile untuk 1-tap checkout/pickup — kalau single hit, auto-fill ibadahId ke walk-in call.

---

## Recommended Mobile UI Flow

Mirror ckids `/ibadah` page:

**1. Search/Scan Jemaat**
- Scan QR profile jemaat (kode 8-char), atau search by nama/kode

**2. Action Panel** (context-aware berdasarkan reservasi active-today)
- Kalau belum check-in di ibadah manapun → tampilkan tombol **[Check-in]** + dropdown pilih ibadah
- Kalau sudah check-in + ibadah `requiresCheckout` → tampilkan **[Checkout]** (auto-detect ibadah)
- Kalau kids ibadah + status JOIN + belum pickup → tampilkan **[Pickup]** (auto-detect)

**3. Post-action**
- Kids ibadah check-in → show dialog award point (existing endpoint `/point/award`)
- Success toast + auto-back ke scanner

**Kode 6-digit input**: keep as fallback path (parent tunjukin kode di app) — endpoint terpisah `POST /admin/reservasi/pickup { pickupCode }` masih valid.

---

## Backward Compat

**Endpoint existing tetap live** — mobile lama tidak break:
- `POST /admin/reservasi/checkin { kode }` — masih jalan
- `POST /admin/reservasi/checkout { kode }` — masih jalan
- `POST /admin/reservasi/pickup { pickupCode }` — masih jalan

Mobile bisa refactor bertahap — misal check-in dulu pakai walk-in, checkout+pickup nanti.

---

## Migrasi Bertahap — Sprint Suggestion

**Sprint 5 (kalau mau adopt)**:
- [ ] `src/api/reservasi.ts` — add `walkInReservasi({ jemaatId, ibadahId, tanggalIbadah, action })`
- [ ] `src/api/reservasi.ts` — add `getActiveToday(jemaatId, mode?)`
- [ ] Scanner screen: switch scan QR reservasi → scan QR profile jemaat
- [ ] Action panel: pakai `getActiveToday` untuk 1-tap detect

**Sprint 6+ (kalau ditunda)**:
- Keep flow existing, hanya perlu tambah support 6-digit pickup code (kalau belum implement)

**Effort estimate**: ~2-3 hari mobile side untuk full refactor Sprint 5.

---

## Kenapa Walk-in Lebih Baik?

1. **Support walk-in tanpa reservasi upfront** — jemaat datang tanpa reserve dulu, admin langsung check-in via scan QR profile
2. **Konsisten cross-platform** — jemaat scan QR yang sama (profile kode) di semua touchpoint
3. **Reduce friction admin** — tidak perlu jemaat cari email reservasi/screenshot kode dulu
4. **Auto-detect ibadah aktif** — 1-tap checkout/pickup tanpa dropdown
5. **Idempotent** — safe untuk retry kalau network drop

Trade-off: butuh 2 QR scan atau 1 scan + search (kalau ibadah multi hari yang sama), tapi UX end-to-end lebih smooth untuk mayoritas kasus.

---

## Confirmation dari Mobile

Kalau OK dan mau adopt:
1. Confirm sprint target (5 vs 6 vs later)
2. Reply di doc ini kalau ada blocker (mis. QR profile jemaat belum ada di mobile scanner)
3. Kalau ada edge case atau flow yg beda, discuss di ECC repo issue

Kalau skip / defer:
- Backend flow lama tetap live → tidak ada action needed

---

## Contact

- Backend team: IDEA dev
- Ref implementation: `apps/ckids/src/app/ibadah/page.tsx` (ckids scanner ref)
- Backend endpoint: `apps/core-api/src/routes/admin/reservasi.ts` (walk-in handler)

---

*Doc versi: 1.0 — 2026-08-03.*
