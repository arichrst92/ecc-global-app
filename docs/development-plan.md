# Development Plan & Roadmap

Plan untuk porting mockup → production app (React Native + Expo). Pendekatan **iterasi vertikal** — tiap milestone deliver fitur end-to-end yang bisa di-demo, bukan horizontal layer-by-layer.

## Prinsip

- **Mockup adalah source of truth UX**. Jangan re-invent — translate as-is dulu, refine kemudian.
- **Vertical slice per milestone**: tiap milestone harus jalan end-to-end (UI + API + state).
- **Real API dari Day 1**: gunakan staging backend. Hindari mock data yang nantinya harus refactor.
- **Type-safe**: TypeScript strict mode, zod untuk runtime validation API response.
- **Test critical paths**: auth flow, QR scan, payment status — pakai detox atau maestro untuk e2e.

## Milestones

### M0 · Foundation (1-2 hari)

**Tujuan**: project siap kerja, semua dev tooling jalan.

- [x] Scaffold Expo app dengan tabs template
- [ ] Install core deps: expo-router, expo-secure-store, expo-camera, lucide-react-native
- [ ] Install state/data deps: @tanstack/react-query, zustand (untuk auth state), zod
- [ ] Install i18n: react-i18next, i18next, expo-localization
- [ ] Install styling: NativeWind (Tailwind RN) — atau decide pakai StyleSheet
- [ ] Setup ESLint + Prettier dengan config Expo-friendly
- [ ] Setup `.env` handling (expo-constants + EAS Secrets nanti)
- [ ] Buat `src/api/client.ts` — axios/fetch wrapper dengan auth interceptor (token refresh otomatis)
- [ ] Buat `src/i18n/index.ts` — load id.json + en.json, default lang Indonesia
- [ ] Buat `src/theme/colors.ts` + `src/theme/typography.ts` — design tokens dari portal config
- [ ] Setup Sentry / Crashlytics (opsional di M0)

**Deliverable**: `npx expo start` jalan, splash screen ECC tampil, app load tanpa error.

---

### M1 · Auth Flow (3-5 hari)

**Tujuan**: user bisa login OTP dari awal sampai dapat token dan masuk home (placeholder home).

Screens to port:
- Splash → Onboarding (3 slides) → Welcome → Login Phone → Login OTP → Home (placeholder)

Backend integration:
- `POST /auth/otp/request` — send OTP
- `POST /auth/otp/verify` — verify, get tokens + user
- `POST /auth/refresh` — auto-refresh access token
- Token storage di `expo-secure-store`

Tasks:
- [ ] Implement OTP cooldown timer (5 min) di state
- [ ] Phone normalize ke E.164 client-side
- [ ] Handle error states: 404 (belum terdaftar), 429 (rate limited), network error
- [ ] Implement auto-refresh interceptor di api client
- [ ] Persistent auth state — restart app, user masih login
- [ ] Logout flow yang clear secure store

**Deliverable**: Bisa login dengan no HP staging, OTP arrive di WhatsApp, masuk home placeholder. Logout works.

---

### M2 · Home + Ibadah (5-7 hari)

**Tujuan**: user lihat ibadah hari ini, calendar, detail, dan tampilkan QR Card.

