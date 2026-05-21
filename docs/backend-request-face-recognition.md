# Backend Request: Face Recognition (Login + Smart System Future Use)

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-21
**Priority**: 🟡 **MEDIUM** — feature M11 (was opsional, sekarang in-scope karena smart system planning)
**Status**: ✅ **RESOLVED 2026-05-21** — BE implement endpoint RESTful + answers 20 technical questions di section "Backend Response" di akhir doc.

---

## TL;DR

Mobile butuh **server-side face recognition system** untuk:

1. **Login alternative** — capture wajah → BE matching → return JWT (alternatif OTP login)
2. **Smart system future** (data prerequisite) — face descriptor jemaat di-store di BE supaya
   nanti bisa di-pakai untuk:
   - Auto check-in ibadah / event via camera di lobby
   - Identifikasi visitor / jemaat baru saat lobby greeting
   - Family clustering (siapa datang sama siapa di event)
   - Anti-spoofing untuk ibadah online (verifikasi peserta authentic)

Pendekatan yang sudah jalan di mobile sekarang: **biometric unlock** (Face ID / Fingerprint
device-level via expo-local-authentication, M11.1-7) — itu cuma "session restore" gate,
**tidak ada data face di server**. Doc ini request **face recognition real** yang berbeda.

---

## Why now (not future)

Smart system stuff (auto check-in, lobby greeting, family clustering) baru bisa work
kalau ada **base data face descriptor jemaat yang terkumpul**. Kalau enrollment dimulai
sekarang lewat login flow:

- 6 bulan launch → 200-500 jemaat sudah enroll
- 1 tahun → coverage 60-80% jemaat aktif
- Smart system tinggal aktifkan kapan saja BE + ML team ready

Kalau enrollment baru dimulai saat smart system go-live, butuh **bulk enrollment day**
yang ribet operasional. Jauh lebih smooth kalau "drip enrollment" via login flow.

---

## Architecture proposal (high level)

```
┌─────────────────────────────┐         ┌──────────────────────────┐
│  Mobile (Expo)              │         │  Backend                 │
│                             │         │                          │
│  Enrollment:                │         │  POST /auth/face/enroll  │
│  1. Capture face (camera)   │ ──────► │  • Validate descriptor   │
│  2. Detect + crop + align   │         │  • Store FaceProfile     │
│  3. Compute 128-dim         │         │    (jemaatId, vec128,    │
│     descriptor on-device    │         │     enrolledAt)          │
│  4. Send vec128 to BE       │         │                          │
│                             │         │                          │
│  Login:                     │         │  POST /auth/face/login   │
│  1. Capture face            │ ──────► │  • Compute vec128 (sama  │
│  2. Compute descriptor      │         │    model) → BE compare   │
│  3. Send vec128 to BE       │         │  • Find nearest neighbor │
│  4. Get JWT kalau match     │         │    (cosine/euclidean)    │
│                             │         │  • Threshold 0.6         │
│                             │         │  • Return JWT atau 401   │
│                             │         │                          │
│  Smart System (future):     │         │  POST /smart/identify    │
│  Camera lobby / kiosk →     │ ──────► │  • Sama logic /login     │
│  vec128 → identify jemaat   │         │    tapi return jemaatId  │
│                             │         │    saja, no auth         │
└─────────────────────────────┘         └──────────────────────────┘
```

**Key design decision**: descriptor computed **on-device**, BE cuma store + compare. Alasan:
- Privacy: image asli tidak pernah keluar device
- Performance: ML inference di device CPU/Neural Engine cepat
- Bandwidth: kirim 128 float (~512 bytes) vs upload 2-5MB image
- PDP Law friendlier: BE tidak hold biometric image, hanya hash-like representation

Trade-off: tergantung consistency model ML di-device. Kalau iOS pakai library X dan
Android pakai library Y, descriptors bisa **tidak comparable** (different embedding space).
Solusi: pakai **library yang sama** di kedua platform — kandidat: `MediaPipe Face` atau
`face-api.js` dengan ONNX/TFLite. Detail di technical questions di bawah.

