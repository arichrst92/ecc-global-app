# Backend Request: Face Recognition (Login + Smart System Future Use)

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-21
**Priority**: 🟡 **MEDIUM** — feature M11 (was opsional, sekarang in-scope karena smart system planning)
**Status**: 🆕 **PROPOSED** — menunggu BE evaluasi + answer technical questions

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
