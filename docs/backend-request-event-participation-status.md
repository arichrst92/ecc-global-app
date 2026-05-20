# Backend Request: GET Event Participation Status untuk Mobile User

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-20
**Priority**: 🟡 **MEDIUM** — UX issue, ada workaround tapi tidak ideal
**Status**: Pending

---

## TL;DR

Mobile butuh cara untuk **fetch status registrasi user di sebuah event** dari BE. Saat ini mobile hanya rely on local storage, yang fragile saat:

1. User logout/login (data masih ada di scope per-jemaatId, tapi edge cases existed sebelum patch ini)
2. Fresh install / app data wiped
3. User pindah device (HP rusak, ganti HP)
4. Secure storage corruption

Akibatnya: user yang sudah daftar event tapi belum bayar bisa lihat tombol **"Daftar Sekarang"** di event detail, padahal seharusnya **"Lanjut Pembayaran"**.

**Permintaan**: tambah endpoint `GET /admin/event/:idOrSlug/peserta/me` yang return participation user di event itu (atau 404 kalau belum daftar).

---

## Problem statement

### Current flow (broken pada edge cases)

```
User daftar event → POST /admin/event/:id/peserta → BE return participation
                                                    ↓
                                  Mobile simpan ke local storage (per jemaatId)
                                                    ↓
                User keluar app / fresh install / device baru
                                                    ↓
                          Local storage hilang / kosong
                                                    ↓
        Mobile buka event detail → query local store → empty
                                                    ↓
                      UI: "Daftar Sekarang" ❌ (seharusnya "Lanjut Pembayaran")
```

### Current workaround (mobile-side, sub-optimal)

Mobile sudah punya 2 layer defense:

1. **Scope participation by jemaatId** — multi-user same-device tidak cross-contaminate
2. **409 CONFLICT recovery on register** — kalau user tap "Daftar Sekarang" dan BE bilang sudah terdaftar, mobile add placeholder dengan `participationId: 'unknown'` + redirect ke payment screen

Tapi workaround #2 punya limitation: tanpa `participationId`, upload bukti transfer tidak bisa dilakukan (endpoint `POST /admin/event/:id/peserta/:participationId/bukti` butuh ID).

User harus hubungi admin manual untuk dapat participationId, atau cancel & re-register dengan endpoint `DELETE /admin/event/:id/peserta/me` (yang sudah tersedia per patch 21g) lalu daftar ulang. Friction.

---

## Permintaan endpoint

### `GET /admin/event/:idOrSlug/peserta/me`

Resolve current user dari JWT, return participation row mereka di event ini.

**Request:**

```
GET /admin/event/{eventIdOrSlug}/peserta/me
Authorization: Bearer <accessToken>
```

**Response 200 (terdaftar):**

```json
{
  "success": true,
  "data": {
    "id": "part-uuid-...",
    "eventId": "evt-uuid-...",
    "jemaatId": "jemaat-uuid-...",
    "status": "DAFTAR",
    "nominalBayar": "750000",
    "catatan": "Ukuran kaos L",
    "buktiTransferUrl": null,
    "registeredAt": "2026-05-15T10:30:00.000Z",
    "paidAt": null,
    "attendedAt": null
  }
}
```

**Response 404 (belum daftar):**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Anda belum terdaftar di event ini."
  }
}
```

> Note: BE existing pattern untuk endpoint `me` di branch-change (section 14) dan cancel-event-participation (section 5.6) sudah resolve current user dari JWT — pakai pattern yang sama.

---

## Alternative (lebih ringkas, kalau prefer)

Daripada endpoint baru, **include `myParticipation` di response `GET /admin/event/:idOrSlug`** detail.

**Response 200 dengan `myParticipation` field:**

```json
{
  "success": true,
  "data": {
    "id": "evt-uuid-...",
    "judul": "Retreat Pemuda 2026",
    "...": "...field event lain...",
    "myParticipation": {
      "id": "part-uuid-...",
      "status": "DAFTAR",
      "buktiTransferUrl": null,
      "registeredAt": "2026-05-15T10:30:00.000Z"
    }
  }
}
```

Kalau user belum daftar: `"myParticipation": null`.

**Pro alternative**:
- 1 query untuk dapat semua info event detail + status pribadi
- Tidak perlu endpoint baru
- Mobile cuma render condition based on `event.myParticipation`

**Con alternative**:
- Breaking change kalau ada client lain yang sudah konsumsi schema event detail
- Sedikit lebih heavy karena selalu include JOIN ke peserta table

**Rekomendasi mobile**: pilih alternative kalau bisa — lebih efisien. Kalau ada concern breaking change, pilih endpoint terpisah.

---

## Use case di mobile

### A. Saat event detail di-load

```typescript
// app/event/[id].tsx
const eventDetail = useEventDetail(id);          // GET /admin/event/:id
const myParticipation = useMyParticipation(id);  // GET /admin/event/:id/peserta/me

