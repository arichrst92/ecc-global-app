# Mobile Update — Family Granular tipeRelasi Adoption

**Dari:** Tim Mobile (Ari)
**Untuk:** Tim Backend ECC (IDEA)
**Tanggal:** 2026-08-24
**Version target:** v1.6.0 (bundled dgn Sprint 6 in-app notif)
**Related BE docs:**
- [`backend-notice-family-refactor.md`](./backend-notice-family-refactor.md) (deployed 2026-08-02)

---

## TL;DR

Mobile fully adopt **Opsi granular** dari BE family refactor 2026-08-02 — pindah dari `role` broad enum (4 opsi) ke `tipeRelasiId` (11-12 opsi granular dari master data). Commit `33df218` di `main`. Zero breaking change: row lama pre-refactor tanpa `tipeRelasi` field tetap display via fallback ke broad role label.

Ada **2 flag** untuk BE confirm/monitor.

---

## 1. Endpoint Consumed

Endpoint baru yg mobile mulai pakai:

| Endpoint | Consumer | Cache |
|---|---|---|
| `GET /admin/keluarga/tipe` | `useTipeRelasi` | 24h staleTime (master data) |

Endpoint yg sudah ada — mobile sekarang kirim `tipeRelasiId` bukan `role`:

| Endpoint | Old payload | New payload (mobile v1.6.0) |
|---|---|---|
| `POST /admin/me/family/link-by-kode` | `{ kode, role }` | `{ kode, tipeRelasiId }` |
| `POST /admin/me/family/link-by-phone` | `{ noHp, role }` | `{ noHp, tipeRelasiId }` |
| `POST /admin/me/family/register-new` | `{ ..., role }` | `{ ..., tipeRelasiId }` |
| `PATCH /admin/me/family/:jemaatId` | `{ role }` | `{ tipeRelasiId }` |

---

## 2. UX Behavior

### TipeRelasiPicker (replace RolePicker)

- **Trigger:** pressable button di form add family — tampil placeholder "Pilih tipe hubungan" atau nama tipe terpilih dgn brand-50 highlight
- **Modal:** bottom sheet 80% max-height, transparent black overlay, tap outside to close
- **Grouped 7 kategori** dgn section header uppercase:
  1. **Pasangan** (Suami, Istri) — pink Heart icon
  2. **Orang Tua** (Ayah, Ibu) — orange Users icon
  3. **Anak** (Anak Laki-Laki, Anak Perempuan) — emerald Baby icon
  4. **Saudara** (Saudara Kandung, Kakak, Adik) — blue Users icon
  5. **Kakek / Nenek** — purple Users icon
  6. **Cucu** — amber Baby icon
  7. **Wali / Lainnya** — neutral UserCircle icon
- **Item row:** icon + nama tipe + optional deskripsi + dot indicator untuk selected
- **Grouping algorithm:** heuristik nama tipe (case-insensitive substring match). Kalau BE tambah tipe baru dengan naming pattern kaya "Suami/Istri/Ayah/Ibu/Anak/Saudara/Kakek/Nenek/Cucu/Wali" — auto masuk kategori yg sesuai. Selain itu → fallback ke "Wali / Lainnya"

### Display di list family

`app/family/index.tsx` → `relationDisplayLabel(relation, t)`:
- Kalau `relation.tipeRelasi?.nama` ada → tampil granular (mis. "Ayah", "Anak Perempuan")
- Fallback ke `roleLabel(relation.role)` untuk row lama tanpa granular

### Display di family detail edit

`app/family/[id].tsx` edit picker:
- `currentTipe = editingTipe ?? serverTipe` — kalau server return `tipeRelasi`, langsung pre-select di picker
- Kalau server return `tipeRelasi = null` (row lama pre-refactor) — picker mulai empty, user harus pick granular untuk update

---

## 3. Backward Compat Handling

**FamilyRole enum:** mobile extend jadi 6 values `SPOUSE | CHILD | PARENT | SIBLING | GUARDIAN | OTHER` — supaya row lama dgn `role: 'GUARDIAN'` atau `role: 'OTHER'` tidak trigger TypeScript strict error.

**Payload discriminated union:**
```typescript
type RelationDiscriminator =
  | { role: FamilyRole; tipeRelasiId?: never }
  | { role?: never; tipeRelasiId: string };
```

Mobile v1.6.0 selalu kirim `tipeRelasiId` (never `role`) — tapi type retain option keduanya kalau ada consumer future butuh backward compat.

---

## 4. Open Questions / Flags untuk BE

### Q1: Struktur response `/admin/keluarga/tipe`

Mobile assume shape:
```typescript
type TipeRelasi = {
  id: string;
  nama: string;
  deskripsi?: string | null;
  kategori?: string | null;
};
```

**Confirm:**
- Response wrapped `{ success, data: TipeRelasi[] }` (standard BE wrapper)?
- Ada field `kategori` yang BE emit langsung, atau mobile harus tetap derive via heuristik nama?

**Not blocker** — mobile sekarang derive kategori dari nama (heuristik string match). Kalau BE emit `kategori` explicit di future, mobile bisa switch untuk lebih presisi.

