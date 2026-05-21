# Backend Quick Note: MobileFaceNet dim correction 192 → 128

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-21
**Priority**: 🟠 **HIGH** — blocking M13 face login launch
**Status**: ✅ **RESOLVED** — applied di BE patch 2026-05-21s
**Related**: `docs/backend-request-face-recognition-v2-mobilefacenet.md` (Q2 answer 192-dim — superseded)

---

## TL;DR

Setelah convert `sirius-ai/MobileFaceNet_TF` `.pb` → `.tflite` di mobile,
verify actual output dim: **128**, bukan 192.

Source-of-truth:
1. `arch/txt/MobileFaceNet_Arch.txt` baris terakhir: `Logits:[None, 128]`
2. TFLite flatbuffer inspect script (`scripts/inspect-tflite-shape.py`):
   tensor `embeddings` di offset 5060392, shape `[1, 128]` di offset 5060408
   (adjacent in binary = strong evidence ini output utama).
3. Cross-check di model 4.9MB consistent dengan 128-dim variant.

Saya estimasi awal 192 di v2 doc Q2 berdasarkan "typical MobileFaceNet"
asumsi — ternyata variant ini 128-dim.

## Action item BE (BLOCKING, trivial change)

**Di `packages/auth/src/face.ts`** (atau wherever `isValidDescriptor` ada):

```typescript
// Before (v2 patch 21r):
function isValidDescriptor(arr: number[]): boolean {
  return Array.isArray(arr) && arr.length === 192 && ...;
}

// After (correction):
function isValidDescriptor(arr: number[]): boolean {
  return Array.isArray(arr) && arr.length === 128 && ...;
}
```

Plus update Zod schema:
```typescript
// packages/shared-types/src/schemas/auth.ts
const faceDescriptorSchema = z.array(z.number()).length(128);  // was 192
```

Tidak perlu schema DB migration — JSON array tetap variable length, cuma
validation yang strict.

## modelVersion tetap

`mobilefacenet-v1` constant tetap valid — cuma dim assumption yang revised.
Tidak perlu bump ke `-v2`.

## Mobile side (DONE)

- ✅ `FACE_DESCRIPTOR_DIM = 128` di `src/types/auth.ts`
- ✅ Runtime log di FaceDescriptorProvider akan warn kalau model dim mismatch
- ✅ tflite asset bundled (`app/assets/ml/mobilefacenet.tflite` 4.9MB)

## Migration data

Sama dengan v2 — 0 production user enrolled (semua di-wipe sama migration
`20260521180000_face_v2_mobilefacenet`). No migration needed kalau dev env
juga belum sempat enroll dengan 192.

## Action items

- [x] BE: change `length === 192` → `length === 128` di validation
- [x] BE: update Zod schema length constraint
- [x] BE: confirm done di doc ini atau reply Slack
- [x] Mobile: FACE_DESCRIPTOR_DIM constant updated
- [x] Mobile: verify dim via flatbuffer inspect script

---

## ✅ Backend Response — 2026-05-21 (patch 21s)

Confirmed & applied. Thanks for catching ini sebelum production rollout — saved us awkward "descriptor 128 ditolak server expecting 192" loop di mobile pilot.

### Changes applied di BE

1. **`packages/auth/src/face.ts`**
   - `FACE_DESCRIPTOR_DIM = 128` (was 192)
   - Comments updated, patch 21s line added di header doc block

2. **`packages/shared-types/src/schemas/auth.ts`**
   - `faceDescriptorSchema = z.array(z.number()).length(128, 'Face descriptor harus 128 dimensi (MobileFaceNet)')`
   - Comment block updated dengan rationale + flatbuffer inspect reference
   - OpenAPI `modelVersion` example default `mobilefacenet-v1`

3. **`apps/core-api/src/routes/auth.ts`**
   - 3 occurrences: error message "Descriptor tidak valid (harus 128-dim, semua finite)" — semua converged via Edit replace_all
   - Header comment di `POST /auth/face/login` updated dengan patch 21s line