---

## Technical questions untuk BE team

Ini list pertanyaan yang BE perlu evaluate sebelum implementation. Jawaban dari BE bakal
shape mobile-side implementation (library choice, payload format, error handling).

### A. ML library + model

1. **Library di-device apa yang BE rekomendasikan?**
   - **Opsi 1**: `@react-native-ml-kit/face-detection` (Google ML Kit) — detection only, no
     embedding. Butuh secondary library untuk embedding.
   - **Opsi 2**: `face-api.js` di RN via JSI bridge — sudah ada model 128-dim (FaceNet style).
     Mature di web, RN port less mature.
   - **Opsi 3**: MediaPipe Face (Google) — embedding model recent (2023+). Belum ada RN
     wrapper resmi, harus custom bridge.
   - **Opsi 4**: TensorFlow Lite custom model — pakai pre-trained MobileFaceNet (~5MB) +
     `react-native-fast-tflite`. Most control, most work.
   - **Opsi 5**: Apple Vision (iOS) + Google ML Kit (Android) — different per-platform,
     descriptors NOT comparable. Need server-side re-embedding. Heavier server cost.
   - **BE preference dan alasan?**

2. **Embedding dimension yang diharapkan?**
   - Standard FaceNet: **128-dim** float32
   - MobileFaceNet: 192-dim atau 512-dim
   - ArcFace: 512-dim
   - Pilih satu — kita stick. **BE pilih yang mana?**

3. **Distance metric untuk matching?**
   - Cosine similarity (range -1..1, similar = high)
   - Euclidean distance (similar = low)
   - Cosine more common di FaceNet/ArcFace. **BE preference?**

4. **Threshold accept/reject default?**
   - FaceNet: cosine > 0.6 dianggap match. Kalau strict, pakai 0.7.
   - Trade-off: high threshold → false reject (jemaat ditolak login). Low threshold →
     false accept (security risk). **BE punya benchmark dari pilot data?**

### B. Storage + privacy

5. **Tabel schema yang BE rancang?**
   - Proposal mobile-side:
     ```
     FaceProfile {
       id: string (uuid)
       jemaatId: string (FK Jemaat.id, unique — 1 jemaat 1 profile)
       descriptor: Float32Array (128-dim)  // atau JSON array
       enrolledAt: DateTime
       updatedAt: DateTime
       version: int (untuk schema migration kalau ganti model)
       enrollmentDeviceId: string (audit trail)
       isActive: bool (untuk soft-disable kalau jemaat opt-out)
     }
     ```
   - **BE OK dengan single profile per jemaat, atau multiple (mis. enrollment ganda dengan
     glasses on/off, lighting variations)?**

6. **Storage format descriptor di DB?**
   - Postgres: `real[]` (array of float)
   - Postgres + pgvector extension: `vector(128)` — built-in nearest neighbor search
     dengan index HNSW/IVFFlat (cepat untuk smart system search)
   - JSON: `Float[]` di JSON column (lebih portable tapi slower)
   - **BE pilih yang mana? pgvector ada plan untuk install di infra?**

7. **Encryption at rest?**
   - Face descriptor adalah biometric data — PDP Law (UU 27/2022) classify ini sebagai
     "data pribadi spesifik" (Pasal 4). Wajib safeguards extra.
   - Apakah BE bakal encrypt column-level (mis. pgcrypto) atau cukup encrypted volume
     storage? **Recommendation BE?**

8. **Retention policy?**
   - Jemaat right to delete (Pasal 16 PDP Law) — BE punya endpoint
     `DELETE /admin/me/face-profile` untuk wipe?
   - Auto-purge kalau jemaat status archive (UPDATE Jemaat.aktif=false) selama 6 bulan?
   - **BE policy proposal?**

### C. Liveness detection (anti-spoofing)

