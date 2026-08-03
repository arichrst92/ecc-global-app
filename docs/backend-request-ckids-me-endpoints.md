# Backend Request — CKids Parent Endpoints (Modul 28)

**Dari:** Tim Mobile (Ari)
**Untuk:** Tim Backend ECC (IDEA)
**Tanggal:** 2026-08-02
**Priority:** 🔴 Critical — blocking Sprint 5 (CKids Tab) v1.5.0 release
**Status:** ✅ **RESOLVED** (2026-08-03) — 2 endpoint baru live, siap consume.
**Related:** [`backend-notice-ckids-mobile-tab.md`](./backend-notice-ckids-mobile-tab.md)

---

## TL;DR

Butuh **2 endpoint tambahan** untuk parent-side CKids Tab di mobile:

1. `GET /admin/me/children-points` — shortcut fetch point balance semua anak parent dalam 1 call
2. Filter `jemaatId` di existing `GET /admin/gift-stall/redeems` — supaya parent bisa view history redeem per anak

Sementara Sprint 5 code progress dgn fallback pattern (multi-call), tapi UX + performance kurang optimal. Kirim ini untuk clean up sebelum release v1.5.0.

---

## Konteks

Per notice `backend-notice-ckids-mobile-tab.md` (Modul 28) — mobile side punya tab CKids untuk parent view:
- Point balance anak (per cabang)
- Katalog hadiah cabang
- QR anak untuk pickup di stall
- History redeem anak

Endpoint existing `GET /admin/gift-stall/lookup-jemaat?kode=<X>&cabangId=<Y>` sudah cukup untuk single-anak lookup, tapi:
- **Multi anak**: parent harus panggil 1x per anak → N+1 pattern
- **Endpoint gate Fulltimer**: mobile parent bukan Fulltimer, akses ditolak (atau workaround inconsistent)

Sama untuk history redeem — filter existing cuma `cabangId + date + hadiahId + adminId`. Untuk parent view anak-nya sendiri butuh filter `jemaatId`.

---

## Request Detail

### 1. `GET /admin/me/children-points` (BARU)

**Auth:** Bearer JWT parent (any authenticated jemaat)

**Behavior:**
- Backend query `JemaatRelasi` WHERE `jemaatIdA=self` AND `tipeRelasi.nama IN ('Anak', 'Anak Laki-Laki', 'Anak Perempuan')` (post-family-refactor 2026-08-02)
- Untuk tiap anak, join `jemaat_point_balance` per cabang
- Return flat list balance per (anak, cabang)

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "anak": {
        "id": "uuid-budi-jr",
        "namaLengkap": "Budi Junior",
        "fotoUrl": null,
        "kode": "ANAK1234"
      },
      "cabang": {
        "id": "uuid-bandung",
        "nama": "ECC Bandung"
      },
      "balance": 150,
      "lastUpdate": "2026-08-04T10:00:00Z"
    },
    {
      "anak": {
        "id": "uuid-sarah-jr",
        "namaLengkap": "Sarah Junior",
        "fotoUrl": "/uploads/sarah.webp",
        "kode": "ANAK5678"
      },
      "cabang": {
        "id": "uuid-bandung",
        "nama": "ECC Bandung"
      },
      "balance": 75,
      "lastUpdate": "2026-08-01T09:00:00Z"
    }
  ]
}
```

**Edge cases:**
- Parent tanpa anak → return `data: []`
- Anak tanpa balance record di cabang → skip (jangan return `balance: 0` — differentiate belum earn point vs 0)
- Anak multi-cabang → return 1 row per cabang (mobile group visually)

**Rate limit:** admin-tier (300/menit/user) — cukup.

**Cache hint:** BE tambah `Cache-Control: private, max-age=60` supaya mobile bisa cache 1 menit (balance jarang berubah realtime — earn saat check-in ibadah anak, spend saat stall redeem).

### 2. Filter `jemaatId` di `GET /admin/gift-stall/redeems`

**Existing endpoint:** `GET /admin/gift-stall/redeems?cabangId=X&date=Y&hadiahId=Z&adminId=W`

**Tambah query param:**
- `jemaatId` (uuid) — filter redeem per jemaat (anak view)

**Existing auth (biarkan):** Bearer JWT Fulltimer atau admin. Untuk mobile parent view, auto-scope: kalau requester bukan Fulltimer + `jemaatId` di query bukan anaknya sendiri → 403.

**Alternative simpler**: create dedicated parent-scoped endpoint:
- `GET /admin/me/children-redeem-history?jemaatId=<anakId>&limit=20`
- Guard: verify `jemaatId` adalah anak requester (via JemaatRelasi)
- Return existing HadiahRedeem shape

Pick whichever cleaner untuk BE code.

**Response shape** (biarkan sesuai existing schema `hadiah_redeem`):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "jemaatId": "uuid-budi-jr",
      "hadiahId": "uuid-lego",
      "namaHadiahSnapshot": "Robot LEGO Set 45pcs",
      "fotoHadiahSnapshot": "/uploads/lego.webp",
      "pointSpent": 200,
      "redeemedAt": "2026-08-04T11:30:00Z",
      "adminName": "Kak Sarah"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5 }
}
```

---

## Mobile Fallback Pattern (sementara)

Kalau BE lambat deliver, mobile pakai fallback:

