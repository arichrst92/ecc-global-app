# Backend Meeting Brief — ECC Mobile App

**Tujuan**: align spec API yang dibutuhkan mobile app, decide endpoint baru, dapat ETA.

**Tanggal target**: TBD (segera)
**Atendees**: Ari Christian (mobile), [BE team IDEA], [Product owner ECC]
**Durasi estimasi**: 60-90 menit

**Pre-read untuk atendees**: [`docs/api-gap-analysis.md`](./api-gap-analysis.md)

---

## Agenda (5 topik utama)

### 1. Self-registration policy — **DECISION NEEDED** ⚡

**Mobile preference**: **self-register + auto-active**.

Jemaat baru bisa daftar via mobile, submit data → akun langsung aktif tanpa admin approval.

**Endpoint yang dibutuhkan:**
```
POST /auth/register
Body: {
  noHp: '+62...',
  otpKode: '123456',          // OTP yang sudah verified dengan purpose=ENROLLMENT
  namaLengkap: 'Ari Christian',
  tanggalLahir: '1992-05-15',  // ISO date
  gender: 'MALE' | 'FEMALE',
  alamat: 'Jl. Sudirman ...',
  cabangId: 'uuid',
  homecellId: 'uuid' | null,
  fotoBase64?: string          // optional — upload at register, atau later
}
Response 201: { user: User, accessToken, refreshToken }
```

**Anti-abuse considerations untuk BE**:
- Rate limit per IP (sudah ada 3/5min utk OTP request)
- Rate limit per nomor HP (1 register per HP)
- Cabang admin notification: "Jemaat baru terdaftar: <nama>" (transparency)
- Audit log siapa register kapan (already di standard practice?)
- Optional: flag `isVerified=false` untuk show "Belum diverifikasi cabang" badge di profile sampai admin verify (soft-approval pattern)

**Questions to confirm**:
- [ ] Apakah BE mau bikin endpoint `POST /auth/register`? Ada concern?
- [ ] Apakah anti-abuse pattern di atas cukup, atau perlu CAPTCHA/email verify tambahan?
- [ ] Auto-active 100% atau soft-verify dulu (mark `isPending=true`, admin acknowledge tapi tidak block usage)?

---

### 2. Family Management — **LARGEST GAP** ⚡

Mobile butuh full CRUD untuk family relationships. **Tidak ada endpoint sama sekali saat ini.**

**Data model proposed**:

```typescript
// New table
FamilyRelation {
  id: uuid
  jemaatA_id: uuid    // current user
  jemaatB_id: uuid    // family member
  role: 'spouse' | 'child' | 'parent' | 'sibling'
  isVerified: boolean  // jemaatB confirmed link, atau false untuk auto-linked child
  createdAt: timestamp
  createdBy: uuid     // siapa yang link (untuk audit)
}

// Extension untuk Jemaat
Jemaat {
  ...
  noHp: nullable      // anak balita tanpa HP, hanya accessible via parent
  primaryGuardianId: uuid nullable   // siapa yang manage account ini kalau no HP
  registeredViaJemaat: uuid nullable // self-onboarding via aplikasi parent
}
```

**Endpoints yang dibutuhkan**:

| Method | Path | Body / Response | Purpose |
|---|---|---|---|
| GET | `/admin/jemaat/me/family` | → `FamilyMember[]` (with jemaat info + role) | List family |
| POST | `/admin/jemaat/me/family/link-by-kode` | `{ kode, role }` → `FamilyMember` | Link via scan QR — jemaatB terima notif WA untuk confirm |
| POST | `/admin/jemaat/me/family/link-by-phone` | `{ noHp, role }` → `FamilyMember` | Link via phone search — sama, jemaatB confirm |
| POST | `/admin/jemaat/me/family/register-new` | Form data jemaat + `role` + `noPhone:boolean` → `{ jemaat, family }` | Register anak/balita (atau dewasa tanpa akun) + auto-link |
| DELETE | `/admin/jemaat/me/family/:jemaatId` | → 204 | Unlink |
| PATCH | `/admin/jemaat/me/family/:jemaatId` | `{ role }` → updated | Update role (mis. cerai → unlink, anak adopted, dll) |