9. **Liveness check perlu untuk login?**
   - Tanpa liveness, login bisa di-bypass dengan foto cetak / video di HP lain.
   - Pilihan:
     - **A**: server-side liveness — mobile kirim 3-5 frames + descriptor masing-masing,
       BE check motion vector untuk verify live person.
     - **B**: client-side liveness — challenge-response: blink, head turn, smile detection
       di-device sebelum kirim descriptor.
     - **C**: no liveness — accept risk, treat face login as "convenience" only (OTP tetap
       fallback resmi untuk action sensitive seperti payment).
   - **BE preference + apakah ECC OK dengan opsi C untuk MVP?**

10. **Apakah BE concern dengan twin / saudara mirip false positive?**
    - Real risk di jemaat keluarga. Mitigasi: increase threshold ke 0.75+, atau combine
      dengan secondary check (phone number + face).
    - **BE recommendation?**

### D. Smart system integration

11. **Endpoint design untuk smart system (future)?**
    - Proposal: `POST /smart/identify` body=`{ descriptor: [128 float] }` → response =
      `{ jemaatId, namaLengkap, confidence }` atau 404 "no match"
    - Auth: ini endpoint sensitif (PII lookup) — perlu API key terpisah untuk kiosk/IoT
      device atau pakai user JWT (volunteer scanner mode)?
    - **BE prefer API key scheme atau extend existing JWT?**

12. **Bulk identification batch?**
    - Smart system kamera lobby mungkin process 10-50 wajah simultaneously per frame
      (event ramai). Batch endpoint `POST /smart/identify-batch` lebih efisien.
    - **BE OK design batch endpoint? Pagination/throttling concern?**

13. **Smart system audit trail?**
    - Setiap identifikasi (mis. di kamera lobby) di-log: `FaceIdentificationLog { jemaatId,
      source ('lobby_cam_1'), confidence, identifiedAt }`. Berguna untuk attendance auto-track.
    - **BE OK design schema ini sekarang atau punt sampai smart system aktif?**

### E. Error handling + edge cases

14. **Apa response BE kalau enrollment ada duplikat (jemaat A descriptor cocok > 0.85 dengan
    jemaat B yang sudah enrolled)?**
    - Possible scenario: data entry error (1 jemaat dua nomor HP, enrol di kedua), atau
      saudara kembar.
    - Block enrollment + flag untuk admin review? Atau tetap allow + log warning?

15. **Re-enrollment** (jemaat update wajah — habis operasi plastik, atau jenggot baru):
    - Endpoint `PUT /auth/face/enroll` yang replace existing? Atau require admin re-approval?
    - **BE preference?**

16. **Error response shape kalau login face fail (no match)?**
    - Proposal: HTTP 401 dengan code `FACE_NO_MATCH` (consistent dengan OTP error pattern)
    - **BE OK dengan code naming ini?**

### F. Performance + rate limiting

17. **Search performance untuk login** (find nearest neighbor di N=10,000+ jemaat):
    - Linear scan: O(n) ~50ms acceptable untuk 10k. > 100k jemaat butuh index.
    - pgvector dengan HNSW index: O(log n), ~5ms untuk 1M descriptor
    - **BE plan: linear sekarang + migrate ke pgvector saat scale, atau pgvector dari awal?**

18. **Rate limit endpoint /auth/face/login?**
    - Brute force concern: attacker bisa try random descriptors sampai dapat match
    - Recommend: 5 attempt / phone / 15 menit (sama dengan OTP rate limit)
    - **BE existing rate limit infra bisa di-extend untuk face endpoint?**

### G. PDP Law compliance

19. **Consent flow saat enrollment di mobile:**
    - Mobile bakal tampilkan layar consent: "Aktifkan login dengan wajah? Data wajah Anda
      akan disimpan oleh ECC untuk login dan fitur kehadiran otomatis di masa depan."
    - Apakah BE perlu store consent timestamp + version untuk audit (kalau ada audit Kominfo)?
    - **BE design tabel `FaceProfileConsent { jemaatId, consentedAt, version, withdrawnAt }`?**

20. **DPA (Data Processing Agreement) — apakah ECC perlu file ini ke Kominfo untuk biometric
    processing?**
    - Per UU 27/2022, controller (ECC) wajib register kalau process biometric data.
    - **Tim legal sudah aware? Atau perlu trigger compliance check?**

