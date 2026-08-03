# Smoke Test Playbook — v1.2 s/d v1.5 Release Validation

**Owner:** Ari
**Date:** 2026-08-03
**Scope:** Validate mobile Sprint 2-5 sebelum promote ke Play Store production
**Env:** Production BE (`https://api.eccchurch.global`)

---

## Prep Checklist (semua harus ✅ sebelum test)

### 1. BE Deploy Status

Konfirmasi semua endpoint live via curl:

```bash
JWT="<paste-jwt-Ari>"

# Sprint 2 — magic link + onboarding
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"email":"arichrst@ide.asia"}' \
  https://api.eccchurch.global/auth/email/request-magic-link
# Expect: {"success":true,"message":"Kalau email terdaftar..."}

# Sprint 3 — group by-kode
curl -s -H "Authorization: Bearer $JWT" \
  https://api.eccchurch.global/admin/me/group-membership | head -c 200
# Expect: {"success":true,"data":[...]}

# Sprint 4 — parent reservasi (baru live 2026-08-03)
curl -s -H "Authorization: Bearer $JWT" \
  "https://api.eccchurch.global/admin/me/reservasi?activeOnly=true" | head -c 200
# Expect: {"success":true,"data":[]} (kalau belum ada reservasi aktif)

# Sprint 4 — walk-in dgn kode (baru live 2026-08-03)
curl -s -X POST -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"kode":"TESTKODE","ibadahId":"<uuid>","tanggalIbadah":"2026-08-04","action":"checkin"}' \
  https://api.eccchurch.global/admin/reservasi/walk-in | head -c 200
# Expect: 404 kalau kode invalid (endpoint reachable), atau 200 kalau kode + ibadah valid

# Sprint 5 — children points
curl -s -H "Authorization: Bearer $JWT" \
  https://api.eccchurch.global/admin/me/children-points | head -c 200
# Expect: {"success":true,"data":[...]}
```

**Kalau ada 404 endpoint-level → BE belum deploy, koordinasi dulu.**

### 2. APK Preview Build

Di Mac terminal:

```bash
cd ~/Projects/ecc-mobile-app/app
git pull origin main                              # ensure latest code
npm install                                        # sync deps
npx expo prebuild --clean                          # regenerate native folders
eas build --profile preview --platform android    # build APK
```

Wait ~15-20 menit di EAS cloud. Download APK dari email atau https://expo.dev/accounts/arichrst92/projects → tab Builds.

**Install APK di HP Android testing.**

### 3. Test Data Seed

**Sprint 2 (Onboarding wizard test):**

Jalankan di VPS:

```bash
ssh deploy@187.77.118.85
cd /var/www/ecc-core-platform
pnpm --filter @ecc/database db:seed-test-onboarding
```

Output print 3 UUID + noHp random untuk TEST-001/002/003. Save output.

**Sprint 4 (Kids ibadah test):**

Opsi A (recommended) — via portal admin:
1. Buka https://portal.eccchurch.global/dashboard/ibadah
2. Pilih 1 ibadah aktif (mis. "Ibadah Anak Minggu Pagi" atau bikin dummy)
3. Edit → toggle **"Ibadah Anak?"** ON + **"Wajib Checkout?"** ON → Save
4. Save UUID ibadah untuk reference

Opsi B — SQL direct:
```bash
sudo -u postgres psql ecc_platform -c "
UPDATE ibadah SET is_kids_ibadah = true, requires_checkout = true
WHERE nama ILIKE '%anak%' AND is_active = true
RETURNING id, nama;"
```

### 4. Test Accounts Ready

- Own account (Ari, `arichrst@ide.asia`) — sudah onboarded, punya scanner role kalau perlu
- 3 seeded test jemaat (TEST-001/002/003 — email @ide.asia)
- Kalau perlu test CKids: setup 1 anak via family relations di production (via mobile self-service atau portal admin)

---

## Sprint 2 (v1.2.0) — Magic Link + Onboarding

### S2.A — Magic Link login flow (own email)

**Skenario:** Test magic link end-to-end tanpa impact ke onboarding wizard.

**Steps:**
1. Buka app → Welcome → tap **"Masuk dengan Email"**
2. Input `arichrst@ide.asia` → tap **Kirim Link**
3. Screen switch ke "Cek Inbox" state
4. Buka Gmail → cari email dari `noreply@eccchurch.global` subject "Login ke aplikasi ECC"
5. Klik tombol "Login" di email → app open otomatis via deeplink

