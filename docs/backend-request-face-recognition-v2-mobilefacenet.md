# Backend Request V2: Migrate ke MobileFaceNet (TFLite compatible)

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-21
**Priority**: 🟠 **HIGH** — blocking M13 face recognition launch
**Status**: ✅ **RESOLVED 2026-05-21** — BE switch ke MobileFaceNet 192-dim cosine. 10 questions di-answer di section "Backend Response" di akhir doc.
**Supersedes**: face-api.js choice di v1 doc, section A.1

---

## TL;DR

Setelah implementation + testing M13 dengan stack v1 (face-api.js via hidden
WebView di mobile), kami hit blocker fundamental: **TFJS di React Native WebView
terlalu lambat untuk production** (detection hang >60s bahkan dengan WebGL
backend yang reported OK).

**Mobile escalate ke native TFLite + MobileFaceNet** (~100ms inference,
production-grade).

**Konsekuensi**: BE perlu switch dari face-api.js (FaceNet 128-dim) ke
**MobileFaceNet** supaya embedding space match. Existing enrolled data (kalau
ada) perlu re-enroll. Karena belum ada user yang berhasil enroll (semua hit
timeout di mobile), tidak ada data loss.

---

## Diagnostic recap

Mobile sudah coba:

1. ✅ Resize image 480px width → ~50KB base64 (cukup kecil)
2. ✅ Explicit TF backend setup → WebGL chosen successfully
3. ✅ detectSingleFace + inputSize 320 (fastest options)
4. ✅ Direct injectJavaScript call + comprehensive logging

Hasil terakhir (Metro logs Ari):
```
[WebView] backend: webgl OK
[WebView] image loaded 480x1041
[WebView] starting detection, backend=webgl
⏱ ... 60s no response ...
timeout — TFJS backend mungkin terlalu lambat di device ini
```

Detection step yang hang. WebView TFJS WebGL "OK" tapi inference tetap blocking >60s.

**Conclusion**: face-api.js + WebView **tidak feasible untuk production**. Dropped.

---

## Proposed new stack

### Mobile

- **`react-native-fast-tflite`** — native TFLite inference dengan NNAPI (Android) /
  CoreML (iOS) acceleration. Production-grade, ~100ms detection di mid-range HW.
- **MobileFaceNet** atau **MobileFaceNet variant** model (~5MB) sebagai TFLite asset
  bundled di app.
- **`@react-native-ml-kit/face-detection`** untuk face detection step (Google ML Kit
  native, very fast) — output crop region untuk MobileFaceNet embedding.

Pipeline:
```
Camera capture → ML Kit detect bounding box → crop face region
              → resize ke 112x112 → MobileFaceNet TFLite → 192-dim descriptor
```

### Backend

Need to switch dari **face-api.js (FaceNet 128-dim)** ke **MobileFaceNet**:

- Same TFLite model + Python wrapper (atau Node.js wrapper tensorflowjs-node)
- atau Python service (FastAPI) dengan tensorflow-lite Python runtime
- Embedding dim: **192-dim** (MobileFaceNet standard)
- Distance metric: **cosine similarity** (MobileFaceNet tuned untuk cosine)
- Threshold: **~0.5 cosine** (perlu pilot tuning, mirip face-api 0.5 euclidean)

---

## Questions untuk BE team

### 1. Model identity + version

