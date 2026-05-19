# API Gap Analysis

Audit kebutuhan mobile app (dari mockup) vs dokumentasi backend di [`reference/mobile-api-guide.md`](../reference/mobile-api-guide.md). Per **2026-05-19**.

**Legend:**
- 🟢 **Ready** — endpoint documented, bisa langsung integrate
- 🟡 **Partial** — sebagian ada, butuh tambahan / klarifikasi  
- 🔴 **Missing** — belum ada endpoint, butuh backend work
- ⚪ **Tidak perlu API** — fitur client-only

---

## Status per milestone

### M1 — Auth Flow

| Fitur | Endpoint | Status |
|---|---|---|
| Request OTP | `POST /auth/otp/request` | 🟢 |
| Verify OTP | `POST /auth/otp/verify` | 🟢 |
| Refresh access token | `POST /auth/refresh` | 🟢 |
| Logout | `POST /auth/logout` | 🟢 |
| Re-fetch menuAccess | `GET /auth/me/access` | 🟢 |
| **Self-registration (sign-up form)** | ⚠ Tidak documented | 🔴 |

**Gap detail — Self-registration:**

Mockup punya sign-up flow 3 langkah: phone → OTP (purpose=ENROLLMENT) → form data diri (nama, tgl lahir, gender, alamat, cabang, homecell, foto).

OTP dengan `purpose=ENROLLMENT` documented, tapi endpoint **submit data setelah OTP verified untuk create jemaat baru** tidak ada. Reference doc Section 18 confirm ini sebagai "open question: Apakah jemaat baru bisa self-register dari mobile atau harus diadd admin?".

**Workaround M1**:
- Skip sign-up implementation di M1
- Tampilkan UI sign-up tapi submit-nya alert "Hubungi admin cabang untuk register"
- Atau: minimal endpoint `POST /auth/register` yang trigger pending-approval state

**Action**: konfirmasi ke backend team — `POST /auth/register` atau `POST /admin/jemaat/self-onboard`?

---

### M2 — Home + Ibadah + QR Card

| Fitur | Endpoint | Status |
|---|---|---|
| Calendar ibadah | `GET /admin/ibadah/calendar` | 🟢 |
| Ibadah list | `GET /admin/ibadah` | 🟢 |
| Detail ibadah | `GET /admin/ibadah/:id` | 🟢 |
| QR jemaat (self) | dari `user.kode` di auth response | ⚪ Client-only |
| Lookup jemaat by kode | `GET /admin/jemaat/by-kode/{kode}` | 🟢 |
| **Streak hadir (4 minggu)** | ⚠ Tidak documented | 🔴 |
| **Quick stats home (event/news count)** | Hitung dari list endpoints | 🟢 (turunan) |
| Today's ibadah | Filter calendar by today | 🟢 |

**Gap detail — Streak attendance:**

Mockup home tampil "🔥 4 minggu berturut-turut hadir". Tidak ada endpoint untuk summary stats per user.

**Workaround**:
- Reference doc Section 4 (V1.2) sebut: "Streak attendance / leaderboard — Hitung dari Reservasi.status=JOIN"
- Bisa: `GET /admin/reservasi?jemaatId=me&status=JOIN&order=desc&limit=50` lalu hitung consecutive weeks client-side
- Atau: backend bikin `GET /admin/jemaat/me/stats` (preferred)

**Action**: Phase 2 fitur. Untuk M2, hide streak banner atau show placeholder.

---

### M3 — Event + Payment

| Fitur | Endpoint | Status |
|---|---|---|
| Event list | `GET /admin/event` | 🟢 |
| Event detail | `GET /admin/event/:idOrSlug` | 🟢 |
| Daftar single | `POST /admin/event/:eventId/peserta` | 🟢 |
| Upload bukti transfer | `POST .../peserta/:id/bukti` (multipart) | 🟢 |
| Check-in event | `POST /admin/event/:id/checkin` | 🟢 |
| **Daftar batch untuk family** | ⚠ Endpoint cuma accept single `jemaatId` | 🔴 |

**Gap detail — Batch family registration:**

Mockup event-daftar tampil checkbox per anggota keluarga + total fee dihitung otomatis. Endpoint `POST /admin/event/:eventId/peserta` hanya accept satu `jemaatId` per request.