### Q2: Gender-aware auto-detection kalau kirim `tipeRelasiId` explicit

Doc BE bilang: kirim `role: 'PARENT'` → BE lookup gender diri untuk simpan tipe granular (Ayah kalau L, Ibu kalau P).

**Scenario baru:** mobile sekarang kirim `tipeRelasiId: <uuid-ayah>` explicit. Kalau user misalnya perempuan tapi pilih "Ayah" (kekeliruan input), apakah BE:
- (a) Trust input mobile — simpan "Ayah" walau logically absurd
- (b) Validate + reject dgn 400 "tipe tidak sesuai gender"
- (c) Auto-correct silent — simpan "Ibu" tanpa notifikasi

**Preference mobile:** **(a) trust input**. UX picker kami sengaja tidak filter tipe berdasarkan gender user karena:
- Ada case adopsi (anak L bilang wanita = "Ibu adopsi")
- Ada case blended family
- User yg sengaja pilih salah bisa dihubungi admin untuk koreksi

Kalau BE pilih (b) — mobile perlu handle error state dgn message specific. Kalau (c) — mobile tidak tahu ada mismatch (silent surprise). Sebaiknya BE confirm behavior yang diadopsi.

---

## 5. Not Adopted (Optional / Future)

**Kategori grouping via BE metadata:** kalau BE emit `kategori` field explicit, mobile bisa drop heuristik nama. Sekarang mobile derive dari string match — works untuk 11-12 tipe existing, tapi kalau BE add tipe dgn naming pattern beda (mis. "Mertua", "Menantu"), akan masuk kategori "Wali / Lainnya" by default.

**Filter tipe by gender:** picker tampilkan semua 12 tipe. Kalau future BE add flag `applicableGender: 'L' | 'P' | null` di tipe, mobile bisa filter di picker (mis. user perempuan tidak lihat "Suami"). Not planned untuk v1.6.0.

**Multi-select tipe:** picker single-select saja. Tidak ada use case multi-tipe untuk 1 relasi.

---

## 6. Files Changed (Sprint 6 extension)

**New (4):**
- `app/src/types/tipeRelasi.ts` — TipeRelasi shape + kategori helpers
- `app/src/api/tipeRelasi.ts` — `GET /admin/keluarga/tipe`
- `app/src/hooks/useTipeRelasi.ts` — useTipeRelasi (24h cache) + useTipeRelasiGrouped
- `app/src/components/family/TipeRelasiPicker.tsx` — bottom sheet picker

**Modified (11):**
- `app/src/types/family.ts` — FamilyRole extend 6 values, payloads pakai discriminated union
- `app/src/api/family.ts` — add `updateFamilyRelation` dual-accept
- `app/src/hooks/useFamily.ts` — hooks pakai exported payload types, add `useUpdateFamilyRelation`
- `app/app/family/add/scan.tsx` — kirim `tipeRelasiId`
- `app/app/family/add/phone.tsx` — kirim `tipeRelasiId`
- `app/app/family/add/new.tsx` — kirim `tipeRelasiId`
- `app/app/family/[id].tsx` — edit picker via `useUpdateFamilyRelation`
- `app/app/family/index.tsx` — `relationDisplayLabel` prefer `tipeRelasi.nama`
- `app/src/components/family/RolePicker.tsx` — extend switch untuk GUARDIAN + OTHER (legacy file, retained tidak di-consume)
- `app/src/i18n/locales/id.json` + `en.json` — `family.tipe_*` + 7 kategori keys

**Ref commit:** `33df218 feat(family): adopt granular tipeRelasi (12 opsi) — Opsi C`

Typecheck: `npx tsc --noEmit` ✅ clean

---

## 7. Testing yang Direkomendasikan Sebelum Production

1. **Add family via scan QR** — pilih tipe granular "Anak Laki-Laki" → verify BE simpan dgn tipe tsb (bukan "CHILD" broad + gender infer)
2. **Add family via phone** — pilih "Suami" → verify reciprocal di sisi target auto set "Istri"
3. **Register-new dependent** — anak balita tanpa HP + pilih "Anak Perempuan" → verify jemaat baru tersimpan dgn tipe tsb + parent auto jadi primaryGuardian
4. **Edit relation existing** — buka family detail row lama (tanpa tipeRelasi field), pilih "Ayah" di picker → verify PATCH kirim tipeRelasiId, list refresh dgn "Ayah" tampil
5. **Backward compat** — kalau ada row super-lama masih `role: 'GUARDIAN'` di DB, verify tampil di list sebagai "Wali" (dari fallback roleLabel)

Kalau BE punya endpoint admin untuk seed test data 12 tipe granular ke jemaat test, please share — mobile bisa smoke test lengkap.

---

## Contact

- Mobile team: Ari (arichrst@ide.asia)
- Deploy target: v1.6.0 bundled dgn Sprint 6 (in-app notif + ministry join + granular tipeRelasi)
- Timeline: production submit dalam 3-7 hari

Kalau ada question / issue integration, reply di doc ini atau kirim `backend-request-*.md`.

---

*Doc versi: 1.0 — 2026-08-24.*