**Expected:**
- ✅ Screen "Memverifikasi link…" tampil sebentar
- ✅ Toast success + redirect ke `/(tabs)` (karena Ari sudah onboarded)

**Kalau gagal:**
- Email tidak masuk 2 menit → cek Spam folder, retry
- Klik link buka browser bukan app → cek intent-filter di app.json terinstall
- 401 di app → token expired atau format salah

### S2.B — Onboarding wizard full flow (TEST-001)

**Skenario:** Legacy jemaat dengan noHp + profile fields kosong.

**Steps:**
1. Welcome → **"Masuk dengan Email"**
2. Input `test-onboarding-1@ide.asia` → Kirim Link
3. Cek inbox @ide.asia → klik link
4. App redirect ke `/(auth)/onboarding` (bukan tabs)
5. Wizard step **Intro**: baca copy, tap **Mulai**
6. Wizard step **Add Phone Input**: input nomor testing → tap Kirim OTP
7. Wizard step **Add Phone OTP**: input kode WhatsApp → verify
8. Wizard step **Profile**: input gender, DOB, alamat (opsional), cabang → tap **Selesai & Masuk Aplikasi**
9. Landing di `/(tabs)`, tab Home

**Expected:**
- ✅ Wizard trigger correctly (bukan skip)
- ✅ Add-phone step accept nomor + OTP verify sukses
- ✅ Profile fields required visible dgn asterisk (*)
- ✅ Submit sukses → user object updated (`needsOnboarding=false`)

**Reset untuk re-test:** jalankan ulang `pnpm --filter @ecc/database db:seed-test-onboarding` di VPS.

### S2.C — Skip phone step (TEST-002)

**Skenario:** Legacy jemaat sudah punya noHp, hanya profile kosong.

**Steps:**
1. Welcome → Email → `test-onboarding-2@ide.asia`
2. Cek inbox → klik link
3. Wizard flow: **Intro → langsung ke Profile** (2 phone steps di-skip)
4. Isi profile → Selesai

**Expected:**
- ✅ Skip add-phone step (missingNoHp=false detected)
- ✅ Direct ke profile step setelah intro

### S2.D — Skip wizard control (TEST-003)

**Skenario:** Jemaat sudah onboarded — wizard harus skip.

**Steps:**
1. Welcome → Email → `test-onboarding-3@ide.asia`
2. Klik link → verify

**Expected:**
- ✅ Landing di `/(tabs)` langsung (bukan onboarding)
- ✅ `needsOnboarding=false` di response

### S2.E — OTP login regression (Ari nomor)

**Skenario:** Verify OTP login existing tidak break.

**Steps:**
1. Welcome → **"Masuk dengan OTP WhatsApp"**
2. Input nomor Ari → dapat OTP WA → verify
3. Landing di tabs

**Expected:**
- ✅ Flow OTP tetap jalan sama seperti sebelum M36/M37
- ✅ Landing di tabs (Ari sudah onboarded)

---

## Sprint 3 (v1.3.0) — Group Feature

### S3.A — Browse public group

**Steps:**
1. Landing di tabs → Profile tab → **"Jelajahi Group"**
2. Screen Group Browse tampil
3. Filter cabang (dropdown) → pilih Bandung
4. Filter jenis chip → pilih **Homecell**
5. Search "kfc" (kalau ada)
6. Tap salah satu group

**Expected:**
- ✅ List group render dgn info: nama, jenis, cabang, hari/jam, PIC, member count
- ✅ Filter cabang + jenis + search work independent
- ✅ Kartu tap → navigate ke Group Detail

### S3.B — Join public group

**Steps:**
1. Di Group Browse, tap public group (isPublic=true, bukan member)
2. Group Detail → tap **"Bergabung ke Group"**
3. Toast success

**Expected:**
- ✅ Tombol berubah dari Join → **"Keluar dari Group"**
- ✅ Member count +1
- ✅ Nama Ari muncul di section Members dgn badge "Anda"
- ✅ Kembali ke tabs → Profile → **"Group Saya"** → group baru muncul di list

### S3.C — Join private group via QR

