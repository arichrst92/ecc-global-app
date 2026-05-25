# Els App — Google Play Store Deployment Guide

**Package name:** `idea.eccchurch.global`
**EAS project:** `936cd3ec-baf0-4b3a-9635-64d7b2167af6`
**Current version:** `0.1.0` (perlu bump ke `1.0.0` untuk first release)
**Date:** 2026-05-24

Guide ini fokus untuk **first release** ke Play Store. Untuk update berikutnya, skip ke section "Update Berikutnya" di bawah.

---

## Phase 0 — Pre-flight (1-2 jam)

### 0.1 Bump version ke 1.0.0

Edit `app/app.json`:
```diff
- "version": "0.1.0",
+ "version": "1.0.0",
```

`versionCode` (Android internal build number) di-handle otomatis oleh EAS karena `eas.json` production profile punya `"autoIncrement": true` + `appVersionSource: "remote"` (versionCode disimpan di EAS server, auto-bump tiap build production).

### 0.2 Privacy Policy URL publicly accessible

Play Store **require** Privacy Policy URL yang bisa di-akses publik (bukan in-app saja). Mobile app sudah punya `/legal/privacy` screen yang fetch dari BE `/public/legal/PRIVACY`.

**Wajib siapkan URL publik:**
- Opsi A: Host di website ECC, mis. `https://eccchurch.global/privacy-policy`
- Opsi B: Pakai endpoint BE langsung kalau public-accessible, mis. `https://api.eccchurch.global/public/legal/PRIVACY/raw` (perlu BE expose plain HTML render)
- Opsi C (paling cepat): Buat GitHub Pages atau Notion public page dengan content yang sama dengan `legal/PRIVACY` BE doc.

Catat URL ini — akan dipakai di Play Console + di "Data Safety" form.

### 0.3 Assets — verify lengkap

| Asset | Path | Spec Play Store |
|---|---|---|
| App icon | `app/assets/images/ecc-icon.png` (883x883) | 512×512 PNG (hi-res icon — auto-resize) |
| Adaptive icon foreground | `app/assets/images/ecc-icon-adaptive.png` (1024x1024) | sudah safe-zone aware ✓ |
| Feature graphic | **belum ada** | 1024×500 PNG/JPG (banner di Play Store top) |
| Screenshots | **belum ada** | 2-8 screenshots, phone: 1080×1920 or similar 9:16 |

**Action items:**
1. Capture 4-8 screenshots dari APK preview build:
   - Welcome screen
   - Dashboard (Ibadah Hari Ini + Quick Access)
   - Event list
   - Renungan / News
   - Ministry detail
   - Profile / QR card
   - Calendar
   - Guest mode home
2. Create feature graphic 1024×500 — bisa simple: logo Els App + tagline "Elshaddai Creative Community" dengan background brand orange.
3. Hi-res icon 512×512 — resize `ecc-icon.png` via Photopea atau:
   ```bash
   cd ~/Projects/ecc-mobile-app/app/assets/images
   python3 -c "from PIL import Image; Image.open('ecc-icon.png').resize((512,512), Image.LANCZOS).save('ecc-icon-playstore-512.png')"
   ```

### 0.4 Pastikan flow critical jalan di production build

Test APK preview (yang sudah di-build) untuk:
- ✅ Sign-up dengan OTP
- ✅ Login OTP
- ✅ Face enroll → login face
- ✅ Guest mode → browse events/news
- ✅ T&C + Privacy links di Welcome
- ✅ QR code show + check-in
- ✅ Ibadah online stream link
- ✅ Event RSVP + payment flow
- ✅ Profile edit

Catat bugs kalau ada → fix sebelum production build.

---

## Phase 1 — Build Production AAB (~20 menit)

### 1.1 Commit semua perubahan
```bash
cd ~/Projects/ecc-mobile-app
git status  # pastikan clean
git push origin main
```