**Workaround opsi**:

A) **Client loop**: panggil endpoint berkali-kali untuk tiap anggota. Trade-off: race condition kalau quota mau penuh, partial failure handling complex.

```typescript
// pseudo: 
for (const memberId of selectedFamily) {
  await api.post('/admin/event/:id/peserta', { jemaatId: memberId });
}
```

B) **Backend buat endpoint baru**:
```
POST /admin/event/:eventId/peserta/batch
Body: { jemaatIds: ['uuid1', 'uuid2', ...], catatan: '...' }
Response: { successful: [...], failed: [...] }
```

**Action**: rekomendasi B. Sementara M3 pakai opsi A dengan UX yang handle partial failure.

---

### M4 — News + Renungan + Persembahan

| Fitur | Endpoint | Status |
|---|---|---|
| News list (filter audience) | `GET /admin/news?isPublished=true` | 🟢 |
| News detail | `GET /admin/news/:idOrSlug` | 🟢 |
| Renungan list & detail | `GET /admin/renungan/*` | 🟢 |
| Rekening per cabang | `GET /admin/cabang/:id/rekening` | 🟢 |
| **Bookmark renungan (server-side)** | ⚠ Tidak documented | 🔴 (low priority) |
| **Bilingual content (id/en)** | News/renungan field cuma 1 bahasa | 🟡 |

**Gap detail — Bilingual content:**

App UI bilingual, tapi konten news/renungan dari backend cuma punya 1 set field (`judul`, `ringkasan`, `konten`) — kemungkinan Indonesia.

**Opsi**:
- ✅ App UI bilingual, **konten tetap Indonesia** (paling realistic untuk gereja lokal)
- Atau: backend tambah field `judulEn`, `kontenEn` (overhead admin)
- Atau: AI translation on-the-fly (cost + accuracy issue)

**Action**: Default ke opsi 1 — UI translated, content stays in Bahasa Indonesia. Catatkan di README.

**Gap detail — Bookmark:**

Mockup punya tombol bookmark di renungan/news detail. Server-side bookmark not in scope.

**Workaround**: Bookmark local (AsyncStorage). Cukup untuk MVP.

---

### M5 — Family Management 🔴 LARGEST GAP

**Tidak ada endpoint family relationship di API guide.** Semua perlu dibuat.

| Endpoint yang dibutuhkan | Method | Purpose |
|---|---|---|
| `GET /admin/jemaat/me/family` | GET | List anggota keluarga current user |
| `POST /admin/jemaat/me/family/link-by-kode` | POST | Link existing jemaat (dari scan QR) |
| `POST /admin/jemaat/me/family/link-by-phone` | POST | Link existing jemaat (search by HP) |
| `POST /admin/jemaat/me/family/register-new` | POST | Register new jemaat + auto-link as family (incl. anak tanpa HP) |
| `DELETE /admin/jemaat/me/family/:jemaatId` | DELETE | Unlink anggota |
| `PATCH /admin/jemaat/me/family/:jemaatId` | PATCH | Update role (suami→cerai, dll) |

**Data model yang perlu BE**:
```
FamilyRelation {
  jemaatA_id: UUID
  jemaatB_id: UUID  
  role: enum('spouse', 'child', 'parent', 'sibling')
  isVerified: boolean  // both parties confirmed
  createdAt: timestamp
}

Jemaat extension:
- noHp: nullable (untuk anak tanpa HP, hanya linked via parent's account)
- linkedByJemaatId: UUID (siapa yang register dia)
```

**Action**: paling penting untuk produktivitas mobile app. Schedule meeting dengan backend team. Tanpa ini, fitur family selector di event/ibadah tidak bisa dipakai.

**Workaround sementara**: family list di-mock dari client (hardcoded saat dev). Tidak ada persistence cross-device.

---

### M6 — Notifications + Settings + Change Branch

| Fitur | Endpoint | Status |
|---|---|---|
| **Push notification infrastructure** | Belum ada (per reference doc Section 11) | 🔴 |
| **Device token registration** | Belum ada | 🔴 |
| **Notification list (in-app inbox)** | Belum ada | 🔴 |
| **Branch change request** | Belum ada | 🔴 |
| Settings (lang, dark, notif prefs) | Local only | ⚪ |
| Logout | `POST /auth/logout` | 🟢 |

