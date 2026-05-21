# Backend Request V2: Migrate ke MobileFaceNet (TFLite compatible)

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-21
**Priority**: 🟠 **HIGH** — blocking M13 face recognition launch
**Status**: 🆕 **PROPOSED** — follow-up dari `backend-request-face-recognition.md`
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