**Confirmation flow** (untuk link existing jemaat):
- A link B as "spouse" → B terima WA notif "Ari Christian ingin link Anda sebagai suami/istri di ECC app. Confirm? [link]"
- B accept → `isVerified=true`. B reject → relation deleted.
- Anak balita yang di-register via "register-new" → `isVerified=true` otomatis (parent yang create).

**Questions**:
- [ ] OK dengan data model di atas?
- [ ] OK dengan two-way confirmation untuk link existing (cegah false claim)?
- [ ] Nullable `noHp` untuk anak — ada concern dengan existing schema constraint?
- [ ] ETA untuk implementation?

**Priority**: HIGH. M5 blocked tanpa ini.

---

### 3. Batch family registration untuk event/ibadah

Saat user daftar event, mockup bisa pilih multiple anggota keluarga sekaligus. Endpoint `POST /admin/event/:id/peserta` saat ini cuma terima single `jemaatId`.

**Proposed endpoint**:

```
POST /admin/event/:eventId/peserta/batch
Body: {
  jemaatIds: ['uuid1', 'uuid2', ...],
  catatan?: string,
  nominalBayarPerOrang?: number    // optional, untuk event paid
}
Response 201: {
  successful: [Participation, ...],
  failed: [{ jemaatId, error: { code, message } }, ...]
}
```

Validation server-side: quota check sebelum loop, transaksi atomic per peserta.

**Atau alternative**: extend existing endpoint untuk accept `jemaatIds: string[]` (backward compat dengan single-element array).

**Sama untuk reservasi ibadah** kalau ada batch reserve.

**Questions**:
- [ ] Preferensi: endpoint baru `/batch` atau extend existing accept array?
- [ ] Transactional behavior: all-or-nothing, atau partial success allowed?

---

### 4. Scanner-related endpoints

#### 4.1 List scannable events/ibadah

Reference doc Section 8 mention `GET /admin/me/scanner-events` belum di-build. Mobile butuh ini untuk show daftar event/ibadah yang user-nya authorized scan.

**Proposed**:
```
GET /admin/me/scanner-events
→ [{
  eventId, judul, tanggalMulai, lokasi,
  pelayananName, role: 'leader'|'co-leader'|'member'
}]

GET /admin/me/scanner-ibadah
→ similar
```

Workaround mobile saat ini: tombol Scan muncul di Ibadah/Event detail, kalau user click dan 403 → friendly error. UX kurang clean tapi works.

**Question**: 
- [ ] Bisa add endpoint ini, atau pakai workaround dulu?
- [ ] Kalau pakai workaround, error message 403 sudah informatif (mention "Hubungi admin untuk minta akses")?

#### 4.2 Live attendance count

Mockup scanner show "523 sudah check-in". 

**Proposed**:
```
GET /admin/ibadah/:id/checkin/stats?tanggalIbadah=2026-05-19
→ { total, byCategory: {...}, lastUpdated }

GET /admin/event/:id/checkin/stats
→ { total, byStatus: {...}, lastUpdated }
```

Mobile poll setiap 10-15s saat scanner mode active.

**Question**: 
- [ ] Endpoint count perlu? Atau realtime via WebSocket?
- [ ] Polling rate limit (current 100/min/user cukup untuk poll 15s = 4/min, aman)

---

### 5. Homecell endpoints — confirmation

API guide silent tentang homecell. Mungkin sudah ada di Swagger tapi tidak di-document.