**Gap detail — Push notifications:**

Reference doc Section 11 confirm: "Backend status: notification system belum di-build. App harus implement Firebase Cloud Messaging (FCM) / Apple Push Notification (APNS) sendiri dan kirim ke endpoint backend yang nantinya akan dibuat."

Endpoints yang perlu BE:
- `POST /admin/jemaat/me/device-tokens` — register FCM/APNS token
- `DELETE /admin/jemaat/me/device-tokens/:id` — unregister
- `GET /admin/jemaat/me/notifications` — fetch inbox
- `PATCH /admin/jemaat/me/notifications/:id/read` — mark as read
- `PATCH /admin/jemaat/me/notifications/mark-all-read`

**Workaround M6**:
- Local notifications (expo-notifications) untuk reminder ibadah — works without backend
- Skip push notif sampai BE infrastructure ready
- Notification page tampil cached local notifs only

**Gap detail — Branch change request:**

Mockup change-branch screen submit ke admin queue. Endpoint belum documented.

Endpoint yang perlu BE: `POST /admin/jemaat/me/branch-change-request` { newCabangId, reason? }

**Workaround**: Show form, submit fake success "Permohonan terkirim ke admin", admin handle manual via portal.

---

### M7 — Scanner (Volunteer)

| Fitur | Endpoint | Status |
|---|---|---|
| Check-in ibadah | `POST /admin/ibadah/:id/checkin` | 🟢 |
| Check-in event | `POST /admin/event/:id/checkin` | 🟢 |
| Force / override scan | `?force=true` parameter | 🟢 |
| **List my scannable events** | `GET /admin/me/scanner-events` | 🔴 (mentioned as "belum di-build") |
| **List my scannable ibadah** | `GET /admin/me/scanner-ibadah` | 🔴 |
| **Live count attendance** | ⚠ Tidak documented | 🔴 |

**Gap detail — Scanner list:**

Reference doc Section 8 explicit: "endpoint `/admin/me/scanner-*` ini belum di-build. Sementara, pakai pattern (2) — coba scan, handle 403 gracefully."

**Workaround M7**:
- Pakai pattern reactive: tombol "Scan" muncul di Ibadah/Event Detail untuk semua user. Klik → coba scan → kalau 403, tampilkan error friendly.
- Trade-off: user salah klik akan dapet error. UX kurang clean tapi works.

**Gap detail — Live count:**

Scanner mockup tampil "523 sudah check-in" yang seharusnya realtime/near-realtime.

**Workaround**: 
- Polling `GET /admin/ibadah/:id/checkin/count` setiap 10-15 detik
- Atau hitung client-side berdasarkan scan results di sesi sekarang (limited to scans by this device)
- Realtime via WebSocket = nice-to-have, bukan blocker MVP

**Action**: koordinasi dengan BE untuk endpoint count + scanner-events list. Bisa pakai workaround di M7 first.

---

### M8 — Bluetooth Printer

| Fitur | Endpoint | Status |
|---|---|---|
| Connect Bluetooth printer | Native BLE | ⚪ Client-only |
| Print label | ESC/POS via BLE | ⚪ Client-only |

Tidak ada gap — semuanya client-side.

---

### M9 — Homecell (PIC + Area)

| Fitur | Endpoint | Status |
|---|---|---|
| **Detail homecell + members** | ⚠ Tidak detailed di API guide | 🟡 |
| **List homecells in area** | ⚠ Tidak detailed | 🟡 |
| **Add member to homecell** | ⚠ Tidak detailed | 🟡 |
| **Remove member from homecell** | ⚠ Tidak detailed | 🟡 |
| Homecell attendance per meeting | Belum ada model (v1.2) | 🔴 |

**Gap detail:**

API guide barely mentions homecell endpoints. Reference doc menyebut struktur Homecell + HomecellArea tapi spek endpoint tidak detail.