---

## Endpoint specs proposal

Mobile butuh 4 endpoint minimum. Mohon BE confirm/refine signature:

### 1. Enroll face

```
POST /auth/face/enroll
Authorization: Bearer <JWT>

Body:
{
  "descriptor": [0.123, -0.456, ...],  // 128 float, normalized
  "modelVersion": "facenet-v1",         // future-proofing
  "metadata": {
    "platform": "ios",
    "deviceModel": "iPhone 15 Pro",
    "appVersion": "0.1.0"
  }
}

Response 201:
{
  "success": true,
  "data": {
    "id": "face-profile-uuid",
    "jemaatId": "...",
    "enrolledAt": "2026-05-21T...",
    "modelVersion": "facenet-v1"
  }
}

Response 409 (jika sudah enrolled, untuk re-enrollment pakai PUT):
{ "success": false, "code": "FACE_ALREADY_ENROLLED" }

Response 422 (descriptor invalid — wrong dimension, NaN, etc.):
{ "success": false, "code": "FACE_INVALID_DESCRIPTOR" }
```

### 2. Login via face

```
POST /auth/face/login
(no auth)

Body:
{
  "descriptor": [0.123, -0.456, ...],
  "noHp": "+628...",          // optional hint untuk reduce search space + rate limit per phone
  "modelVersion": "facenet-v1"
}

Response 200:
{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": 900,
    "user": { ... },
    "confidence": 0.82  // optional, untuk mobile show "logged in as X (high confidence)"
  }
}

Response 401:
{
  "success": false,
  "code": "FACE_NO_MATCH",
  "message": "Wajah tidak dikenali, coba lagi atau login dengan OTP"
}

Response 429:
{ "success": false, "code": "FACE_LOGIN_RATE_LIMIT" }
```

### 3. Get my face profile status

```
GET /auth/me/face-profile
Authorization: Bearer <JWT>

Response 200:
{
  "success": true,
  "data": {
    "enrolled": true,
    "enrolledAt": "2026-05-21T...",
    "modelVersion": "facenet-v1",
    "lastUpdatedAt": "2026-05-21T..."
  }
}

Response 200 (kalau belum enroll):
{
  "success": true,
  "data": { "enrolled": false }
}
```

### 4. Delete face profile

```
DELETE /auth/me/face-profile
Authorization: Bearer <JWT>

Response 200:
{ "success": true, "data": null, "message": "Face profile dihapus" }
```

Mobile call ini saat user pilih "Hapus data wajah saya" di settings.

### 5. Re-enroll (replace existing)

```
PUT /auth/me/face-profile
Authorization: Bearer <JWT>

Body: sama dengan POST enroll.

Response 200: sama format dengan POST.
```

---

## Mobile-side plan (setelah BE ready)

Mobile sudah ada `FaceLoginPayload` type stub di `src/types/auth.ts` + endpoint stub di
`src/api/auth.ts` line 84 (`/auth/face/login`). Implementation queue:

1. **Library setup**: install + configure pilihan library (depend on BE answer Q1)
2. **Camera UI**: react-native-vision-camera + face detection overlay (oval guide, "Posisikan
   wajah di tengah", "Tahan sebentar")
3. **Enrollment screen** di Profile Settings → "Aktifkan Login Wajah"
4. **Login screen variant**: existing welcome face button (sudah ada di M11.7) di-wire ke
   actual face capture (saat ini biometric unlock, di-rebrand jadi "Login Wajah" yang
   memang real face)
5. **Consent flow**: layar consent eksplisit sebelum first enrollment dengan link ke
   privacy policy
6. **Hapus data**: button di Profile → Privacy → "Hapus Data Wajah" (sebagai compliance)

Estimasi mobile dev: **3-5 hari** setelah BE endpoints ready + library decision.

---

## Privacy & legal considerations

Sebelum BE implement, pastikan:

- [ ] **Legal team review** kebijakan privacy ECC App untuk biometric processing
- [ ] **Privacy Policy** di-update dengan section "Data Biometrik": apa yang dikumpulkan,
      tujuan, retention, hak user
- [ ] **Consent screen** di-draft (mobile akan implement, tapi wording harus legal-approved)
- [ ] **Tim Operations** training: handle complaint "saya tidak mau wajah disimpan" → cara
      delete via mobile / via admin portal
- [ ] **Insurance / liability** kalau data breach (face descriptor biometric data leak)
- [ ] **DPIA (Data Protection Impact Assessment)** — jenis dokumen yang biasa diminta auditor

---

## Decisions needed (untuk record setelah BE response)

| Topic | Decision |
|---|---|
| ML library | _BE answer_ |
| Embedding dim | _BE answer_ |
| Distance metric | _BE answer_ |
| Threshold default | _BE answer_ |
| pgvector | _BE answer_ |
| Encryption at rest | _BE answer_ |
| Liveness | _BE answer_ |
| Smart system endpoint design | _BE answer_ |
| Re-enrollment policy | _BE answer_ |
| PDP Law compliance scope | _BE answer + Legal_ |

---

## Action items untuk BE team

- [ ] **Review technical questions** (sections A-G) — high level direction
- [ ] **Coordinate dengan ML team / advisor** kalau ada (atau learn-as-we-go OK)
- [ ] **Coordinate dengan Legal team** untuk PDP Law compliance scope (questions di section G)
- [ ] **Effort estimate** untuk implement 5 endpoints di atas
- [ ] **Timeline proposal** — bisa di-prioritize tinggi atau low (smart system aktivasi
      bertahap)
- [ ] **Confirm pilihan library** supaya mobile bisa mulai integrate
- [ ] **Reply di doc ini** atau create reply doc — sama pattern dengan request lain

---

## Reference

- M11 (current) biometric-unlock impl: `app/src/services/biometric.ts`,
  `app/src/components/auth/BiometricGate.tsx`. Itu **device-level only**, beda dengan
  request ini (server-side face match).
- M11.7 fix: `app/(auth)/welcome.tsx` face button. Saat ini wire ke biometric unlock,
  setelah face recognition ready akan di-rebrand jadi real face login.
- Mobile API guide: `reference/mobile-api-guide.md` section 1 (auth) — tempat dokumentasi
  endpoint baru kalau sudah ready.
- PDP Law (UU 27/2022): https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022

## Kontak

Reply via Slack #ecc-mobile channel atau langsung edit doc ini dengan section "Backend
Response" di akhir (sama pattern dengan request lain).

---

*Status PROPOSED 2026-05-21. Menunggu BE response untuk technical questions.*

---

# Backend Response — 2026-05-21

**Dari**: Tim Backend ECC (IDEA dev team)
**Status**: ✅ **DELIVERED**
**Swagger**: tag `Auth · Face Recognition` punya 6 endpoint (3 legacy + 3 RESTful baru).

## Ringkasan

**Existing BE infrastructure** (dari Phase 1 sebelumnya):
- 128-dim FaceNet descriptor (face-api.js compatible)
- Euclidean distance, threshold 0.5
- `User.faceDescriptor` Json + `faceEnrolledAt`
- `matchFace()` + `isValidDescriptor()` di `@ecc/auth`

**Patch 21q tambahan**:
- Schema: `User.faceModelVersion` + `User.faceMetadata` (audit)
- 3 endpoint baru: `GET /auth/me/face-profile`, `PUT /auth/me/face-profile`, `DELETE /auth/me/face-profile`
- Update 2 endpoint existing: enroll tolak duplicate (409), login return confidence + standardized error codes

## Answers untuk 20 technical questions

### A. ML library + model

**Q1 (library)**: BE pakai **face-api.js compatible** — 128-dim FaceNet-style descriptor. Mobile bebas pilih library yang **produce 128-dim Float32 descriptor compatible dengan face-api.js**. Rekomendasi: `@react-native-ml-kit/face-detection` (detection) + custom embedding via TF Lite MobileFaceNet (kalau perlu RN). Atau **pakai face-api.js langsung** via React Native WebView (less optimal tapi works).

> ⚠ **Important**: kalau mobile pilih library yang produce embedding **berbeda dari face-api.js space**, server tidak bisa match. Kami **rekomendasi kuat**: stick dengan face-api.js style atau library yang explicitly trained dengan FaceNet weights yang sama.

**Q2 (dim)**: **128** (existing, fixed).

**Q3 (distance)**: **Euclidean** (existing implementation).

**Q4 (threshold)**: **0.5** default (env override `FACE_MATCH_THRESHOLD`). Lebih rendah = strict. Kalau mobile feedback false-reject sering, naik ke 0.55-0.6. Kalau false-accept (mis. saudara mirip), turun ke 0.45.

### B. Storage + privacy

**Q5 (schema)**: **Single profile per user** (existing constraint). Re-enrollment replace via PUT. Multiple profile per jemaat (mis. dengan/tanpa kacamata) defer — kalau ada concrete request baru evaluate.

**Q6 (storage format)**: **Postgres Json column** existing. pgvector defer — linear scan cukup untuk N < 50k jemaat. Switch ke pgvector kalau jemaat > 50k atau smart system go-live.

**Q7 (encryption at rest)**: **Volume-level cukup MVP**. Column-level encryption (pgcrypto) di-add kalau audit Kominfo request. PDP Law tidak mandate column encryption — yang penting transit (HTTPS) + access control + audit log. Compliance verify dengan legal team.

**Q8 (retention)**:
- ✅ DELETE endpoint `/auth/me/face-profile` untuk PDP right-to-delete
- ❌ Auto-purge kalau jemaat archive: defer. Manual via admin tool kalau perlu.

### C. Liveness detection

**Q9 (liveness)**: **Opsi C — no server liveness** untuk MVP. Mobile responsibility untuk client-side challenge (blink, head turn) sebelum compute descriptor.

Reasoning: server-side liveness butuh kirim multiple frames (heavy bandwidth + storage), plus model anti-spoofing complex. Risk-acceptable untuk MVP karena:
- OTP fallback tetap available untuk action sensitive
- Face login = "convenience" only, bukan single factor untuk payment/sensitive ops

Mobile recommendation:
- Implement passive liveness check (motion vector di frames)
- Atau active challenge (blink detect 1x sebelum capture)
- Reject foto cetak via face-api.js detection score threshold

**Q10 (twin/family false positive)**: tingkatkan threshold default ke **0.45** kalau pilot data tunjukin false-positive frequent di keluarga. Sekarang 0.5 — adjust per env. Plus **secondary check**: `/auth/face/login` butuh `noHp` hint, jadi cuma compare descriptor user dengan stored milik noHp itu — tidak global search. False-positive antar saudara harus mereka **explicit pakai noHp masing-masing** dulu, jadi safety check natural.

### D. Smart system integration

**Q11 (smart system endpoint)**: **defer** sampai go-live. Saat siap, design:
```
POST /api/v1/identify
X-API-Key: ecc_smart_xxx
Body: { descriptor: [128 float], cabangId?: 'uuid' }
Response: { jemaatId, confidence } atau 404 NO_MATCH
```

Pakai **API key terpisah** (scope `read:identify`) — kiosk/IoT device pakai key dedicated, bukan user JWT. Kalau perlu volunteer scanner mode, bisa dual-auth (API key + volunteer JWT).

**Q12 (bulk batch)**: defer. Saat smart system aktif:
```
POST /api/v1/identify-batch
Body: { descriptors: [[128 float], ...], cabangId? }
Response: { results: [{ descriptor_idx, jemaatId, confidence }] }
```

Max 50 descriptor per request, throttle 60/menit/API key.

**Q13 (audit trail)**: defer schema. Saat smart system aktif, add table:
```
FaceIdentificationLog {
  id, jemaatId (FK), source (varchar — 'lobby_cam_1', 'event_kiosk_a'),
  confidence, identifiedAt, eventContextId? (FK Event/Ibadah optional)
}
```

Retention 90 hari (purge cron).

### E. Error handling + edge cases

**Q14 (duplicate enrollment)**: BE **tidak block** enrollment kalau descriptor cocok > 0.85 dengan jemaat lain — karena ini bisa false-positive saudara kembar legit. Sebagai gantinya, **flag warning di audit log** (`metadata.duplicateRiskWith: <jemaatId>`). Admin tools nanti bisa surface flag ini.

**Q15 (re-enrollment)**: ✅ Implemented — **PUT /auth/me/face-profile** eksplisit replace existing. POST tolak duplicate (force PUT untuk update).

**Q16 (error code naming)**: ✅ Implemented. Codes:
- `FACE_NOT_ENROLLED` (401) — login attempt tapi belum enroll
- `FACE_NO_MATCH` (401) — descriptor tidak cocok
- `FACE_MODEL_MISMATCH` (409) — modelVersion client vs stored beda
- `FACE_INVALID_DESCRIPTOR` (422) — bukan 128-dim atau NaN
- `FACE_ALREADY_ENROLLED` (409) — POST enroll padahal sudah ada (pakai PUT)
- `FACE_LOGIN_RATE_LIMIT` (429) — via existing `authVerifyLimiter`

### F. Performance + rate limiting

**Q17 (search perf)**: **Linear scan** for now. Saat ini login flow pakai `noHp` hint → cuma 1 descriptor compare, O(1). Untuk smart system (`/identify` tanpa hint), saat aktif baru migrate ke pgvector. N < 10k cuma butuh ~50ms scan, acceptable.

**Q18 (rate limit)**: ✅ Pakai existing **`authVerifyLimiter`** (10 attempt / 15 menit / IP). Per-phone limit defer.

### G. PDP Law compliance

**Q19 (consent flow)**: BE store `consentVersion` di `User.faceMetadata` saat enroll. Mobile harus include di body:
```json
"metadata": {
  "consentVersion": "v1-2026-05-21",
  "platform": "ios",
  ...
}
```

Audit log catat consent timestamp via `faceEnrolledAt`. Kalau kominfo audit, BE bisa export semua user yang enroll + consent version + timestamp.

**Q20 (DPA Kominfo)**: **Out of BE scope** — legal/ops responsibility. BE provide tooling untuk export consent log (kalau diperlukan), tapi DPA filing + Kominfo registration di luar engineering. Recommend trigger compliance check **sebelum** mobile push face feature ke production.

## Endpoint spec final

Sesuai request mobile, dengan minor refinement:

### 1. `GET /auth/me/face-profile` (NEW)

```
GET /auth/me/face-profile
Authorization: Bearer <JWT>

→ 200 { enrolled, enrolledAt, modelVersion }
→ Untuk yang belum enroll: { enrolled: false, enrolledAt: null, modelVersion: null }
```

### 2. `POST /auth/face/enroll` (UPDATED)

```
POST /auth/face/enroll
Body: { descriptor, modelVersion?, metadata? }

→ 201 { faceEnrolledAt, modelVersion, hasFaceEnrolled }
→ 409 FACE_ALREADY_ENROLLED (pakai PUT untuk re-enroll)
→ 422 FACE_INVALID_DESCRIPTOR
```

### 3. `PUT /auth/me/face-profile` (NEW)

```
PUT /auth/me/face-profile
Body: sama dengan POST enroll

→ 200 { faceEnrolledAt, modelVersion, hasFaceEnrolled }
→ 422 FACE_INVALID_DESCRIPTOR
```

### 4. `DELETE /auth/me/face-profile` (NEW)

```
DELETE /auth/me/face-profile

→ 200 { hasFaceEnrolled: false }
```

Legacy `POST /auth/face/reset` masih jalan (alias).

### 5. `POST /auth/face/login` (UPDATED)

```
POST /auth/face/login
Body: { noHp, descriptor, modelVersion? }

→ 200 { accessToken, refreshToken, expiresIn, user, confidence: 0.82 }
→ 401 FACE_NOT_ENROLLED
→ 401 FACE_NO_MATCH { details: { distance, threshold } }
→ 409 FACE_MODEL_MISMATCH
→ 422 FACE_INVALID_DESCRIPTOR
→ 429 FACE_LOGIN_RATE_LIMIT
```

`confidence` = `Math.max(0, Math.min(1, 1 - distance / threshold))`. Higher = better match.

## Recommendation untuk mobile flow

1. **Enrollment**:
   ```typescript
   // Check status first
   const status = await api.get('/auth/me/face-profile');
   if (!status.data.enrolled) {
     // Show consent screen → user accept
     // Capture face + compute descriptor (face-api.js)
     await api.post('/auth/face/enroll', {
       descriptor,
       modelVersion: 'facenet-v1',
       metadata: {
         platform: 'ios',
         deviceModel: 'iPhone 15 Pro',
         appVersion: '0.1.0',
         consentVersion: 'v1-2026-05-21',
       },
     });
   } else {
     // Already enrolled — show "Update wajah" button kalau user mau replace
     // → PUT /auth/me/face-profile
   }
   ```

2. **Login**:
   ```typescript
   try {
     const res = await api.post('/auth/face/login', { noHp, descriptor });
     if (res.data.confidence < 0.7) {
       toast.warn('Login berhasil, tapi confidence rendah — pertimbangkan re-enroll.');
     }
     // Save tokens, navigate
   } catch (err) {
     if (err.code === 'FACE_NO_MATCH') {
       // After 3x fail, prompt re-enroll
     } else if (err.code === 'FACE_MODEL_MISMATCH') {
       // Force re-enroll dengan modelVersion baru
     } else {
       // Fallback OTP login
     }
   }
   ```

3. **PDP compliance**:
   - Privacy policy update dengan section "Data Biometrik" — wajib sebelum production
   - Settings → Privacy → "Hapus Data Wajah" button → `DELETE /auth/me/face-profile`
   - Track consent version saat enroll

## File yang berubah BE

| File | Perubahan |
|---|---|
| `packages/database/prisma/schema.prisma` | User extension: `faceModelVersion`, `faceMetadata` |
| `packages/database/prisma/migrations/20260521170000_face_metadata/migration.sql` | NEW — add 2 column |
| `packages/shared-types/src/schemas/auth.ts` | faceLoginSchema + faceEnrollmentSchema extended |
| `apps/core-api/src/routes/auth.ts` | 3 endpoint baru + update 3 existing + helper `resetFaceProfile` |
| `apps/core-api/src/openapi.ts` | Tag "Auth · Face Recognition" + 6 path |
| `docs/mobile-api-guide.md` | Section 1.4 expanded (5 subsection) |
| `knowledge-base.md` | Section 26 patch **2026-05-21q** |

## User perlu run di local

```bash
pnpm db:generate                          # Prisma client recognize faceModelVersion + faceMetadata
pnpm --filter @ecc/database db:migrate dev  # apply migration
```

## Action items untuk mobile team

- [ ] Choose face-api.js compatible library (mis. `@vladmandic/face-api` di RN via worker)
- [ ] Implement consent screen + persist `consentVersion`
- [ ] Replace existing biometric-unlock (M11.1-7) ke real face flow
- [ ] Settings → Privacy → "Hapus Data Wajah" button
- [ ] Handle error codes per spec di section "Endpoint spec final" di atas
- [ ] Test threshold di pilot — feedback ke BE kalau perlu adjust default

## Action items untuk legal/product

- [ ] **CRITICAL**: Privacy Policy update dengan section "Data Biometrik" sebelum production
- [ ] **CRITICAL**: DPA Kominfo registration (UU 27/2022 Pasal 4 untuk data biometrik)
- [ ] DPIA (Data Protection Impact Assessment) document untuk audit trail
- [ ] Operations training: handle complaint "saya tidak mau wajah disimpan"

---

*Ticket closed 2026-05-21. Smart system endpoint design defer sampai go-live.*