4. **`docs/mobile-api-guide.md`** section 1.4
   - Banner block tambah patch 21s note
   - Background: "192-dim" → "128-dim" semua mention
   - Mobile stack diagram: "192-dim descriptor" → "128-dim descriptor"
   - Error code table: `FACE_INVALID_DESCRIPTOR` description "Bukan 128-dim" (sudah 128 dari sebelumnya, no change needed)
   - Tambah explicit warning: dim kebetulan sama dengan legacy face-api.js (128) tapi descriptor space berbeda — disambiguate **wajib** via `face_model_version`

5. **`knowledge-base.md`** patch 21s entry baru. Patch 21r Q2 row di-annotate dengan corrigendum pointing ke 21s.

### Yang TIDAK berubah

- `mobilefacenet-v1` constant **tetap** — dim assumption yang revised, bukan model identity. No version bump.
- Migration `20260521180000_face_v2_mobilefacenet` **tidak perlu di-redo** — sudah wipe semua legacy. Json column flexible length, store 128 atau 192 sama-sama OK.
- Cosine similarity algorithm sama persis (dim-agnostic, semua reduce ke dot/magnitude).
- Threshold `FACE_MATCH_THRESHOLD = 0.5` tetap. Cosine pada normalized 128-dim descriptor punya range distribusi yang mirip 192-dim, jadi default ini reasonable. Tune setelah pilot data masuk.
- Tidak perlu schema migration. No DB action needed.

### ⚠️ Coincidence trap (please verify mobile-side)

Dim **kebetulan sama** dengan face-api.js legacy (128). Risk: kalau ada code path yang tanpa sengaja pakai legacy descriptor (misal cached, atau test fixture lama), validation 128-dim **lolos** padahal model space totally different — produce match=false untuk wajah yang sama.

**Mitigation BE side**: `POST /auth/face/login` reject `FACE_MODEL_MISMATCH` (409) kalau body `modelVersion != stored modelVersion`. Mobile **wajib** kirim `modelVersion: 'mobilefacenet-v1'` di request body untuk login & enroll. Kalau legacy descriptor entah bagaimana sampai ke server tanpa modelVersion, stored modelVersion lama (`facenet-v1`) sudah di-wipe via migration patch 21r → effectively impossible jadi false match di production.

Pastikan di mobile: setiap call ke `/auth/face/login` dan `/auth/face/enroll` selalu include `modelVersion: 'mobilefacenet-v1'` di body. Kalau ada code lama yang ngirim tanpa modelVersion, ganti.

### Verification command (kalau mau confirm BE-side)

```bash
# Dari workspace root
grep -rn "192" packages/auth/src/face.ts packages/shared-types/src/schemas/auth.ts apps/core-api/src/routes/auth.ts docs/mobile-api-guide.md
# Expected: zero matches (semua sudah 128)

grep -rn "length(128" packages/shared-types/
# Expected: faceDescriptorSchema match
```

### Deploy

No restart required di BE kalau dev mode hot reload aktif. Production deploy: standard rebuild + restart. **Tidak perlu** `pnpm db:migrate` ataupun `db:generate` (zero schema change). Cuma `pnpm dev` restart untuk pick up tsx watch.

### Git

```bash
cd /Users/idea/Projects/ecc-core-platform
git add packages/auth/src/face.ts \
        packages/shared-types/src/schemas/auth.ts \
        apps/core-api/src/routes/auth.ts \
        docs/mobile-api-guide.md \
        knowledge-base.md
git commit -m "fix(face): correct MobileFaceNet descriptor dim 192 → 128

Mobile flatbuffer inspect of sirius-ai/MobileFaceNet_TF .tflite confirms
output tensor shape [1, 128]. Initial estimate 192 in patch 21r was based
on 'typical MobileFaceNet' assumption — actual variant is 128-dim.

- FACE_DESCRIPTOR_DIM: 192 → 128
- faceDescriptorSchema.length(128) + updated message
- Error messages '192-dim' → '128-dim'
- mobile-api-guide section 1.4 updated
- KB patch 21s entry

No schema/DB migration needed (Json column flexible length, legacy data
already wiped via migration 20260521180000). modelVersion 'mobilefacenet-v1'
remains canonical disambiguator vs legacy face-api.js (also 128-dim).

Refs: ecc-mobile-app/docs/backend-request-face-recognition-v2-mobilefacenet-dim-correction.md"
git push
```

Ping kalau ada anomali setelah pilot enroll/login start. Ready untuk M13 launch from BE side.
