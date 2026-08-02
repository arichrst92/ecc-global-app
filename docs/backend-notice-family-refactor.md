# Backend Notice — Family Relation Refactor

**Dari:** Tim Backend ECC (IDEA)
**Untuk:** Tim Mobile (Ari)
**Tanggal:** 2026-08-02
**Status:** 🚀 DEPLOYED PRODUCTION per 2026-08-02
**Related:** —

---

## TL;DR

Backend family module di-refactor jadi **single source of truth**: `jemaat_relasi` + `tipe_relasi_keluarga` (portal admin master data). Storage lama `family_relation` + enum `FamilyRole` sudah **di-drop dari DB production**.

Mobile app existing **tetap jalan tanpa update** (backward compat 100%). Tapi ada opsi baru untuk granularity — recommended untuk diadopsi kalau mau tampil "Ayah/Ibu" spesifik (bukan cuma "PARENT" broad).

---

## Perubahan API — Endpoint URL sama, payload extended

### Endpoint yang di-refactor (tidak berubah URL)

Semua `/admin/me/family/*` tetap sama:
- `GET /admin/me/family`
- `POST /admin/me/family/link-by-kode`
- `POST /admin/me/family/link-by-phone`
- `POST /admin/me/family/register-new`
- `PATCH /admin/me/family/:jemaatId`
- `DELETE /admin/me/family/:jemaatId`
- `PATCH /admin/me/family/:jemaatId/profile` (tidak berubah, edit jemaat only)
- `POST /admin/me/family/:jemaatId/foto` (tidak berubah)

### Request body — dual accept

Backend accept **EITHER** cara:

**Old (backward compat, mobile lama)**:
```json
{ "role": "SPOUSE" }
```

Enum broad 6 value: `SPOUSE`, `CHILD`, `PARENT`, `SIBLING`, `GUARDIAN`, `OTHER`.

**New (recommended, granular)**:
```json
{ "tipeRelasiId": "<uuid-tipe>" }
```

`tipeRelasiId` UUID dari master data `TipeRelasiKeluarga`. Fetch daftar via endpoint existing `GET /admin/keluarga/tipe` — return 11 tipe granular:

- Suami, Istri
- Ayah, Ibu
- Anak Laki-Laki, Anak Perempuan
- Saudara Kandung
- Kakek, Nenek, Cucu
- Wali (dan Lainnya sebagai fallback)

**Rule input**: kirim salah satu (role ATAU tipeRelasiId), bukan kedua-nya.

### Response — include kedua field

```json
{
  "id": "uuid-relasi",
  "role": "SPOUSE",              // backward compat broad enum
  "tipeRelasi": {                 // NEW granular
    "id": "uuid-tipe",
    "nama": "Suami"
  },
  "isVerified": true,
  "createdAt": "...",
  "jemaat": {
    "id": "...",
    "namaLengkap": "...",
    "noHp": "...",
    "kode": "...",
    "fotoUrl": "...",
    "tanggalLahir": "...",
    "jenisKelamin": "L",
    "cabang": { "id": "...", "nama": "..." },
    "isDependent": false
  }
}
```

Mobile lama yang cuma consume `role` → tetap jalan.
Mobile baru bisa consume `tipeRelasi.nama` untuk display granular.

---

## Auto-reciprocal — gender-aware

Backend otomatis create relasi 2 arah dengan tipe yg sesuai gender:

| Input | Anda | Target | Reciprocal (di sisi target) |
|---|---|---|---|
| `role: 'SPOUSE'` | Laki | Perempuan | Suami / Istri (auto) |
| `role: 'SPOUSE'` | Perempuan | Laki | Istri / Suami (auto) |
| `role: 'PARENT'` | Laki (Ayah) | Anak Laki-Laki | Ayah / Anak Laki-Laki |
| `role: 'PARENT'` | Perempuan (Ibu) | Anak Perempuan | Ibu / Anak Perempuan |
| `role: 'CHILD'` | Laki (Anak L) | Perempuan (Ibu) | Anak Laki-Laki / Ibu |
| `role: 'SIBLING'` | — | — | Saudara Kandung symmetric |
| `role: 'GUARDIAN'` | Wali | — | Wali / Lainnya |
| `role: 'OTHER'` | — | — | Lainnya symmetric |

