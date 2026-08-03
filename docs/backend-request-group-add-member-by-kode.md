# Backend Request — Group Add Member via QR Kode

**Dari:** Tim Mobile (Ari)
**Untuk:** Tim Backend ECC (IDEA)
**Tanggal:** 2026-08-02
**Priority:** 🟢 Low — UX improvement, tidak blocking release Sprint 3
**Status:** ✅ **RESOLVED** (2026-08-03) — endpoint live, siap consume.
**Related:** [`backend-notice-group-endpoints.md`](./backend-notice-group-endpoints.md)

---

## TL;DR

Sprint 3 (M40) Group Feature — code complete. Existing endpoint `POST /admin/group/:id/members/:jemaatId` butuh **jemaat UUID literal** untuk add member.

Untuk UX PIC yang add member via scan QR jemaat (pattern konsisten dgn homecell), butuh endpoint helper `POST /admin/group/:id/members/by-kode` yang accept kode 8-char (bukan UUID).

Tanpa ini, PIC harus tanya jemaat UUID nya — friction UX yang tidak ada di flow homecell.

---

## Request Detail

### `POST /admin/group/:id/members/by-kode` (BARU)

**Auth:** Bearer JWT — PIC group atau `isFulltimer=true`

**Body:**
```json
{
  "kode": "ABC23XYZ",
  "catatan": "Direct add via scan"
}
```

**Behavior:**
- Lookup jemaat by `kode` (8-char alphanumeric field di jemaat table)
- Kalau tidak ada → 404 "Kode jemaat tidak ditemukan"
- Kalau ada → equivalent dgn existing `POST /admin/group/:id/members/:jemaatId` (idempotent, trigger notif WA)

**Response 200/201:**
```json
{
  "success": true,
  "message": "Budi Santoso berhasil ditambahkan",
  "data": {
    "alreadyMember": false,
    "jemaat": {
      "id": "uuid",
      "namaLengkap": "Budi Santoso",
      "kode": "ABC23XYZ"
    }
  }
}
```

**Errors:**
| HTTP | Kondisi | Message |
|---|---|---|
| 404 | Kode tidak ada | "Kode jemaat tidak ditemukan" |
| 403 | Bukan PIC / admin | "Hanya PIC bisa add member" |
| 400 | Format kode invalid | "Kode harus 8 karakter alphanumeric" |

**Rate limit:** admin-tier (300/menit).

---

## Konteks — Existing Pattern Homecell

Ada precedent di module homecell: `POST /admin/homecell/:id/members/by-kode` (per BE patch 2026-05-21p). Mobile pakai flow ini untuk scan QR jemaat → add ke homecell.

Request ini adalah **mirror pattern** untuk group. Behavior + response shape sama.

Kode BE bisa reuse helper existing (lookup jemaat by kode, then delegate ke existing add-member handler).

---

## Mobile Impact

Kalau endpoint jadi:
- Update mobile `app/group/[id]/add-member.tsx` — replace input UUID → scan QR (reuse `ScannerCamera` + `ManualInputModal`)
- API: `addGroupMemberByKode(groupId, kode, catatan?)` di `src/api/group.ts`
- Hook: adapt `useAddGroupMember` untuk accept kode alternate

Effort: ~1 hari mobile side, minor refactor.

---

## Timeline

- **Preferred**: dalam 2-4 minggu (masuk sprint BE reguler)
- **Acceptable**: 1-2 bulan (bundle dgn refactor jemaat scanner umum kalau ada)
- **Kalau ditunda indefinitely**: mobile keep flow input UUID (dengan copy improvement — "cari jemaat via nama" — butuh endpoint search jemaat yang mungkin sudah ada)

---

## Confirmation dari BE

Kalau OK:
1. ETA
2. Confirm path akhir (`/members/by-kode` vs alternate)
3. Confirm auth model (PIC only, atau Fulltimer bypass juga)

---

## Contact

- Mobile team: Ari (arichrst@ide.asia)
- Ref: `docs/sprint-plan-2026-q3.md` Sprint 3 Phase 3C
- Related BE notice: `backend-notice-group-endpoints.md`

---

*Doc versi: 1.0 — 2026-08-02.*

---

## 🔧 BE RESPONSE (2026-08-03)

Endpoint sudah live di `apps/core-api/src/routes/admin/group.ts`.

**Path final**: `POST /admin/group/:id/members/by-kode` (sesuai usulan)
**Auth**: PIC group atau `isFulltimer=true` (via `assertCanManageGroup`)

**Behavior**:
- Lookup jemaat by `kode` uppercase — 404 kalau tidak ada / nonaktif
- Delegate ke upsert `group_member` (idempotent — reactivate kalau existing isActive=false)
- Trigger notif WA `GROUP_MEMBER_ADDED` (Fonnte)
- Audit log `via: 'by-kode'` + kode

**Request body**:
```json
{ "kode": "ABC23XYZ", "catatan": "Direct add via scan" }
```

**Response 200/201** — mirror pattern `/homecell/:id/members/by-kode`:
```json
{
  "success": true,
  "message": "Budi Santoso berhasil ditambahkan",
  "data": {
    "alreadyMember": false,
    "jemaat": { "id": "uuid", "namaLengkap": "Budi Santoso", "kode": "ABC23XYZ" }
  }
}
```

**Rate limit**: admin-tier (300/menit) — sudah cukup.

Testing curl:
```bash
JWT="<pic-JWT>"
curl -X POST -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"kode":"ABC23XYZ"}' \
  https://api.eccchurch.global/admin/group/<group-id>/members/by-kode
```

Deploy: bareng bundle Sprint request 3 hari ini (git push + `pnpm build` + PM2 restart).

— IDEA dev
