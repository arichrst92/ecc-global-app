# Backend Request: GET Event Participation Status untuk Mobile User

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-20
**Priority**: 🟡 **MEDIUM** — UX issue, ada workaround tapi tidak ideal
**Status**: ✅ **RESOLVED 2026-05-21** — lihat section "Backend Response" di akhir doc

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

---

# Backend Response — 2026-05-21

**Dari**: Tim Backend ECC (IDEA dev team)
**Untuk**: Mobile dev (Ari Christian)
**Status**: ✅ **DELIVERED**

## Ringkasan

**Kedua approach diimplementasikan** (sesuai rekomendasi mobile "pilih alternative kalau bisa" — kami kasih keduanya):

1. ✅ Field `myParticipation` di response `GET /admin/event/:idOrSlug` — efisien single round-trip
2. ✅ Endpoint terpisah `GET /admin/event/:idOrSlug/peserta/me` — untuk refresh setelah mutation

Tidak ada breaking change. Cost tambahan: 1 query Postgres saat detail loaded (~ms).

## Spec final

### Option A — Field `myParticipation` di event detail (recommended untuk initial load)

```
GET /admin/event/{idOrSlug}
Authorization: Bearer <JWT>
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "evt-uuid-...",
    "judul": "Retreat Pemuda 2026",
    "...": "...field event lain...",
    "pesertaCount": 23,
    "myParticipation": {
      "id": "part-uuid-...",
      "eventId": "evt-uuid-...",
      "jemaatId": "ab12cd34-...",
      "status": "DAFTAR",
      "nominalBayar": "750000",
      "catatan": "Ukuran kaos L",
      "buktiTransferUrl": null,
      "registeredAt": "2026-05-15T10:30:00.000Z",
      "paidAt": null,
      "attendedAt": null,
      "cancelledAt": null
    }
  }
}
```

Kalau user belum daftar: `"myParticipation": null`.

### Option B — Standalone `GET /:idOrSlug/peserta/me` (recommended untuk refetch post-mutation)

```
GET /admin/event/{idOrSlug}/peserta/me
Authorization: Bearer <JWT>
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
    ...
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

Accept id atau slug (sama pola endpoint detail).

## Pattern recommendation

| Scenario | Pakai |
|---|---|
| Initial load event detail | `GET /:idOrSlug` → baca `data.myParticipation` (1 query) |
| Refresh setelah register / cancel / upload bukti | `GET /:idOrSlug/peserta/me` (lebih ringan) |
| Multi-event list (mis. home screen, "event saya") | TBD — kalau perlu batch lookup, request endpoint baru |

## Acceptance criteria checklist

- [x] User authenticated → `myParticipation` field populated (atau null)
- [x] User belum daftar → field `null` (bukan absent, supaya distinguish dari client outdated)
- [x] Standalone endpoint 200 / 404 sesuai status
- [x] Accept id atau slug
- [x] OpenAPI di Swagger (tag "Movement · Event")
- [x] No breaking change — `myParticipation` purely additive
- [x] Pure read endpoint — idempotent, aman polling

## Implementasi notes

**Route ordering**: `GET /:idOrSlug/peserta/me` di-register sebelum existing routes `:participationId/*`. Beda HTTP method dengan `DELETE /peserta/me`, jadi Express handle independently, tapi konvensi codebase: route `me` di-group sebelum route `:participationId`.

**Resolve via JWT**: pakai `req.user.jemaatId` (sudah di-resolve oleh `requireAuth` middleware di `/admin/*`). Tidak ada cek owner explicit — by design, user tidak bisa "see" participation orang lain.

**Defensive null**: kalau request tidak punya `req.user` (theoretical — admin/* sudah pasti JWT-required), `myParticipation` set ke `null`. Tidak crash.

**Performance**: query `eventParticipation.findUnique({ where: { eventId_jemaatId } })` pakai composite unique index — sub-ms. Cache 5 menit di React Query mengurangi load.

## Field reference

Semua field yang di-return di `myParticipation` row:

| Field | Tipe | Catatan |
|---|---|---|
| `id` | UUID | participationId untuk upload bukti |
| `eventId` | UUID | echo dari event |
| `jemaatId` | UUID | echo dari current user |
| `status` | enum | DAFTAR \| MENUNGGU_VERIFIKASI \| BAYAR \| HADIR \| BATAL |
| `nominalBayar` | string (Decimal) | nullable kalau GRATIS |
| `catatan` | string | nullable |
| `buktiTransferUrl` | string | URL bukti, null kalau belum upload |
| `registeredAt` | ISO timestamp | saat daftar |
| `paidAt` | ISO timestamp | saat admin approve, null kalau belum |
| `attendedAt` | ISO timestamp | saat check-in HADIR, null kalau belum |
| `cancelledAt` | ISO timestamp | saat BATAL, null kalau aktif |

## File yang berubah

| File | Perubahan |
|---|---|
| `apps/core-api/src/routes/admin/event.ts` | Detail handler include `myParticipation`, new `GET /:idOrSlug/peserta/me` |
| `apps/core-api/src/openapi.ts` | Register path baru |
| `docs/mobile-api-guide.md` | Section 5.2 (myParticipation field) + section 5.2.1 (standalone) + Gap Status table |
| `knowledge-base.md` | Section 26 patch **2026-05-21i** |

## Action item untuk mobile team

- [ ] Update `useEventDetail` hook — parse `data.myParticipation` dan sync ke `useEventFlowStore`
- [ ] Hapus / sederhanakan workaround 409 CONFLICT recovery (placeholder participationId='unknown' tidak perlu lagi)
- [ ] Add `useMyParticipation(eventId)` hook untuk standalone fetch (pakai post-mutation)
- [ ] Render CTA berdasarkan `myParticipation` dari BE (bukan local store sebagai primary)
- [ ] Local store tetap dipakai untuk offline UX, tapi rekonsiliasi dengan BE saat online

## Bonus catatan

**Source of truth shift**: setelah patch ini, mobile harus treat BE response sebagai authoritative untuk participation status. Local storage masih useful untuk offline cache, tapi saat online flow harus:

```typescript
useEffect(() => {
  if (eventDetail.data?.myParticipation) {
    // Sync ke local store
    upsertParticipation(eventDetail.data.myParticipation);
  } else if (eventDetail.data && !eventDetail.data.myParticipation) {
    // BE confirm belum daftar — clean local stale
    removeParticipation(eventId);
  }
}, [eventDetail.data]);
```

Ini sekaligus solve issue "tombol Daftar Sekarang muncul padahal user sudah daftar" — root cause exactly seperti yang dijelaskan di TL;DR request ini.

---

*Ticket closed 2026-05-21. Live di Swagger `{BASE_URL}/docs#/Movement-·-Event/get_admin_event__idOrSlug__peserta_me`.*