**Refinement gender**: sekali kirim `role: 'PARENT'`, backend lookup gender diri + target → simpan tipe granular (Ayah kalau diri laki, Ibu kalau perempuan). Portal admin lihat tampil sebagai "Ayah" atau "Ibu" spesifik.

---

## Mobile UX Recommendation

### Fase 1 — Skip aja (mobile lama tetap jalan)

Kalau mobile UI cuma nampilin "SPOUSE / PARENT / CHILD" broad, no change needed. Aplikasi tetap jalan tanpa update.

### Fase 2 — Adopt granular (recommended)

**Dropdown baru** pas add family:
```
Fetch daftar tipe:
  GET /admin/keluarga/tipe
  → response: [{ id, nama }, ...]

UI dropdown 11 opsi. User pilih → kirim tipeRelasiId di POST body.
```

**Display granular** di list family:
```
Sekarang → "Suami: Budi Santoso" (bukan "SPOUSE: Budi")
         → "Ayah: Pak Jerry"     (bukan "PARENT: Pak Jerry")
         → "Anak Perempuan: Sarah" (bukan "CHILD: Sarah")
```

Enak untuk display + akurat + informatif.

---

## Portal admin update juga

Portal admin `/dashboard/jemaat/[id]` tab Relasi Keluarga juga **auto-reciprocal sekarang** (sebelumnya cuma create 1 arah). Konsisten dengan mobile behavior. Data mobile + portal converge di single table.

---

## Impact ke data existing

- ✅ `family_relation` table di-drop clean (no data ada di prod sebelum drop)
- ✅ `jemaat_relasi` sudah punya beberapa row (dari test add via mobile)
- ✅ Backward compat 100% — mobile lama tetap dapat response valid

Kalau ada data lama di local dev yg mau di-migrate, kirim script permintaan.

---

## Testing sample

### 1. Fetch daftar tipe

```bash
JWT="<jemaat-JWT>"

curl -H "Authorization: Bearer $JWT" \
  https://api.eccchurch.global/admin/keluarga/tipe
# Response: array 11 tipe granular
```

### 2. Add istri via kode QR

```bash
# Old style (broad)
curl -X POST -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"kode":"ABCD1234","role":"SPOUSE"}' \
  https://api.eccchurch.global/admin/me/family/link-by-kode

# New style (granular — bisa langsung "Istri" tanpa gender inference)
curl -X POST -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"kode":"ABCD1234","tipeRelasiId":"<uuid-istri>"}' \
  https://api.eccchurch.global/admin/me/family/link-by-kode
```

### 3. Verify reciprocal

Login target (istri) di device lain, buka tab Keluarga:
```bash
curl -H "Authorization: Bearer $ISTRI_JWT" \
  https://api.eccchurch.global/admin/me/family
```

Response include Anda dengan `tipeRelasi.nama = "Suami"`. 

---

## Action items mobile

- [ ] **Wajib**: Verify mobile lama masih jalan (test 1 flow lengkap add family di prod)
- [ ] **Optional**: Adopt granular UI — dropdown 11 tipe dari `/admin/keluarga/tipe`
- [ ] **Optional**: Display `tipeRelasi.nama` (bukan `role`) di list family
- [ ] **Optional**: Fetch `tipeRelasi` di family detail screen

---

## Contact + Follow-up

- **BE team**: IDEA dev (ping via ECC repo issue atau langsung)
- **Deploy state**: LIVE per 2026-08-02 di `api.eccchurch.global`

Kalau ada question / issue integration, kirim `backend-request-family-*.md` di folder ini.

---

*Doc versi: 1.0 — 2026-08-02.*