### 1.2 Trigger production build (output: AAB untuk Play Store)
```bash
cd ~/Projects/ecc-mobile-app/app
eas build --profile production --platform android
```

Build di EAS cloud ~15-20 menit. Output: `.aab` file (Android App Bundle — format yang Play Store butuh, bukan `.apk`).

Monitor di https://expo.dev/accounts/arichrst92/projects → pilih project Els App → tab "Builds".

### 1.3 Download AAB

Saat build selesai:
- Terminal kasih URL download
- Atau klik dari Expo dashboard
- Save sebagai `els-app-v1.0.0.aab` di komputer

---

## Phase 2 — Setup Google Play Console (~1-2 jam first time)

### 2.1 Buat App baru di Play Console

1. Login ke https://play.google.com/console
2. Click **"Create app"**
3. Fill:
   - **App name:** `Els App`
   - **Default language:** English (US) — atau Indonesian kalau target utama ID
   - **App or game:** App
   - **Free or paid:** Free
   - Centang 2 declarations (developer program policies + US export laws)
4. Klik "Create app"

### 2.2 Set up store listing

Sidebar → **Main store listing**:
- **App name:** `Els App`
- **Short description (max 80 char):**
  ```
  Aplikasi resmi Elshaddai Creative Community (ECC) — ibadah, event, komunitas.
  ```
  (English version: `Official Elshaddai Creative Community (ECC) app — services, events, community.`)
- **Full description (max 4000 char):** tulis 2-3 paragraf cover:
  - Apa itu ECC + fungsi app (ibadah info, event RSVP, giving, komunitas)
  - Key features (Face login, QR check-in, real-time event updates, bilingual ID/EN, multi-cabang support)
  - Untuk siapa (jemaat ECC, calon jemaat, tamu yang mau cari tahu)
- **App icon:** upload `ecc-icon-playstore-512.png` (512×512)
- **Feature graphic:** upload 1024×500 banner
- **Phone screenshots:** upload 4-8 (minimum 2)

### 2.3 Set up Privacy Policy

Sidebar → **App content** → **Privacy policy**:
- Paste URL publik yang disiapkan di step 0.2
- Save

### 2.4 Data Safety form (penting!)

Sidebar → **App content** → **Data safety** — fill form dengan jujur. Berdasarkan codebase ECC App:

| Data Type | Collected? | Shared? | Purpose | Optional? |
|---|---|---|---|---|
| Phone number | Yes | No | Account management, customer support | No (required) |
| Name | Yes | No | Account management | No |
| Email | Yes (kalau user input) | No | Account management | Yes |
| Photos | Yes (foto profil + face) | No | App functionality (face login, profile) | Yes |
| Face biometric (descriptor) | Yes | No | Authentication | Yes (alternative: OTP) |
| App interactions (analytics) | Yes (face telemetry) | No | Analytics, app functionality | No |
| Crash logs | Yes (error reporting) | No | Diagnostics | No |
| Approximate location (cabang) | No | - | - | - |
| Precise location | No | - | - | - |

**Security practices:**
- ✅ Data is encrypted in transit (HTTPS)
- ✅ Users can request data deletion (in-app: Settings → Delete Account)
- ✅ Independent security review? — No (kecuali ECC pernah audit)

### 2.5 Content rating

Sidebar → **App content** → **Content rating** → questionnaire:
- Category: **Reference, News, or Educational** (atau "Social")
- Most questions answer **No** (no violence, no sexual content, no gambling)
- Submit untuk dapat rating IARC (typically "Everyone" untuk app gereja)

### 2.6 Target audience

Sidebar → **App content** → **Target audience and content**:
- Target age groups: **18 and over** (atau "13-17, 18 and over" kalau mau include youth)
- App appeal to children: **No**

### 2.7 App access