Screens:
- Home dashboard (greeting, streak, today's ibadah, news preview, event preview, renungan preview)
- Ibadah List (calendar grouped by date)
- Ibadah Detail (info + petugas)
- QR Card (carousel saya + family, auto-blur 30s)
- Profile (basic — info user, logout, settings link)

Backend:
- `GET /admin/ibadah/calendar?from=...&to=...&cabangId=...`
- `GET /admin/ibadah/:id`
- `GET /admin/jemaat/:id` (untuk family list)
- QR rendering client-side dari `user.kode` (no API needed)

Tasks:
- [ ] Setup Expo Router file structure sesuai `screen-inventory.md`
- [ ] Bottom tab navigator
- [ ] QR Card carousel — `react-native-snap-carousel` atau `react-native-reanimated-carousel`
- [ ] QR generator — `react-native-qrcode-svg`
- [ ] Auto-blur timer per card, reset on swipe
- [ ] React Query caching untuk calendar (1 jam stale)
- [ ] Family list fetch dari API (kalau endpoint sudah ada — kalau belum, mock placeholder dengan note)

**Deliverable**: Bisa cek ibadah minggu ini, tap ke detail, tampilkan QR Card untuk check-in.

---

### M3 · Event Flow + Payment (5-7 hari)

**Tujuan**: user bisa daftar event berbayar, upload bukti, lihat status.

Screens:
- Event List (with filter chips)
- Event Detail (hero + sticky CTA — INGAT: flex column, jangan absolute)
- Event Daftar dengan family selector + total fee
- Event Bayar (rekening info + QRIS + upload bukti)
- Event Status timeline

Backend:
- `GET /admin/event?isPublished=true`
- `GET /admin/event/:idOrSlug`
- `POST /admin/event/:eventId/peserta` — register
- `POST /admin/event/:eventId/peserta/:participationId/bukti` — upload (multipart)

Tasks:
- [ ] Image picker (`expo-image-picker`) untuk bukti transfer
- [ ] Compress image sebelum upload (max 1MB)
- [ ] Multipart form data upload
- [ ] Family selector reusable component (untuk event + ibadah reserve)
- [ ] Status timeline component
- [ ] Handle quota penuh (409) gracefully

**Deliverable**: Bisa daftar Retreat, upload bukti, lihat status timeline.

---

### M4 · Content (News + Renungan + Persembahan) (3-5 hari)

**Tujuan**: konsumsi konten dan lihat info persembahan.

Screens:
- News List (tab switcher news/renungan)
- News Detail (markdown render)
- Renungan Detail (with prev/next nav)
- Persembahan List + Detail

Backend:
- `GET /admin/news?isPublished=true`
- `GET /admin/renungan?isPublished=true`
- `GET /admin/news/:idOrSlug`, `GET /admin/renungan/:idOrSlug`
- `GET /admin/cabang/:id/rekening`

Tasks:
- [ ] Markdown renderer (`react-native-markdown-display`)
- [ ] Share native — `react-native-share` atau `expo-sharing`
- [ ] Bookmark local (AsyncStorage)
- [ ] Copy to clipboard untuk nomor rekening

**Deliverable**: Renungan harian bisa dibaca + share ke WhatsApp. Persembahan info bisa di-copy.

---

### M5 · Family Management (3-5 hari)

**Tujuan**: link/register anggota keluarga, gunakan di event/ibadah reservasi.

Screens:
- Family List
- Family Add (3 opsi: scan QR, search phone, register new)
- Family Register (form, dengan toggle "anak tanpa HP")

Backend (perlu konfirmasi backend team — endpoint belum 100% defined di reference doc):
- `GET /admin/jemaat/me/family` — list anggota keluarga
- `POST /admin/jemaat/me/family/link` — link existing jemaat
- `POST /admin/jemaat/me/family/register` — register new (no-phone variant)
- `DELETE /admin/jemaat/me/family/:id` — unlink

Tasks:
- [ ] Camera QR scanner untuk family add — reuse component dari M7
- [ ] Search by phone — debounced
- [ ] Form validation dengan zod
- [ ] No-phone toggle logic (skip phone field, mark profile as "linked-only")

**Deliverable**: Family list works, bisa register anak baru, family selector di event/ibadah pakai data real.

---

### M6 · Notifications + Profile Settings (3-5 hari)

**Tujuan**: push notif, settings menu lengkap, change branch.

Screens:
- Notifications page
- Change Branch
- Settings: language toggle, dark mode toggle

Backend:
- Push notification: setup FCM (Android) + APNS (iOS) — `expo-notifications`
- ⚠️ Backend notification service belum ada di reference doc. Bicarakan dengan backend team.
- `POST /admin/jemaat/me/branch-change-request` (kemungkinan endpoint baru)

Tasks:
- [ ] Register device token saat login
- [ ] Local notifications untuk reminder ibadah (Sabtu malam)
- [ ] Handle notification tap → deep link ke screen
- [ ] Notif categories: ibadah/renungan/event/payment/family/news
- [ ] Mark all as read

**Deliverable**: Push notif sample arrive di device. Tap → buka screen. Branch change submit ke admin queue.

---

### M7 · Scanner Mode (Volunteer) (4-6 hari)

**Tujuan**: volunteer bisa scan QR jemaat untuk check-in di ibadah/event.

Screens:
- Scanner full-screen (camera + frame + scan-line animation)
- Result modal (success/already/walkin/404/403/409-force)
- Print Label inline (kalau printer connected)

Backend:
- `POST /admin/ibadah/:id/checkin` { kode, tanggalIbadah, force }
- `POST /admin/event/:id/checkin` { kode, force }

Tasks:
- [ ] Camera setup — `expo-camera` atau `react-native-vision-camera` (lebih powerful)
- [ ] QR decode — `expo-camera/scanCodeAsync` atau `vision-camera-code-scanner`
- [ ] Continuous scan dengan debounce 3 detik (cegah double-fire)
- [ ] Audio + haptic feedback per result type
- [ ] Stats counter (today's total)
- [ ] Manual input fallback (8-char code)
- [ ] Offline queue — local SQLite untuk scan saat tanpa signal, retry saat reconnect

**Deliverable**: Volunteer bisa scan ratusan QR dalam pre-ibadah, walk-in handled, force scan untuk override, offline scan tersimpan.

---

### M8 · Bluetooth Printer (3-4 hari)

**Tujuan**: print label QR + nama + ibadah/event setelah scan success.

Backend: tidak ada — semua di device.

Tasks:
- [ ] Library: `react-native-bluetooth-escpos-printer` atau `react-native-thermal-printer`
- [ ] Permission Bluetooth (`expo-bluetooth-classic` atau wrapper)
- [ ] Scan devices, pair, store device ID di SecureStore
- [ ] ESC/POS command construction untuk thermal label
- [ ] Label template dengan QR + text
- [ ] Print preview di settings
- [ ] Print button inline di scan result modal

**Deliverable**: Volunteer pasang printer Bluetooth, label keluar < 2 detik setelah scan.

---

### M9 · PIC Homecell + PIC Area (4-6 hari)

**Tujuan**: PIC bisa kelola anggota homecell, PIC area bisa lihat semua homecell di area-nya.

Screens:
- PIC Homecell Detail (list anggota + tambah via QR)
- Add Member by QR (scanner + confirm modal)
- PIC Area List (semua homecell)
- PIC Area Homecell Detail (drill-down)

Backend (mostly already exists per reference doc):
- `GET /admin/homecell/:id`
- `GET /admin/homecell-area/:id/homecells`
- `POST /admin/homecell/:id/members` — add member
- `DELETE /admin/homecell/:id/members/:jemaatId` — remove

Tasks:
- [ ] Conditional menu di Profile berdasarkan role
- [ ] Reuse QR scanner component dari M7
- [ ] Add member confirm modal
- [ ] Drill-down navigation pattern

**Deliverable**: PIC Maria bisa tambah Joshua via scan QR. PIC area bisa drill-down per homecell.

---

### M10 · Bible (3-5 hari)

**Tujuan**: browse + read Alkitab TB LAI.

Screens:
- Bible Home (verse of day, recent, bookmarks, browse OT/NT)
- Bible Chapter (text view, font size, prev/next, bookmark)

Data source:
- Bundle TB JSON di asset (~5MB) — paling reliable, no internet needed
- Atau API publik (mis. bible.com API) — pertimbangkan rate limit & uptime
- Recommended: bundle as asset

Tasks:
- [ ] Data: extract TB to JSON per kitab (`assets/bible/<book>.json`)
- [ ] Search index untuk ayat (Fuse.js atau simple substring)
- [ ] Bookmark local (AsyncStorage)
- [ ] Font size toggle (sm/md/lg)
- [ ] Highlight + share ayat
- [ ] Verse of the day — server config atau local rotating list

**Deliverable**: Browse Mazmur, baca Mazmur 23, font size adjustable, bookmark works.

---

### M11 · Face Login (2-3 hari) — opsional

**Tujuan**: login cepat tanpa OTP via face recognition.

Tasks:
- [ ] Library: `react-native-face-api-js` atau `react-native-vision-camera` + on-device ML
- [ ] Capture face → compute 128-dim descriptor
- [ ] `POST /auth/face/login` dengan descriptor
- [ ] Enrollment flow (di profile settings)

**Status**: Stretch goal. Bisa skip kalau OTP cukup baik.

---

### M12 · Polish + Beta Release (1 minggu)

- [ ] Crash reporting (Sentry)
- [ ] Analytics (anonymized) — Mixpanel atau Firebase Analytics
- [ ] Performance tuning (image lazy load, list virtualization)
- [ ] Accessibility audit (screen reader labels, tap target sizes)
- [ ] App store metadata (screenshots, descriptions)
- [ ] EAS Build setup (iOS + Android)
- [ ] TestFlight + Play Store internal testing
- [ ] Beta deploy ke 50 jemaat ECC Jakarta

---

## Timeline estimasi

Asumsi: 1 developer full-time, 5 hari kerja per minggu.

| Phase | Milestone | Estimasi |
|---|---|---|
| Setup | M0 Foundation | 1-2 hari |
| Auth | M1 Auth Flow | 1 minggu |
| Core | M2 Home + Ibadah | 1.5 minggu |
| Event | M3 Event + Payment | 1.5 minggu |
| Content | M4 Content (News/Renungan/Persembahan) | 1 minggu |
| Family | M5 Family Management | 1 minggu |
| Notif | M6 Notifications + Settings | 1 minggu |
| Scanner | M7 Scanner Volunteer | 1.5 minggu |
| Printer | M8 Bluetooth Printer | 1 minggu |
| Homecell | M9 PIC Homecell + Area | 1.5 minggu |
| Bible | M10 Alkitab | 1 minggu |
| Face | M11 Face Login (opsional) | 0.5 minggu |
| Polish | M12 Beta release | 1 minggu |
| **Total** | **MVP + V1.1** | **~13-14 minggu** |

3-3.5 bulan untuk feature parity dengan mockup. Kalau ada 2 dev paralel, bisa ~7-8 minggu.

## Backend dependencies / blockers

Yang **belum ada** di backend per reference doc — perlu koordinasi dengan tim backend ECC:

| Fitur | Endpoint missing | Workaround |
|---|---|---|
| Family relasi | `/admin/jemaat/me/family/*` | Mockup placeholder, build M5 setelah BE ready |
| Push notif service | Token registration + send infra | Local notif dulu di M6 |
| Branch change request | `/admin/jemaat/me/branch-change-request` | Manual via WhatsApp ke admin sementara |
| Homecell attendance | `HomecellMeeting` + `HomecellAttendance` model | Skip di MVP (v1.2 per reference) |
| Donation history per jemaat | `/admin/jemaat/me/donations` | Tidak prioritas (v2) |
| Scanner authorization list | `/admin/me/scanner-events` | Pakai pattern coba scan, handle 403 |

Action item: **schedule meeting dengan backend team** sebelum M5 mulai untuk align endpoint family.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Bluetooth printer compat issues (banyak brand di Indonesia) | High | Medium | Test 3-4 printer paling umum (Xprinter, Eppos, Bluebamboo) sebelum commit |
| Face recognition accuracy | Medium | Low | OTP sebagai fallback selalu ada, face login opsional |
| Push notif setup di backend lama | High | Medium | Local notif dulu, push notif phase 2 |
| Indonesian PDP Law compliance | Medium | High | Konsultasi legal untuk consent flow + right to delete |
| App store review (Apple) | Medium | Medium | Privacy manifest + clear privacy policy URL |

## Next 2 weeks (start)

**Week 1**: M0 Foundation + M1 Auth Flow
- Hari 1-2: Setup deps, ESLint, i18n skeleton, api client dengan token refresh
- Hari 3-4: Splash, Onboarding, Welcome screens (UI only first, no API)
- Hari 5-7: Login Phone + OTP dengan real API staging, secure store

**Week 2**: M2 Home + Ibadah start
- Hari 1-2: Bottom tabs, Home layout
- Hari 3-5: Ibadah List + Detail dengan calendar API
- Hari 6-7: QR Card carousel

Review weekly Friday sore. Demo to stakeholders setiap 2 minggu.