MobileFaceNet ada beberapa variant. Sebaiknya stick ke ONE spesifik weights file:
- **Recommendation**: `MobileFaceNet` from Sefik Ilkin Serengil's deepface
  (https://github.com/serengil/deepface), atau dari
  https://github.com/sirius-ai/MobileFaceNet_TF (TFLite ready, ~4MB).
- BE OK dengan recommendation ini, atau punya preferensi sendiri?

### 2. Embedding dim

Default MobileFaceNet output **192-dim**. Confirm BE bisa adjust schema dari
128 ke 192 (atau pakai variant 128-dim kalau exists).

### 3. Distance metric switch

Current BE: **euclidean** + threshold 0.5 (face-api standard).

New: MobileFaceNet biasanya pakai **cosine similarity** + threshold ~0.5 (range
0-1, higher = better match). Confirm switch + threshold default.

### 4. Migration existing data

- Berapa user yang sudah enrolled face di production? Kalau **0** (expected
  karena semua kena timeout), no migration needed.
- Kalau ada beberapa test enroll: invalidate via `DELETE /auth/me/face-profile`
  manually + ask user re-enroll.

### 5. Versioning

`modelVersion` saat ini `facenet-v1`. Switch ke `mobilefacenet-v1`. Mobile + BE
saling reject kalau mismatch (existing `FACE_MODEL_MISMATCH` error code).

### 6. BE inference stack

Pilihan untuk run MobileFaceNet di server-side:

- **A. tensorflowjs-node**: keep Node.js, swap face-api.js dengan
  @tensorflow/tfjs-node + custom MobileFaceNet model loading. Same TS
  ecosystem. ~2 hari dev.
- **B. Python service (FastAPI)**: spin up sidecar dengan tflite-runtime atau
  tensorflow. RPC dari Node API. ~3 hari dev. Lebih clean separation, scaling
  independent.
- **C. ONNX Runtime Node** (onnxruntime-node): convert MobileFaceNet ke ONNX,
  jalanin via Node binding. Performant. ~2 hari.

BE recommendation?

### 7. Storage format

Saat ini `User.faceDescriptor` JSON array (128 float). Switch ke 192 float
JSON array. Schema migration trivial.

### 8. pgvector reconsider

Sebelumnya defer. Sekarang dengan 192-dim, pgvector worth re-evaluate kalau
jemaat > 10k atau smart system aktif. Defer juga OK untuk MVP.

### 9. Threshold tuning

Tidak ada pilot data dengan MobileFaceNet. Plan: start `cosine > 0.5`,
adjust setelah 10-20 enrollment + test login matching.

### 10. Liveness — masih client-side?

Sama dengan v1 doc: liveness mobile responsibility. BE no change.

---

## Endpoint spec changes

**Minimal**, mostly schema field updates:

| Endpoint | Change |
|---|---|
| `POST /auth/face/enroll` | Accept 192-dim descriptor. modelVersion enum: `mobilefacenet-v1` (legacy `facenet-v1` reject 409 `FACE_MODEL_MISMATCH`) |
| `POST /auth/face/login` | Same |
| `PUT /auth/me/face-profile` | Same |
| `DELETE /auth/me/face-profile` | No change |
| `GET /auth/me/face-profile` | Response include `modelVersion` field (sudah ada) — mobile cek match sebelum login |

Validation pakai `isValidDescriptor()` di BE — ubah dari `length === 128` ke
`length === 192` (atau accept both untuk transition period kalau ada legacy data).

---

## Mobile-side plan (after BE confirm)

1. **Install deps**:
   - `react-native-fast-tflite`
   - `@react-native-ml-kit/face-detection`
   - `expo-image-manipulator` (sudah ada — untuk crop face region)

2. **Bundle MobileFaceNet** ke `app/assets/ml/mobilefacenet.tflite`. Loaded
   via `useTensorflowModel` hook.

3. **Replace WebView approach**: hapus `FaceDescriptorProvider`,
   `react-native-webview` dep. Service `faceDescriptor.ts` reimplement
   pakai native module.

4. **Pipeline**:
   ```typescript
   // FaceCapture component
   const photo = await camera.takePictureAsync();
   const faces = await MLKitFaceDetector.detectFaces(photo.uri);
   const face = faces[0];  // single face
   const cropped = await ImageManipulator.crop(photo, face.boundingBox);
   const resized = await ImageManipulator.resize(cropped, 112, 112);
   const tensor = imageToTensor(resized);
   const descriptor = await mobileFaceNet.run(tensor);
   ```

5. **Switch modelVersion** constant `facenet-v1` → `mobilefacenet-v1`.

Estimasi mobile: **3-4 hari** setelah BE endpoint ready.

---

## Privacy implications

Sama bagusnya dengan v1 approach:
- Image asli **tidak pernah keluar device**
- Cuma descriptor 192-float di-upload
- PDP Law profile tetap sama

---

## Action items

### BE team (BLOCKING)
- [ ] Decide inference stack (A/B/C above)
- [ ] Implement MobileFaceNet loading + matching di chosen stack
- [ ] Schema migration: descriptor dim 128 → 192 (atau accept both)
- [ ] Update modelVersion enum: add `mobilefacenet-v1`
- [ ] Update isValidDescriptor validation
- [ ] Decide cosine threshold default
- [ ] Reply doc dengan implementation details

### Mobile (waiting BE)
- [ ] Wait BE confirm model variant + dim + threshold
- [ ] Install native ML deps
- [ ] Build TFLite + ML Kit pipeline
- [ ] Remove WebView approach (FaceDescriptorProvider + dep)
- [ ] Test end-to-end pada device target

### Legal / product
- [ ] Privacy Policy update tidak perlu re-review (architecture sama —
      on-device descriptor)
- [ ] DPA Kominfo tetap perlu (PDP Law concern sama)

---

## Reference

- Issue thread: `docs/backend-request-face-recognition.md` v1
- Diagnostic commits di mobile repo:
  - `19f4a1e` (diagnostic logging)
  - `5308b5a` (TF backend + smaller image, still hang)
- MobileFaceNet paper: https://arxiv.org/abs/1804.07573
- TFLite model source: https://github.com/sirius-ai/MobileFaceNet_TF/tree/master

---

*Status PROPOSED 2026-05-21. Mobile blocked sampai BE confirm inference stack.*

---

# Backend Response — 2026-05-21

**Dari**: Tim Backend ECC (IDEA dev team)
**Status**: ✅ **DELIVERED**

## ⚡ Key insight — BE tidak butuh inference stack

**Q6 di request bisa di-skip**. Server **tidak run inference** — cuma compute cosine similarity antar 2 descriptor yang sudah pre-computed di client side. Pure math, ~10 lines TypeScript:

```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] ** 2;
    magB += b[i] ** 2;
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
```

Pakai langsung di Node TS. **Tidak butuh** TFLite, ONNX, atau Python sidecar. Saving: ~3 hari estimated effort.

## Answers untuk 10 questions

**Q1 (model identity)**: OK rekomendasi mobile — pakai MobileFaceNet TFLite dari **serengil/deepface** atau **sirius-ai/MobileFaceNet_TF**. Mobile harus pilih satu + commit file `mobilefacenet.tflite` ke `app/assets/ml/`. BE side tidak ada model file — cuma store & compare descriptor.

**Q2 (embedding dim)**: ✅ **192**. Schema updated.

**Q3 (distance metric)**: ✅ **Cosine similarity**, threshold default 0.5 (higher = better match).

**Q4 (migration existing data)**: ✅ Confirmed 0 production user enrolled (semua pilot hit timeout). Migration `20260521180000_face_v2_mobilefacenet` wipe legacy 128-dim data via UPDATE — effective no-op di production, safety untuk dev env yang mungkin punya test data.

**Q5 (versioning)**: ✅ `mobilefacenet-v1` default. Stored data dengan `faceModelVersion != 'mobilefacenet-v1'` ditolak `FACE_MODEL_MISMATCH` di login — force re-enroll.

**Q6 (BE inference stack)**: **None needed**. Server cuma compute cosine similarity native TS. No TFLite/ONNX/Python required. Saving 2-3 hari effort.

**Q7 (storage format)**: ✅ JSON column existing cukup. 192 float ~ 2KB per row, negligible storage.

**Q8 (pgvector)**: ✅ Defer untuk MVP. Linear scan dengan noHp hint cuma 1 compare per login = O(1). Switch ke pgvector kalau smart system aktif (full-corpus search) atau jemaat > 50k.

**Q9 (threshold tuning)**: ✅ Default 0.5 cosine. Tune setelah pilot data 10-20 enrollment + test matching. Override via env `FACE_MATCH_THRESHOLD`.

**Q10 (liveness)**: ✅ Mobile responsibility (same dengan v1 — no server liveness).

## Implementation summary

### Code changes

| File | Change |
|---|---|
| `packages/auth/src/face.ts` | Rewrite — `cosineSimilarity()` baru, `matchFace()` return `{ match, similarity, threshold }`, `isValidDescriptor()` length 192. `euclideanDistance()` deprecated tapi tetap di-export untuk audit |
| `packages/shared-types/src/schemas/auth.ts` | `faceDescriptorSchema` length 128 → 192 |
| `apps/core-api/src/routes/auth.ts` | 5 handler updated: confidence = cosine directly, reject stored modelVersion legacy, default `mobilefacenet-v1` |
| `packages/database/prisma/migrations/20260521180000_face_v2_mobilefacenet/migration.sql` | Wipe legacy 128-dim data |

### API behavior changes

| Endpoint | Before (v1) | After (v2) |
|---|---|---|
| Descriptor format | 128-dim float | **192-dim float** |
| Distance metric | Euclidean | **Cosine similarity** |
| Match criterion | `distance < threshold` | **`similarity >= threshold`** |
| Confidence calc | `1 - distance/threshold` | **cosine similarity directly** |
| Default modelVersion | `facenet-v1` | **`mobilefacenet-v1`** |
| Stored legacy data | accepted | **rejected `FACE_MODEL_MISMATCH`** |

Error codes tetap sama: `FACE_NOT_ENROLLED`, `FACE_NO_MATCH`, `FACE_MODEL_MISMATCH`, `FACE_INVALID_DESCRIPTOR`, `FACE_ALREADY_ENROLLED`.

### Request body example

```json
POST /auth/face/enroll
Authorization: Bearer <JWT>

{
  "descriptor": [0.123, -0.456, ... 192 numbers ...],
  "modelVersion": "mobilefacenet-v1",
  "metadata": {
    "platform": "ios",
    "deviceModel": "iPhone 15 Pro",
    "appVersion": "0.1.0",
    "consentVersion": "v1-2026-05-21"
  }
}
```

### Response example

```json
POST /auth/face/login → 200

{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "user": { ... },
    "confidence": 0.78
  }
}
```

`confidence` = cosine similarity (range 0..1 untuk normalized descriptors).

## Action items mobile

- [ ] Install `react-native-fast-tflite` + `@react-native-ml-kit/face-detection`
- [ ] Bundle MobileFaceNet TFLite ke `app/assets/ml/mobilefacenet.tflite`
- [ ] Replace WebView-based descriptor compute (delete `FaceDescriptorProvider` + `react-native-webview` dep)
- [ ] Reimplement `faceDescriptor.ts` pakai native module
- [ ] Switch constant `modelVersion` ke `mobilefacenet-v1`
- [ ] Pipeline: Camera → ML Kit detect → crop → resize 112x112 → MobileFaceNet → 192-dim → POST
- [ ] Update confidence display di UI — sekarang langsung cosine similarity (no inversion needed)

## Action items BE (DONE)

- [x] Switch face.ts ke cosine + 192-dim
- [x] Update Zod schemas
- [x] Update auth handlers (5 endpoint)
- [x] Migration wipe legacy data
- [x] Update mobile-api-guide section 1.4
- [x] KB patch 2026-05-21r

## User perlu run di local

```bash
pnpm install
pnpm db:generate                                   # no-op kalau Prisma client sudah up-to-date
pnpm --filter @ecc/database db:migrate dev          # apply migration cleanup
pnpm dev                                            # restart server
```

## Threshold tuning recommendation

Setelah mobile launch + dapat 10-20 pilot enrollment:

1. Test login matching dengan same person + variasi lighting/angle → record similarity score
2. Test false-positive: A login pakai descriptor B (saudara/mirip) → record similarity
3. Set threshold di middle ground (mis. kalau true-positive 0.7+, false-positive 0.4-, set threshold 0.55)
4. Override via env: `FACE_MATCH_THRESHOLD=0.55` di `.env`

Atur conservative awal (0.5) untuk minimize false-accept. Adjust kalau false-reject sering.

## Privacy / legal — no change

- Architecture sama dengan v1: image asli tidak keluar device, cuma descriptor di-upload
- Privacy Policy tetap perlu update dengan section "Data Biometrik" (sebelum production)
- DPA Kominfo registration tetap perlu (UU 27/2022 Pasal 4)
- Mobile track `consentVersion` di metadata audit

---

*Ticket closed 2026-05-21. Mobile siap implement native TFLite pipeline.*
