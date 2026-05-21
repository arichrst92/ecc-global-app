# Backend Quick Note: MobileFaceNet dim correction 192 → 128

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-21
**Priority**: 🟠 **HIGH** — blocking M13 face login launch
**Status**: 🆕 **PROPOSED** — schema correction setelah TFLite convert
**Related**: `docs/backend-request-face-recognition-v2-mobilefacenet.md` (Q2 answer 192-dim)

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

- [ ] BE: change `length === 192` → `length === 128` di validation
- [ ] BE: update Zod schema length constraint
- [ ] BE: confirm done di doc ini atau reply Slack
- [x] Mobile: FACE_DESCRIPTOR_DIM constant updated
- [x] Mobile: verify dim via flatbuffer inspect script