Sidebar → **App content** → **App access**:
- **All functionality is available without special access** → biasanya pilih ini
- **Some functionality requires login** → kalau benar, pilih ini dan provide test credentials untuk Google reviewer:
  - Test phone: kasih nomor yang sudah terdaftar di BE
  - Instructions: "Use OTP login, code akan dikirim ke nomor di atas"

**Important:** Reviewer biasanya akan test app — pastikan test account works.

### 2.8 News app declaration

Sidebar → **App content** → **News app**:
- Apakah Els App "news app"? — Tergantung interpretasi. Konservatif pilih **No** (renungan + news cabang bukan general news outlet).

### 2.9 Ads declaration

**App contains ads:** No (kecuali ada ads — saat ini tidak ada)

### 2.10 Government apps / financial apps

- Government app: No
- Financial features: Yes (giving / donasi event NOMINAL_TETAP & BEBAS). Belum perlu spesial declaration kecuali handle credit card directly (kita pakai bank transfer / QRIS, jadi mostly OK). Read Google policy untuk financial services kalau ragu.

### 2.11 Health declaration

- Health-related: No

---

## Phase 3 — Upload First Build (~30 menit)

### 3.1 Pilih track

**Recommended: Start with Internal testing** (paling cepat, paling aman, no review delay):
- Internal testing → up to 100 testers, instant rollout, ada review tapi cepat (jam-an, kadang langsung)
- Closed testing → review 1-3 hari, butuh email list
- Open testing → public beta, review beberapa hari
- Production → semua orang bisa download

**Strategy untuk first release:**
1. Internal testing dulu → invite tim ECC (5-10 orang) → test 1-2 minggu
2. Setelah confident → promote ke Production (atau langsung ke Production kalau yakin)

### 3.2 Set up Internal testing

Sidebar → **Testing** → **Internal testing**:

1. **Testers** tab:
   - Create email list, mis. "ECC Internal Testers"
   - Tambah email tester (tim Ari, BE team, dll)
   - Copy "Opt-in URL" — kirim ke tester supaya mereka opt-in (sekali doang)

2. **Create new release** tab:
   - Upload AAB file (`els-app-v1.0.0.aab`)
   - Release name: auto-filled dari versionCode (mis. "1 (1.0.0)")
   - Release notes (ID + EN):
     ```
     Release pertama Els App!

     Fitur:
     • Ibadah info + check-in QR
     • Event RSVP + giving online
     • Face Login untuk akses cepat
     • Renungan + berita gereja
     • Mode tamu untuk browsing
     • Bilingual Indonesian / English
     ```
   - Save → Review release → **Start rollout to Internal testing**

### 3.3 Wait review

Google review Internal testing tracks biasanya **cepat (jam-an)**. Email notification saat approved.

Setelah approved:
- Tester install via Play Store link (dari Opt-in URL) → install Els App seperti normal
- Update otomatis kalau ada release baru

### 3.4 Test thoroughly di Internal testing

Minta tester:
- Run through critical flows (signup, login, event RSVP, dll)
- Test di berbagai device Android (versi 10/11/12/13/14)
- Report bugs

Kalau ada bug critical → fix di mobile → rebuild AAB → upload new release ke Internal testing.

---

## Phase 4 — Promote ke Production (~1 jam + 1-3 hari review)

Setelah Internal testing stable:

### 4.1 Buat release Production

Sidebar → **Production** → **Create new release**:
- **Reuse build dari Internal testing** (klik "Promote release" dari sidebar Internal testing) — atau upload AAB ulang
- Release notes (final, akan visible di Play Store)
- **Countries / regions:** pilih countries target (recommend: Indonesia + worldwide kalau mau scope luas)
- **Rollout percentage:** start dengan 20-50% — bukan 100% — supaya kalau ada bug critical bisa halt rollout. Bisa di-bump ke 100% setelah beberapa hari stable.

### 4.2 Submit review

Klik **Send for review**. First review biasanya **1-7 hari** (paling sering 1-3 hari). Subsequent reviews lebih cepat.