```typescript
// M42 fallback — kalau /me/children-points belum ada
async function getMyChildrenPointsFallback(): Promise<ChildBalance[]> {
  const keluarga = await api.get('/admin/keluarga?jemaatId=self');
  const anakList = keluarga.filter(
    (m) => m.tipeRelasi?.nama?.includes('Anak')
  );
  // Fetch balance per anak per cabang (N calls)
  return Promise.all(
    anakList.map((anak) =>
      api.get(`/admin/gift-stall/lookup-jemaat?kode=${anak.kode}&cabangId=${anak.cabangId}`)
    )
  ).then((results) => results.map(mapToChildBalance));
}
```

Ini functional tapi slow untuk multi-anak + rely on Fulltimer-gated endpoint (mungkin gagal untuk parent non-Fulltimer). Preferred: BE proper endpoint.

---

## Timeline

- **Preferred**: dalam 1-2 minggu (target Sprint 5 release v1.5.0)
- **Acceptable**: 3-4 minggu (Sprint 5 release delayed, mobile pakai fallback)
- **Kalau > 1 bulan**: rethink — mungkin CKids Tab release dgn fitur limited (cuma balance single-anak, tanpa history)

---

## Confirmation dari BE

Kalau OK, BE reply dengan:
1. ETA per endpoint
2. Path akhir + query param final (kalau berbeda dari usulan di atas)
3. Auth model final (parent-scoped guard rules)

Kalau ada masalah / alternative approach preferred, discuss di ECC repo issue.

---

## Contact

- Mobile team: Ari (arichrst@ide.asia)
- Ref: `docs/sprint-plan-2026-q3.md` Sprint 5 (v1.5.0)
- Related BE notice: `backend-notice-ckids-mobile-tab.md`

---

*Doc versi: 1.0 — 2026-08-02.*

---

## 🔧 BE RESPONSE (2026-08-03)

Ke-2 endpoint live di `apps/core-api/src/routes/admin/me.ts`.

### 1. `GET /admin/me/children-points` ✅ DONE

**Auth**: Bearer JWT parent (any authenticated jemaat)

**Implementation notes**:
- Query `JemaatRelasi` WHERE `jemaatId=self` AND `tipeRelasi.nama IN ('Anak Laki-Laki', 'Anak Perempuan', 'Anak')` — support post-refactor granular DAN backward-compat legacy nama.
- Join `jemaat_point_balance` per (anak, cabang). Skip anak tanpa balance record (bukan return `0` — differentiate seperti Ari usul).
- `Cache-Control: private, max-age=60` di response header — mobile bisa cache 1 menit.
- Rate limit: admin-tier (300/menit).

**Response** — sesuai usulan:
```json
{
  "success": true,
  "data": [
    {
      "anak": { "id": "...", "namaLengkap": "Budi Junior", "fotoUrl": null, "kode": "ANAK1234" },
      "cabang": { "id": "...", "nama": "ECC Bandung" },
      "balance": 150,
      "lastUpdate": "2026-08-04T10:00:00Z"
    }
  ]
}
```

### 2. Redeem history per anak ✅ DONE (Alternative dedicated endpoint)

Pilih approach kedua (dedicated parent-scoped endpoint) — lebih clean auth.

**Path final**: `GET /admin/me/children-redeem-history?jemaatId=<anakId>&limit=20`

**Auth**: Bearer JWT parent. **Guard**: `jemaatId` di query harus terverify sebagai anak requester (via JemaatRelasi lookup) — kalau tidak → **403 Forbidden**.

**Query params**:
- `jemaatId` (uuid, wajib)
- `limit` (default 20, max 100)

**Response** — pakai existing `hadiah_redeem` shape:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "jemaatId": "uuid-anak",
      "hadiahId": "uuid-lego",
      "pointDeducted": 200,
      "hadiahNama": "Robot LEGO",     // snapshot
      "hadiahFotoUrl": "/uploads/hadiah/lego.webp",  // snapshot
      "processedAt": "2026-08-04T11:30:00Z",
      "hadiah": { "id": "...", "nama": "...", "fotoUrl": "..." },
      "cabang": { "id": "...", "nama": "..." },
      "processedBy": { "id": "...", "namaLengkap": "Kak Sarah" }
    }
  ]
}
```

**Alasan pilih dedicated endpoint (bukan filter Fulltimer endpoint)**:
- Cleaner auth model — parent guard di 1 tempat via `getMyChildrenIds()` helper
- Response bersih, gak leak Fulltimer-only fields (adminId dsb)
- Existing `/admin/gift-stall/redeems` tetap Fulltimer-only untuk stall admin monitoring

Testing curl:
```bash
JWT="<parent-JWT>"

# Balance semua anak
curl -H "Authorization: Bearer $JWT" \
  https://api.eccchurch.global/admin/me/children-points

# History anak spesifik
curl -H "Authorization: Bearer $JWT" \
  "https://api.eccchurch.global/admin/me/children-redeem-history?jemaatId=<anak-uuid>&limit=20"
```

### Family relation dependency

⚠️ **Penting**: endpoint ini reliance pada `JemaatRelasi` — parent perlu setup relasi anak-nya dulu (via `/admin/me/family/link-by-kode` atau `/register-new`). Kalau belum ada relasi, `children-points` return `[]`.

Post-refactor family (2026-08-02) — mobile app add family → auto masuk `jemaat_relasi` table (backward compat + granular). Old data yg pernah di `family_relation` sudah di-drop clean per stage 2.

Untuk **mobile fallback pattern** yang Ari usulkan (multi-call via `/admin/keluarga`) — sekarang GAK PERLU. `/me/children-points` gantiin proper.

— IDEA dev
