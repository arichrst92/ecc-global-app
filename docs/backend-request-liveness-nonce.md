# Backend Handoff: Liveness Server-Side Gate (HMAC Signed Nonce)

**Untuk**: Mobile dev (Ari Christian)
**Dari**: Tim Backend ECC
**Tanggal**: 2026-05-22
**Priority**: 🟡 **MEDIUM** — security hardening, M3 roadmap item
**Status**: ✅ **READY** (V1 soft launch — nonce OPTIONAL, log warn kalau missing)

## Konteks

Liveness detection saat ini purely client-side (blink + head turn challenges
di `useLivenessChallenge`). Tanpa server-side gate, attacker yang punya face
descriptor stolen (mis. extract dari foto social media via model lokal) bisa
langsung POST `/auth/face/login` tanpa pernah ada human-presence verification.

Backend sekarang issue **HMAC signed nonce** dengan TTL 3 menit + one-shot
consume. Mobile harus:

1. Request nonce **sebelum** show liveness UI
2. Submit nonce **bersama descriptor** saat /face/login or /face/enroll

## Endpoint baru

### Issue nonce

```http
POST /auth/face/liveness-nonce
Content-Type: application/json
(no auth)

{
  "noHp": "+6281234567890",
  "purpose": "LOGIN"          // atau "ENROLL"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "nonce": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2026-05-22T10:03:00Z",
    "ttlSeconds": 180
  }
}
```

Token = opaque JWT-style (HMAC signed). Mobile **tidak perlu parse** — simpan
string apa adanya dan kirim balik di body request berikutnya.

### Submit di /face/login atau /face/enroll

Tambah field `livenessNonce` di body:

```http
POST /auth/face/login
{
  "noHp": "+6281234567890",
  "descriptor": [0.123, ...],
  "modelVersion": "mobilefacenet-v1",
  "livenessNonce": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

```http
POST /auth/face/enroll
Authorization: Bearer <token>
{
  "descriptor": [...],
  "modelVersion": "mobilefacenet-v1",
  "metadata": { ... },
  "livenessNonce": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Server verification

Backend `consumeLivenessNonce()` verify:

1. **Signature valid** (HMAC dengan `LIVENESS_NONCE_SECRET` / fallback `JWT_SECRET`)
2. **TTL belum lewat** (3 menit)
3. **Purpose match** (kalau request `purpose: 'LOGIN'`, harus dipakai di /face/login)
4. **noHp bind** (kalau di-issue untuk +62XYZ, harus dipakai dengan noHp itu)
5. **One-shot**: belum pernah di-consume (in-memory Set dengan TTL eviction)

## Error codes

Saat invalid, `/face/login` atau `/face/enroll` throw **401** dengan code:

| Code | Arti | UX hint |
|---|---|---|
| `LIVENESS_NONCE_INVALID` | Signature salah / malformed | Mulai ulang flow dari awal |
| `LIVENESS_NONCE_EXPIRED` | TTL 3 menit lewat | Request nonce baru, ulangi liveness |
| `LIVENESS_NONCE_PURPOSE_MISMATCH` | Nonce ENROLL dipakai di LOGIN (atau sebaliknya) | Bug client — request nonce dengan purpose yang benar |
| `LIVENESS_NONCE_BIND_MISMATCH` | noHp di nonce ≠ noHp di body | Bug client |
| `LIVENESS_NONCE_REUSED` | JTI sudah pernah di-consume di server | Request nonce baru, jangan retry pakai nonce lama |

## V1 backward compat — opsional

**Untuk smooth migration**, V1 (2026-05-22 — 2026-06-01):
- `livenessNonce` di body OPTIONAL
- Kalau ada → di-verify, error 401 kalau invalid
- Kalau tidak ada → bypass verify, log `WARN [liveness] face/* tanpa nonce — V1 grace, akan ke-enforce V2.`

**V2 (target 2026-06-01)**: backend flip ke required — endpoint reject kalau
nonce absent. Mobile dev punya 10 hari untuk implement.

Tracking V2 cutover: kasih tau saya kalau mobile sudah ready di-enforce.

## Mobile suggested flow

```typescript
async function startFaceLogin(noHp: string) {
  // 1. Request nonce
  const { data: nonceRes } = await api.post('/auth/face/liveness-nonce', {
    noHp,
    purpose: 'LOGIN',
  });
  const { nonce, expiresAt } = nonceRes.data;
  // expiresAt: ISO date string. Pakai untuk show countdown di UI kalau perlu.

  // 2. Show liveness UI — blink + head turn challenges
  await runLivenessChallenges();  // existing useLivenessChallenge hook

  // 3. Capture descriptor via MobileFaceNet
  const descriptor = await captureFaceDescriptor();

  // 4. Submit dengan nonce
  const { data: loginRes } = await api.post('/auth/face/login', {
    noHp,
    descriptor,
    modelVersion: 'mobilefacenet-v1',
    livenessNonce: nonce,
  });
  return loginRes;
}
```

**Important UX considerations:**

- **TTL 3 menit** — kalau user butuh waktu lebih lama (mis. handle permission
  prompt, switch kamera depan/belakang, dst), nonce bisa expire mid-flow.
  UI hint: tampilkan countdown atau retry button kalau nonce expired.

- **One-shot enforcement** — kalau request gagal karena network error
  setelah server sudah consume nonce (rare, biasanya verify dulu baru proses),
  request nonce baru. Jangan retry pakai nonce lama (akan get
  `LIVENESS_NONCE_REUSED`).

- **Cancel/back behavior** — kalau user back keluar dari liveness UI sebelum
  submit, nonce TIDAK perlu di-cancel manually. Server natural expire after
  3 menit, atau langsung consumed saat user retry dengan nonce baru.

## Schema impact — NONE

Stateless di backend (HMAC + in-memory consumed set). Tidak ada migration
baru. Multi-pod scale note di backend doc — kalau scale >1 pod, perlu Redis
SETNX untuk distributed one-shot enforcement. Untuk single instance MVP, OK.

## Action items mobile

- [ ] `src/api/face.ts` — `requestLivenessNonce({ noHp, purpose })` helper
- [ ] Update `requestFaceLogin` dan `enrollFace` untuk include `livenessNonce`
- [ ] UI hint kalau error 401 dengan code LIVENESS_NONCE_EXPIRED: "Sesi
      verifikasi kedaluwarsa, mulai ulang"
- [ ] UI hint kalau LIVENESS_NONCE_REUSED: "Sesi sudah dipakai, mulai ulang"
- [ ] (opsional) countdown timer 3 menit di liveness UI

## Test cases yang patut di-coba

1. Happy path: request nonce → liveness → login dengan nonce → 200
2. Tanpa nonce (V1 grace): login → 200 + log warn server
3. Nonce kadaluarsa (tunggu >3 menit): login → 401 LIVENESS_NONCE_EXPIRED
4. Nonce dipakai 2× berturut: kedua kali → 401 LIVENESS_NONCE_REUSED
5. Mismatched purpose: request ENROLL nonce, submit di /face/login → 401 LIVENESS_NONCE_PURPOSE_MISMATCH
6. Mismatched noHp: request untuk +62A, submit body noHp +62B → 401 LIVENESS_NONCE_BIND_MISMATCH

---

Backend ready. Mobile bisa migrate kapan aja sebelum V2 cutover (2026-06-01).
Tanya kalau ada edge case yang belum ke-cover.