**Prep:** Butuh 1 private group + kodenya. Kalau Ari punya PIC group private, buka `/group/:id/qr` untuk lihat kode.

**Steps:**
1. Group Browse → tap icon QR di header (atau via "Cari Group" CTA)
2. Screen `/group/scan` tampil dgn camera
3. Scan QR private group ATAU tap **Input Manual** → input kode 8-char
4. Verify + toast success

**Expected:**
- ✅ Scan QR trigger `POST /admin/group/join-by-code`
- ✅ Response 200 → redirect ke Group Detail
- ✅ Member badge muncul

### S3.D — PIC actions (kalau Ari PIC salah satu group)

**Steps di group yang Ari PIC:**
1. Group Detail → header ada icon Settings (⚙)
2. Tap Settings → Edit form (nama, deskripsi, isPublic toggle)
3. Section **Kode Invitation** (kalau private) → tap **Show QR** → screen QR fullscreen
4. Copy kode → toast "Kode disalin"
5. Regenerate code → confirm → toast "Kode baru: XXX"
6. Add Member button → screen scan QR jemaat → scan
7. Bottom "Bubarkan Group" → confirm → group dismissed + WA notif ke member

**Expected:**
- ✅ Kode invitation display 8-char + toggle format (Kode/Deeplink)
- ✅ Regenerate ganti kode (idempotent)
- ✅ Add member scan QR → response `alreadyMember: false`

### S3.E — Leave group

**Steps:**
1. Group Detail (Ari member) → tap **"Keluar dari Group"**
2. Confirm modal → Ya, Keluar

**Expected:**
- ✅ Tombol balik ke Join (kalau public)
- ✅ Member count -1
- ✅ Redirect atau refresh dgn state updated

---

## Sprint 4 (v1.4.0) — Kids Bundle + Walk-in

### S4.A — Scanner mode toggle visibility

**Prep:** Ari role scanner authorized di ibadah TEST (yang isKidsIbadah=true + requiresCheckout=true).

**Steps:**
1. Profile → Scanner Mode
2. Pilih ibadah TEST → tap Scan
3. Screen scanner buka dgn 3 mode chip di bottom: **Check-in** (biru) / **Checkout** (kuning) / **Jemput Anak** (pink)
4. Header tampil badge "🧒 KIDS"

**Expected:**
- ✅ 3 mode chip visible (requiresCheckout=true + isKidsIbadah=true)
- ✅ Kalau ibadah bukan kids/checkout, chip yang tidak applicable hidden
- ✅ Badge 🧒 KIDS di header

### S4.B — Check-in (walk-in flow)

**Prep:** QR profile jemaat (Ari sendiri atau jemaat lain).

**Steps:**
1. Mode **Check-in** aktif (default)
2. Scan QR profile jemaat 8-char
3. Modal result tampil "Check-in Sukses" + nama + foto
4. Kalau ibadah kids: toast prominent "Kode Jemput: 483920"

**Expected:**
- ✅ `POST /admin/reservasi/walk-in { kode, action: 'checkin' }` sukses
- ✅ Response include `pickupCode` (kalau kids)
- ✅ Stats counter update +1 hadir
- ✅ Kalau printer connected + autoPrint → label tercetak

### S4.C — Checkout scan

**Prep:** Jemaat sudah check-in (dari S4.B).

**Steps:**
1. Toggle mode → **Checkout** (kuning)
2. Scan QR profile jemaat yang sama
3. Modal result: "Check-in Sukses" (namaLengkap) — indikator COMPLETED

**Expected:**
- ✅ `walk-in { action: 'checkout' }` sukses
- ✅ Reservasi status → COMPLETED
- ✅ Retry scan sama → alreadyCheckedIn=true (idempotent)

### S4.D — Pickup via 6-digit input

**Prep:** Anak checked-in di kids ibadah, punya pickupCode. Ambil kode dari S4.B response.

**Steps:**
1. Toggle mode → **Jemput Anak** (pink)
2. Card pink "Input Kode Jemput" tampil → tap
3. Modal PickupInputModal buka → input 6-digit
4. Auto-submit setelah 6-digit lengkap
5. Alert "Pickup Berhasil: Budi Junior dari Ibadah Anak"

**Expected:**
- ✅ `POST /admin/reservasi/pickup { pickupCode }` sukses
- ✅ Kalau kode salah: alert "Kode Tidak Valid"
- ✅ Kalau kode expired (>24 jam): alert "Kode Tidak Valid"

