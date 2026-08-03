# Backend Request — Walk-in Endpoint Accept Kode Alternate

**Dari:** Tim Mobile (Ari)
**Untuk:** Tim Backend ECC (IDEA)
**Tanggal:** 2026-08-03
**Priority:** 🟡 Medium — enable mobile adopt walk-in flow per BE notice 2026-08-03
**Related:** [`backend-notice-scanner-walkin-flow.md`](./backend-notice-scanner-walkin-flow.md)

---

## TL;DR

Mobile mau adopt `POST /admin/reservasi/walk-in` untuk parity dgn Ckids web (per BE notice 2026-08-03). Blocker: endpoint accept `jemaatId` UUID, tapi mobile scanner cuma dapat `kode` 8-char dari QR scan (tidak punya jemaatId sampai lookup).

Request: **tambah alternate accept `kode` di walk-in endpoint** (mirror pattern homecell/group `by-kode`). Mobile bisa langsung POST `{ kode, ibadahId, tanggalIbadah, action }` tanpa extra lookup call.

---

## Konteks

Mobile scanner ibadah flow:
1. Admin scan QR profile jemaat → dapat `kode` 8-char (`ANAK1234`)
2. Mau POST walk-in dgn context ibadah (dari route param) + action (dari mode toggle)

Existing walk-in body:
```json
{ "jemaatId": "uuid", "ibadahId": "uuid", "tanggalIbadah": "2026-08-04", "action": "checkin" }
```

Blocker: mobile tidak punya `jemaatId` — cuma `kode`. Butuh 1 extra API call untuk resolve (mis. `/admin/jemaat/lookup?kode=X`). Extra roundtrip + latency + N+1 kalau batch.

---

## Request Detail

### Extend `POST /admin/reservasi/walk-in` body

Accept **EITHER** `jemaatId` (existing) ATAU `kode` (baru). Rule input: kirim salah satu, bukan kedua-nya.

**Existing (tetap jalan):**
```json
{
  "jemaatId": "uuid",
  "ibadahId": "uuid",
  "tanggalIbadah": "2026-08-04",
  "action": "checkin"
}
```

**Baru (mobile-friendly):**
```json
{
  "kode": "ANAK1234",
  "ibadahId": "uuid",
  "tanggalIbadah": "2026-08-04",
  "action": "checkin"
}
```

**Backend behavior:**
- Kalau body kirim `kode`: lookup jemaat by `kode` (case-insensitive, uppercase-normalize)
- Kalau ketemu → treat `jemaat.id` sebagai jemaatId dari input
- Kalau tidak ketemu / jemaat nonaktif → 404 "Kode jemaat tidak ditemukan"
- Rest of flow identik (upsert reservasi, generate pickupCode, dll)

**Response shape:** sama, tidak berubah.

**Errors tambahan:**
| HTTP | Kondisi | Message |
|---|---|---|
| 400 | Body kirim BOTH jemaatId + kode | "Kirim salah satu: jemaatId atau kode" |
| 404 | Kode tidak ditemukan / jemaat nonaktif | "Jemaat dgn kode X tidak ditemukan" |

---

## Alternative Considered

**Opsi B**: Bikin endpoint separate `POST /admin/reservasi/walk-in/by-kode`.
- Pros: cleaner separation, tidak conflict di zod schema
- Cons: 2 endpoint untuk same logical operation

Pilihan mana lebih clean bagi BE — either OK untuk mobile.

**Opsi C**: Mobile lookup jemaat dulu via existing endpoint sebelum walk-in.
- Butuh endpoint: `GET /admin/jemaat/by-kode/:kode` (belum ada, atau ada tapi Fulltimer-only)
- Extra API call per scan
- Not preferred karena latency

---

## Effort Estimate BE

Small — reuse jemaat lookup helper dari homecell/group by-kode endpoints yg sudah ada. Same pattern.

---

## Timeline

- **Preferred**: dalam 1-2 hari (blocking mobile Sprint 4 walk-in adoption)
- **Acceptable**: 1 minggu (mobile refactor delayed ke Sprint 5)
- **Kalau ditunda >1 minggu**: mobile keep existing kode-reservasi based scanner, walk-in adoption defer ke v1.6.0+

---

## Confirmation dari BE

Kalau OK:
1. ETA
2. Confirm approach (Opsi A vs B)
3. Confirm behavior kalau body kirim both jemaatId + kode

Kalau ada blocker (mis. zod discriminated union complexity):
- Discuss di ECC repo issue

---

## Contact

- Mobile team: Ari (arichrst@ide.asia)
- Ref: `docs/backend-notice-scanner-walkin-flow.md`
- Related sprint: `docs/sprint-plan-2026-q3.md` Sprint 4 (v1.4.0)

---

*Doc versi: 1.0 — 2026-08-03.*