// Atau alternative: pakai eventDetail.data.myParticipation langsung
```

Sync result ke local store `useEventFlowStore`:

```typescript
useEffect(() => {
  if (myParticipation.data) {
    // BE punya data → update local store (truth dari BE)
    addParticipation({
      participationId: myParticipation.data.id,
      eventId: myParticipation.data.eventId,
      status: myParticipation.data.status,
      registeredAt: new Date(myParticipation.data.registeredAt).getTime(),
    });
  } else if (myParticipation.error?.code === 'NOT_FOUND') {
    // BE confirm belum daftar → clean local store kalau ada stale data
    removeParticipation(eventId);
  }
}, [myParticipation.data]);
```

### B. UI render correctness

- `myParticipation.data === null` → tampil tombol "Daftar Sekarang"
- `myParticipation.data.status === 'DAFTAR'` (paid event) → tampil "Lanjut Pembayaran"
- `myParticipation.data.status === 'MENUNGGU_VERIFIKASI'` → tampil "Menunggu Verifikasi"
- `myParticipation.data.status === 'BAYAR'` → tampil "Sudah Terdaftar"
- `myParticipation.data.status === 'HADIR'` → tampil "Sudah Hadir"

Tidak ada lagi "Daftar Sekarang" spurious — BE selalu source of truth.

---

## Edge cases

**Q: Performance — apa setiap buka event detail butuh 2 query?**
A: Kalau alternative dipilih (include `myParticipation` di detail), 1 query saja. Kalau endpoint terpisah, mobile bisa parallel fetch dengan `Promise.all`. Cache 5 menit di React Query mengurangi load.

**Q: Apa endpoint ini perlu auth?**
A: Ya — JWT. Resolve current user dari token. User yang belum login tidak bisa akses.

**Q: Apa endpoint ini idempotent?**
A: Pure read endpoint — no side effects. Aman di-call berkali-kali.

**Q: Apa endpoint ini perlu rate limit?**
A: Standard rate limit untuk authenticated GET sudah cukup. Tidak perlu special.

**Q: Apa endpoint ini balikkan data sensitif?**
A: Hanya data milik current user (resolve via JWT). Tidak ada PII orang lain.

**Q: Apa bisa search by slug, bukan hanya UUID?**
A: Ya, ikuti pola `GET /admin/event/:idOrSlug` yang sudah accept keduanya.

---

## Action items untuk BE team

| # | Item | Pilihan |
|---|------|---------|
| 1 | Pilih implementation: endpoint terpisah ATAU include di detail | BE keputusan |
| 2 | Implement | Sesuai pilihan #1 |
| 3 | Update mobile-api-guide.md dengan endpoint baru | BE doc |
| 4 | Notify mobile dev (Ari) saat ready | WA / commit notify |

Mobile akan adopt endpoint segera setelah BE deploy — sudah ada placeholder code yang tinggal di-wire up.

---

## Reference

- Existing endpoint mirip pattern: `DELETE /admin/event/:eventId/peserta/me` (section 5.6)
- Mobile commit yang sudah handle workaround: `[upcoming commit] fix(event): scope participations by jemaatId + 409 recovery`
- Mobile file yang akan call endpoint baru: `app/src/hooks/useEvents.ts` + `app/app/event/[id].tsx`

---

## Kontak

Mobile dev — Ari Christian (`arichrst@ide.asia`)