### S4.E — Pickup via scan QR anak

**Steps:**
1. Mode **Pickup** aktif
2. Scan QR profile anak (bukan input 6-digit)
3. Modal result "Pickup Sukses"

**Expected:**
- ✅ `walk-in { action: 'pickup' }` sukses
- ✅ pickedUpAt set di reservasi

### S4.F — Parent view kode jemput

**Prep:** Ari sebagai parent check-in anak dulu di S4.B (Ari = checkedInBy).

**Steps:**
1. Profile → **"Reservasi Ibadah"**
2. Section "Ibadah Anak — Kode Jemput" tampil
3. Card besar dgn kode 6-digit + copy "Tunjukkan ke admin"

**Expected:**
- ✅ `GET /admin/me/reservasi?activeOnly=true` return reservasi anak
- ✅ PickupCodeCard render dgn kode besar font 5xl
- ✅ Setelah anak di-pickup, card change ke ✅ hijau "Anak sudah di-pickup"

---

## Sprint 5 (v1.5.0) — CKids Tab

### S5.A — Tab visibility conditional

**Skenario A1 — User tanpa anak (default Ari):**
1. Buka app, check bottom nav
2. Expected: **5 tab** (Home, Ibadah, Event, Beri, Profil) — **TIDAK ada CKids**

**Skenario A2 — Setup anak via family relations:**
1. Profile → menu Keluarga
2. Add anak baru (register-new atau link-by-kode dgn tipeRelasi='Anak Laki-Laki'/'Anak Perempuan')
3. Restart app
4. Expected: **6 tab** dgn **CKids** (icon Baby pink) muncul di antara Event dan Beri

### S5.B — Balance display

**Prep:** Anak (dari S5.A2) sudah earn point (via kids ibadah check-in di stall atau manual adjust admin).

**Steps:**
1. Tap tab **CKids**
2. Anak selector (kalau multi anak) → pilih anak
3. Balance card besar tampil: "150 pts" + cabang

**Expected:**
- ✅ `GET /admin/me/children-points` return balance
- ✅ Kalau anak tanpa balance → tab tampil tapi balance card empty state (0 pts atau info)

### S5.C — Katalog hadiah

**Steps:**
1. Di CKids tab, scroll ke section **Katalog Hadiah**
2. Grid 3-kolom tampil dgn hadiah cabang

**Expected:**
- ✅ `GET /admin/hadiah?cabangId=X&isActive=true` return list
- ✅ Kartu hadiah: foto + nama + point cost + stock indicator
- ✅ Hadiah yang bisa afford → border pink, yang tidak → border neutral
- ✅ Stock < 5 tampil "3 tersisa", stock 0 tampil "Habis"

### S5.D — History redeem

**Prep:** Anak pernah redeem hadiah di stall.

**Steps:**
1. CKids tab → scroll ke section **Riwayat Redeem**
2. List redeem tampil

**Expected:**
- ✅ `GET /admin/me/children-redeem-history?jemaatId=X` return list
- ✅ Row: foto hadiah + nama snapshot + tanggal + admin + point deducted (merah -200)

### S5.E — QR anak fullscreen

**Steps:**
1. CKids tab → tap tombol **"Tunjukkan QR ke Stall"**
2. Screen fullscreen pink dgn QR anak 240px

**Expected:**
- ✅ QR value = jemaat.kode 8-char
- ✅ Balance breakdown per cabang tampil (kalau multi cabang)
- ✅ Instruction "Cara Redeem" jelas

### S5.F — Multi anak switcher

**Prep:** Ari punya 2+ anak.

**Steps:**
1. CKids tab → tap anak selector card
2. Modal buka dgn list anak
3. Pilih anak lain

**Expected:**
- ✅ Balance card + katalog + history update sesuai anak baru
- ✅ Selection persist saat app closed + reopen

---

## Error Scenarios (untuk semua sprint)

Test edge cases:

| Skenario | Expected |
|---|---|
| Network offline saat scan | Toast "Network error", retry work |
| Token expired mid-session | Auto-refresh via `/auth/refresh`, silent retry |
| Rate limit 429 (magic link) | Copy jelas "Terlalu banyak request, coba 1 jam lagi" |
| Kode QR invalid (Not 8-char) | Camera reject, no API call |
| Kode QR jemaat tidak ditemukan | Alert "Jemaat tidak ditemukan" |
| Force close app mid-onboarding | Resume state on reopen (Zustand persist) |
| Deeplink dgn token invalid | Screen error "Link Tidak Valid" + CTA "Minta Link Baru" |
| Guest mode akses fitur berbayar | Modal "Daftar Akun Diperlukan" |

---

## Go/No-Go Checklist untuk Release

### 🚦 v1.2.0 Release (Sprint 2)

- [ ] S2.A (magic link Ari) sukses
- [ ] S2.B (wizard full flow TEST-001) sukses
- [ ] S2.C (skip phone TEST-002) sukses
- [ ] S2.D (skip wizard TEST-003) sukses
- [ ] S2.E (OTP regression) sukses
- [ ] No regression di guest mode + existing OTP login
- [ ] Crash rate < 2% di internal testing 3 hari

### 🚦 v1.3.0 Release (Sprint 3)

- [ ] S3.A/B (browse + join public) sukses
- [ ] S3.C (QR scan private) sukses — kalau ada private group
- [ ] S3.D (PIC actions) sukses — kalau ada group PIC
- [ ] S3.E (leave group) sukses
- [ ] Notif WA sampai ke jemaat setelah PIC add/remove
- [ ] My Groups screen render benar

### 🚦 v1.4.0 Release (Sprint 4)

- [ ] S4.A (mode toggle visibility) sukses
- [ ] S4.B (walk-in check-in kids) sukses dgn pickupCode return
- [ ] S4.C (walk-in checkout) sukses
- [ ] S4.D (pickup 6-digit) sukses
- [ ] S4.E (pickup scan QR anak) sukses
- [ ] S4.F (parent view kode) — kode besar tampil di /my-reservasi
- [ ] Backward compat: ibadah non-kids scanner tetap work

### 🚦 v1.5.0 Release (Sprint 5)

- [ ] S5.A (tab visibility conditional) sukses
- [ ] S5.B (balance display) sukses
- [ ] S5.C (katalog render) sukses
- [ ] S5.D (history redeem) sukses
- [ ] S5.E (QR fullscreen scan-able) sukses
- [ ] S5.F (multi anak switcher persist) sukses
- [ ] User tanpa anak tetap access app normal (tab hidden)

---

## Recording Results

Setiap test skenario, log:
- ✅ Pass / ❌ Fail / ⚠️ Partial
- Waktu test
- APK version code
- Bug/issue notes → kirim `backend-request-*.md` kalau BE issue

Rekomendasi format hasil (satu file per sprint kalau perlu):

```
## S2 Smoke Test Results — 2026-XX-XX

| Skenario | Status | Notes |
|---|---|---|
| S2.A magic link Ari | ✅ | Email masuk 30s, deeplink OK |
| S2.B wizard TEST-001 | ✅ | 4 step complete 2 menit |
| S2.C skip phone TEST-002 | ❌ | Bug: wizard tetap show phone step |
| S2.D skip wizard TEST-003 | ✅ | Direct ke tabs |
| S2.E OTP regression | ✅ | Sama seperti sebelumnya |

APK: v1.2.0 build #12 (versionCode 12)
Overall: HOLD — S2.C bug perlu fix sebelum release
```

Kirim summary ke tim BE + save di `docs/smoke-test-results/`.

---

## Post-Release Monitoring

Setelah v1.X.0 rollout ke Play Store production:

**Day 1-3:**
- Crash rate < 2% (Play Console → Android vitals)
- ANR rate < 0.5%
- No critical user reviews (score < 3)
- Sentry error dashboard clean

**Day 7:**
- Install count trend positive
- User retention D1/D7 stable atau naik
- Support inbox (feedback dari jemaat legacy) — track FAQ

**Rollout strategy (staged):**
- Day 1: 20% rollout
- Day 3 (kalau stable): 50%
- Day 7 (kalau stable): 100%

---

## Contact

- Mobile team: Ari (arichrst@ide.asia)
- BE team: IDEA dev (ping via ECC repo)
- Ref sprints: `docs/sprint-plan-2026-q3.md`

---

*Doc versi: 1.0 — 2026-08-03. Update sesuai findings smoke test.*