**Endpoint yang mobile expect**:

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/homecell/:id` | Detail + member list |
| GET | `/admin/homecell-area/:id/homecells` | All HC di area |
| POST | `/admin/homecell/:id/members` body `{kode}` | Add member via QR |
| DELETE | `/admin/homecell/:id/members/:jemaatId` | Remove |
| GET | `/admin/me/homecell-managed` | HC yang user-nya PIC |
| GET | `/admin/me/homecell-area-managed` | Area yang user-nya PIC Area |

**Action**: BE team show `/docs` (Swagger UI) untuk konfirmasi spek aktual.

---

### 6. Cross-cutting concerns

#### 6.1 Push notifications (M6)
Reference doc Section 11: infrastructure belum ada. **OK untuk skip M6 push notif sampai infra ready** — mobile pakai local notification dulu.

ETA target untuk push notif backend?

#### 6.2 Profile edit + foto upload (M6)
Mobile butuh:
- `PATCH /admin/jemaat/me` body `{ alamat?, fotoBase64? }` — self-edit limited fields
- Atau `POST /admin/jemaat/me/foto` multipart untuk foto saja

Apakah existing `PATCH /admin/jemaat/:id` work untuk self-edit (RBAC allow jemaat edit dirinya)?

#### 6.3 Branch change request (M6)
**Proposed**:
```
POST /admin/jemaat/me/branch-change-request
Body: { targetCabangId, reason?: string }
Response: { id, status: 'PENDING', createdAt }
```

Admin notify, approve di portal. Mobile poll status atau show "Pending" sampai update.

#### 6.4 Face enrollment (M11, opsional)
`POST /auth/face/enroll` body `{ descriptor: number[128] }` — perlu sudah authenticated. Buat di phase 2 setelah M11.

#### 6.5 Bilingual content
**Decision mobile**: UI translated ID/EN, **konten news/renungan tetap Indonesia**. Tidak perlu BE work. Confirm OK?

#### 6.6 Streak hadir
Hitung di mobile dari `GET /admin/reservasi?jemaatId=me&status=JOIN&order=desc&limit=50`, atau BE bikin `GET /admin/jemaat/me/stats { streakWeeks, attendedThisYear, eventsJoined }`?

Preferensi BE? (Stats endpoint preferred — single source of truth, less load di reservasi list).

---

## Tabel decisions summary

| Item | Mobile prefers | Need BE confirm |
|---|---|---|
| Self-registration | Auto-active dengan anti-abuse | ☐ |
| Family endpoints | Full CRUD + 2-way confirm | ☐ |
| Family data model | New `FamilyRelation` table + `Jemaat.noHp` nullable | ☐ |
| Batch event registration | New `/batch` endpoint, partial success | ☐ |
| Scanner-events list | Add endpoint OR workaround OK | ☐ |
| Live attendance count | Polling endpoint OR realtime? | ☐ |
| Homecell endpoints | Klarifikasi dari Swagger | ☐ |
| Push notif backend | OK skip sampai ready | ☐ ETA? |
| Profile self-edit | `PATCH /admin/jemaat/me` atau extend `:id` | ☐ |
| Branch change request | Add endpoint dengan pending status | ☐ |
| Bilingual content | Mobile-side UI only, konten Indonesia | ☐ |
| Streak stats | Stats endpoint preferred | ☐ |

---

## ETA / timeline ask

Mobile dev plan estimasi 13-14 minggu. Backend dependency:

| Phase | BE work | Deadline if mobile mau on track |
|---|---|---|
| M1 (week 1-2) | `POST /auth/register` | Week 2 |
| M2 (week 3) | Streak stats (nice-to-have) | Week 4 (atau skip) |
| M3 (week 4-5) | Batch event registration | Week 5 |
| M4 (week 6) | — | — |
| **M5 (week 7-8)** | **Family endpoints full** | **Week 6** ⚡ |
| M6 (week 9) | Branch change, profile self-edit | Week 8 |
| M7 (week 10) | Scanner-events list, count stats | Week 9 |
| M9 (week 11-12) | Homecell endpoint confirmations | Week 10 |
| M6+ | Push notif infrastructure | Week 11-12 (atau v2) |

---

## Decisions log (kosong, isi saat / setelah meeting)

| Topic | Decision | Owner | ETA |
|---|---|---|---|
| | | | |
| | | | |

(Update setelah meeting selesai)