Endpoint yang perlu konfirmasi:
- `GET /admin/homecell/:id` — detail + member list
- `GET /admin/homecell-area/:id/homecells` — semua homecell di area
- `POST /admin/homecell/:id/members` body { jemaatKode } — add via scan QR
- `DELETE /admin/homecell/:id/members/:jemaatId` — remove
- `GET /admin/me/homecell-managed` — homecell yang user-nya PIC
- `GET /admin/me/homecell-area-managed` — area yang user-nya PIC area

**Action**: minta swagger/openapi spec dari `{BASE_URL}/docs` untuk homecell — likely already exists di backend tapi tidak di-document di API guide.

---

### M10 — Bible

⚪ **Tidak perlu API**. Bundle JSON 5MB di asset, atau third-party API publik.

---

### M11 — Face Login (opsional)

| Fitur | Endpoint | Status |
|---|---|---|
| Face login (verify) | `POST /auth/face/login` | 🟢 |
| **Face enrollment** | ⚠ Tidak documented | 🔴 |
| **Reset face descriptor** | OTP purpose=RESET_FACE | 🟡 (purpose ada, full flow tidak detailed) |

**Gap detail — Face enrollment:**

Untuk face login bekerja, user perlu enroll wajah dulu — kemungkinan via OTP `purpose=ENROLLMENT` lalu submit descriptor. Endpoint submit descriptor tidak documented.

Action: konfirmasi endpoint `POST /auth/face/enroll` { descriptor, otpToken }.

---

### Cross-cutting concerns

#### Profile edit

| Fitur | Endpoint | Status |
|---|---|---|
| Edit profil sendiri | ⚠ Tidak detailed (mungkin `PATCH /admin/jemaat/:myId`) | 🟡 |
| Upload foto profil | ⚠ Tidak detailed | 🟡 |

**Action**: tanya BE — apakah `PATCH /admin/jemaat/:id` work untuk self-edit (RBAC mengizinkan jemaat edit dirinya)?

#### Rate limiting

Reference doc Section 12 sudah list semua rate limits ✓. Tidak ada gap.

#### File uploads

Mockup ada upload di:
- Sign-up: foto profil (M1)
- Family register new: foto (M5)
- Event bukti transfer: ✓ documented (M3)
- Edit profil: foto (M6)

**Status**: pola multipart upload sudah ada di event bukti. Untuk foto profil tinggal endpoint baru `POST /admin/jemaat/:id/foto`.

---

## Ringkasan & rekomendasi

### Bisa langsung start

✅ **M1 auth (sebagian)**, **M2 home+ibadah**, **M3 event+payment (single jemaat)**, **M4 content+persembahan** — semua endpoint critical sudah ada.

### Blocked / butuh diskusi backend

🚧 **M5 Family** — paling kritis. Tidak ada endpoint sama sekali. Schedule meeting dulu.

🚧 **M6 Notifications + Branch change** — backend infrastructure belum ada. Bisa workaround dengan local notif sementara.

🚧 **M7 Scanner endpoints (list scannable)** — bisa workaround dengan handle 403.

🚧 **M9 Homecell endpoints** — kemungkinan sudah ada di Swagger, perlu konfirmasi.

### Self-registration di M1 — DECIDED 2026-05-19

**Decision**: **Mobile self-register dengan auto-active** (per product preference).

Endpoint yang perlu BE: `POST /auth/register` dengan validation OTP enrollment yang sudah verified.

Anti-abuse:
- Rate limit per HP (1 register / nomor)
- Rate limit per IP (sudah ada di OTP request)
- Admin cabang dapat notif "Jemaat baru terdaftar: <nama>" untuk transparency
- Audit log creation

Detail spec di [`backend-meeting-brief.md`](./backend-meeting-brief.md) Section 1.

---

## Action items untuk meeting dengan backend team

1. ⏰ **Schedule meeting** dengan tim BE IDEA — agenda: API gap untuk mobile app
2. 📋 Bawa dokumen ini + screen inventory ke meeting
3. 🎯 Prioritas tinggi untuk M5 (family) — perlu ETA
4. 🎯 Decide self-registration approach (M1)
5. ❓ Klarifikasi homecell endpoint specs (M9)
6. ❓ Konfirmasi profile edit + foto upload pattern
7. 🗓️ Backend roadmap untuk push notif infrastructure (M6)
8. 🔄 Update API guide setelah meeting — atau auto-generate dari Swagger