Google akan email kalau:
- Approved → app published, mulai rollout
- Rejected → ada masalah (privacy policy, content, permissions, dll) → fix + resubmit

### 4.3 Monitor rollout

Sidebar → **Statistics** + **Production overview**:
- Install count
- Crash rate (target <2%)
- ANR rate (target <0.5%)
- User reviews

**Pre-launch report** (auto di Play Console) — Google jalanin app di emulator + flag issues (crashes, security warnings, accessibility). Cek + fix sebelum rollout 100%.

---

## Update Berikutnya (Phase 5 — Recurring)

Untuk release update setelah first launch:

1. **Bump version di `app.json`** (mis. 1.0.0 → 1.0.1 untuk bugfix, 1.1.0 untuk feature, 2.0.0 untuk major).
2. `git commit + push`.
3. Build:
   ```bash
   cd ~/Projects/ecc-mobile-app/app
   eas build --profile production --platform android
   ```
4. Download AAB.
5. Upload ke Play Console → **Production** → Create new release → Upload AAB → Release notes → Start rollout.
6. Review ~1-2 hari.

**Tips:**
- Pakai **Internal testing** dulu sebelum push ke Production untuk update major.
- Staged rollout: start 20% → 50% → 100% over 1 minggu untuk catch issue early.
- Release notes selalu sertakan ID + EN — paste dengan format:
  ```
  Indonesia:
  • <changes>

  English:
  • <changes>
  ```

---

## Catatan Penting

### EAS Submit (opsional shortcut)

Daripada manual upload AAB ke Play Console, bisa pakai `eas submit`:

```bash
# Setup sekali — generate service account key di Google Cloud Console, link ke Play Console
eas submit --profile production --platform android
```

Setup detail: https://docs.expo.dev/submit/android/

Skip ini kalau prefer manual upload (recommended first time untuk visibility).

### Common pitfalls

1. **Privacy Policy URL down** → Play review reject. Pastikan URL stable.
2. **Test credentials expired** → reviewer tidak bisa login → reject. Pastikan test phone valid.
3. **Camera permission tanpa justifikasi** → reviewer tanya use case → siapkan jawaban (face login + QR scan + foto profil).
4. **64-bit requirement** → EAS build default include 64-bit, no issue.
5. **Target API level** — Expo SDK 54 sudah target API 35 (Android 15), Play Store require API 34+ saat ini. ✓
6. **App Bundle harus signed** — EAS signing handle otomatis. Pastikan keystore EAS-managed (default) — jangan generate manual kecuali tahu yang dilakukan.

### Kalau mau pakai upload key sendiri

EAS default manage signing keystore. Kalau mau export untuk backup (recommended):

```bash
cd ~/Projects/ecc-mobile-app/app
eas credentials -p android
# Pilih: production → Keystore: Manage everything → Download credentials
```

Save keystore file aman + jangan commit ke git (sudah di-gitignore default).

### Rollback strategy

Kalau release critical bug:
- Play Console → Production → **Halt rollout** (kalau staged rollout < 100%)
- Build hotfix dengan version bump (1.0.1) → upload new release → start rollout cepat
- Tidak ada "downgrade" — semua user harus upgrade ke version baru

---

## Quick Reference

**Build production AAB:**
```bash
cd ~/Projects/ecc-mobile-app/app && eas build --profile production --platform android
```

**Submit via EAS (skip manual upload):**
```bash
cd ~/Projects/ecc-mobile-app/app && eas submit --profile production --platform android
```

**Play Console:** https://play.google.com/console
**Expo dashboard:** https://expo.dev/accounts/arichrst92/projects

**Support:**
- Play Console help: https://support.google.com/googleplay/android-developer
- EAS Build docs: https://docs.expo.dev/build/introduction/
- EAS Submit docs: https://docs.expo.dev/submit/android/
