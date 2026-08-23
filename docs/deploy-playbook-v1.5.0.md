# Deploy Playbook v1.5.0 — Play Store + App Store

**Owner:** Ari
**Date:** 2026-08-03
**Version:** 1.5.0 (bundle Sprint 1-5 code-complete)
**Target:** Play Store production + Apple App Store production
**Ref:**
- `docs/sprint-plan-2026-q3.md` — semua sprint code complete
- `docs/smoke-test-playbook.md` — validate sebelum production
- `playstore-assets/` — icon, feature graphic, store listing copy, T&C, Privacy

---

## Version Strategy

Bundle **semua sprint code-complete** ke 1 first release **v1.5.0**:

| Sprint | Fitur | Included |
|---|---|---|
| S1 | Play Store baseline (face removal, homecell, pull-to-refresh) | ✅ |
| S2 | Magic Link email login + Onboarding wizard | ✅ |
| S3 | Group feature (browse, join, PIC actions) | ✅ |
| S4 | Kids Bundle (checkout scan, pickup code, walk-in) | ✅ |
| S5 | CKids Tab (parent view — balance, katalog, QR anak) | ✅ |

**Rationale:**
- Semua fitur sudah code-complete + BE integration aligned
- 1 rilis lebih efisien vs 5 rilis sequential (5x Play Store review, 5x App Store review)
- Untuk App Store, first-time submission butuh review ~2-7 hari
- Play Store staged rollout 20/50/100% masih ada untuk safety

**Alternative kalau mau safer:**
- Release ke Internal testing dulu (bukan Production)
- 1 minggu Internal testing → validate no crash
- Promote ke Production 20% → 50% → 100%

---

## Prerequisites

### 1. Accounts + Access

**Play Store (Android):**
- ✅ Google Play Console account (biasanya sudah setup organisasi ECC)
- ✅ App entry created (kalau belum, create via Console)
- ✅ EAS account `arichrst92` connected
- ✅ Package name `idea.eccchurch.global` registered

**App Store (iOS):**
- ❓ **Apple Developer Program** membership ($99/year)
  - Register: https://developer.apple.com/programs/enroll/
  - Butuh 1-3 hari verify (individual) atau 1-4 minggu (organization + D-U-N-S)
  - Tanpa ini, TIDAK BISA deploy ke App Store
- ❓ App Store Connect app entry created
- ❓ Bundle identifier `idea.eccchurch.global` registered di Apple Developer
- ❓ EAS credentials iOS setup (butuh Apple ID + password + team ID)

**⚠️ BLOCKER kalau Apple Developer belum siap:**
- Deploy ke Play Store dulu (v1.5.0 Android)
- Apple Developer register paralel (1-4 minggu)
- App Store deploy setelah membership aktif

### 2. Files & Assets

Semua sudah ada di `playstore-assets/`:
- ✅ `store-listing-copy.md` — description ID + EN
- ✅ `release-v1.5.0.md` — release notes (short 500 char + extended 4000 char, bilingual)
- ✅ `play-icon-512.png` — hi-res icon (Play Store butuh 512×512)
- ✅ `play-feature-graphic-1024x500.png` — Play Store feature graphic

Legal URLs LIVE public (2026-08-23):
- ✅ Privacy Policy: **https://eccchurch.global/privacy**
- ✅ Terms & Conditions: **https://eccchurch.global/terms**

**Belum ada (kalau iOS):**
- ❌ Screenshots iPhone 6.7" (mandatory) + iPad 12.9" (kalau supports tablet)
- ❌ App Store Icon 1024×1024 (bisa reuse dari 512×512 upscaled)
- ❌ App Preview video (optional tapi nice)

### 3. Code Prep

- ✅ Version bumped ke 1.5.0 di `app.json`
- ✅ iOS Info.plist configured (CameraUsage + CFBundleURLTypes)
- ✅ Android intentFilter configured (ecc://auth)
- ✅ Semua Sprint 2-5 code committed
- ⏳ Push git ke `origin/main`
- ⏳ `npx expo prebuild --clean` (regenerate native folders)

---

## Phase 1 — Play Store Deploy (Android)

### Step 1.1 — Prep (di Mac)

```bash
cd ~/Projects/ecc-mobile-app
git push origin main
cd app
npm install
npx expo prebuild --clean       # regenerate ios/ + android/ folders
npx tsc --noEmit                # verify typecheck clean
```

### Step 1.2 — Build production AAB

```bash
eas build --profile production --platform android
```

- Waktu build: ~15-20 menit di EAS cloud
- Auto-increment versionCode
- Sign dgn keystore EAS-managed
- Download AAB dari email atau https://expo.dev/accounts/arichrst92/projects

### Step 1.3 — Legal URLs (LIVE 2026-08-23) ✅

Public URLs sudah di-host di website eccchurch.global:

- **Privacy Policy:** https://eccchurch.global/privacy
- **Terms & Conditions:** https://eccchurch.global/terms

Verify accessible dari incognito browser sebelum submit ke Play Console + App Store Connect.

### Step 1.4 — Play Console setup

1. Login https://play.google.com/console
2. Buka app "Els App" (kalau belum, create baru dgn package `idea.eccchurch.global`)
3. **Store listing:**
   - Short description + Full description → paste dari `playstore-assets/store-listing-copy.md` (ID + EN per lang tab)
   - Icon 512×512 → upload `playstore-assets/icon-512.png`
   - Feature graphic 1024×500 → upload
   - Screenshots (min 2, recommended 4-8) → capture dari APK preview
4. **App content:**
   - Privacy Policy URL → paste dari Step 1.3
   - Data Safety form → fill (data yg dikumpul: name, email, phone, location approx, camera, dll)
   - Content rating questionnaire → complete (dewasa/anak, gambling, dll)
   - Target audience → Everyone atau 13+
5. **Testing → Internal testing:**
   - Create new release
   - Upload AAB dari Step 1.2
   - Release name: `1.5.0 (10) — First Launch (bundle S1-S5)`
   - Release notes: dari `playstore-assets/release-v1.5.0.md` (create baru dgn extended notes)
   - Add testers (email tim ECC)
   - Save + Review + Start rollout
6. Wait approval 1-3 jam (Internal biasanya cepat)

### Step 1.5 — Internal testing (1-2 minggu)

- Test end-to-end via `docs/smoke-test-playbook.md`
- Monitor Play Console → Statistics + Vitals
- Crash rate < 2%, ANR < 0.5%

### Step 1.6 — Promote ke Production

1. Play Console → Testing → Internal testing → Promote to Production
2. Release notes sama
3. **Staged rollout** — MULAI 20%
4. Day 3 kalau stable → 50%
5. Day 7 kalau stable → 100%

**Rollback strategy:**
- Kalau crash rate > 2%: halt rollout via Play Console
- Fix bug → bump ke 1.5.1 → new release

---

## Phase 2 — App Store Deploy (iOS)

⚠️ **Prerequisite: Apple Developer Program membership aktif.**

### Step 2.1 — Apple Developer Setup (kalau belum)

1. Register https://developer.apple.com/programs/enroll/
2. Pilih Individual ($99/year) atau Organization (butuh D-U-N-S)
3. Wait verify (1-3 hari individu, 1-4 minggu org)
4. Once approved, login App Store Connect → Users → invite tim member kalau perlu

### Step 2.2 — App Store Connect setup

1. Login https://appstoreconnect.apple.com
2. My Apps → **+** → New App
3. Fill:
   - **Platform:** iOS
   - **Name:** Els App
   - **Primary Language:** Indonesian (or English — pilih 1)
   - **Bundle ID:** Register new `idea.eccchurch.global` (via Apple Developer → Certificates → Identifiers → App IDs)
   - **SKU:** `ecc-els-app-ios` (internal identifier)
   - **User Access:** Full Access
4. Save

### Step 2.3 — App info di App Store Connect

- **Category:** Lifestyle (primary), Social Networking (secondary)
- **Content Rights:** No third-party rights
- **Age Rating:** 4+ (no offensive content)
- **Privacy Policy URL:** https://eccchurch.global/privacy
- **Support URL:** https://eccchurch.global (atau contact email support@eccchurch.global)

### Step 2.4 — Prep iOS Credentials di EAS

```bash
cd ~/Projects/ecc-mobile-app/app
eas credentials
# Pilih iOS → production
# EAS akan generate:
# - Distribution Certificate
# - Provisioning Profile
# - Push Notification Key (kalau nanti pakai FCM/APNs)
# Login dgn Apple ID + password (butuh 2FA code)
```

Alternative: manual upload cert di App Store Connect + config di EAS.

### Step 2.5 — Build production iOS

```bash
eas build --profile production --platform ios
```

- Waktu build: ~20-30 menit di EAS cloud
- Output `.ipa` file
- Auto-signed dgn Distribution Certificate

### Step 2.6 — Submit ke App Store Connect

**Auto submit via EAS (recommended):**

```bash
eas submit --profile production --platform ios --latest
# Butuh setup credentials Apple ID di eas.json submit section
# Atau interactive: EAS prompt Apple ID + password 2FA
```

Alternative manual:
1. Download `.ipa` dari EAS dashboard
2. Buka **Transporter** app di Mac (dari Mac App Store)
3. Login + drag `.ipa` → Deliver
4. Wait ~10-15 menit build muncul di App Store Connect → TestFlight

### Step 2.7 — TestFlight (Internal testing iOS)

1. App Store Connect → TestFlight
2. Add Internal Testers (max 100, no review needed)
3. Testers install TestFlight app + accept invite → download beta build
4. Test 1-2 minggu end-to-end

### Step 2.8 — Submit for App Store Review

1. App Store Connect → App Store tab → Version 1.5.0
2. Upload screenshots iPhone 6.7" (mandatory, 3-10 images)
3. Preview video optional
4. **Version Information:**
   - Description → paste dari store-listing-copy.md (bilingual atau primary lang)
   - Keywords (100 char)
   - Support URL + Marketing URL
5. **Build:** Pilih build dari TestFlight
6. **App Review Information:**
   - Contact: Ari nama + email + phone
   - Demo Account: kalau app butuh login → provide test credentials (mis. Ari account atau TEST-003)
   - Notes: "OTP WA login requires Indonesian phone number. For testing, use magic link email login with provided credentials."
7. **Version Release:** Automatic atau Manual
8. **Submit for Review**

Review time: **2-7 hari** typical (bisa lebih lama first time).

### Step 2.9 — Handle Review Feedback

Common rejection reasons + fixes:
- **4.2 Minimum Functionality:** app too thin → tampilkan value proposition di description
- **5.1.1 Privacy:** privacy policy incomplete → update
- **2.1 App Completeness:** crash / demo credentials tidak work → fix + resubmit
- **Guideline 4.5:** app harus lebih dari sekedar wrapper website → highlight native features (camera scan, offline Alkitab)

Kalau reject, address feedback → resubmit (24 jam wait antar submit).

### Step 2.10 — Live di App Store

Setelah approved:
- Automatic release: langsung live
- Manual release: Ari klik "Release This Version"
- Available di App Store worldwide dalam 24 jam

---

## Phase 3 — Post-Launch (both platforms)

### Monitoring

**Play Console:**
- Statistics → Install count, DAU, retention
- Quality → Android vitals (crash, ANR, wake locks)
- Ratings & Reviews → respond to feedback

**App Store Connect:**
- Analytics → Install count, DAU, retention
- Metrics → Crashes, sessions, engagement
- Ratings & Reviews → respond to feedback

**Sentry / Error tracking:**
- Kalau Sentry configured (per `src/services/errorReporting.ts`) → monitor error dashboard

### Hotfix Release (kalau ada bug critical)

```bash
# Bump version → 1.5.1
# Fix bug, commit push
cd app
eas build --profile production --platform all   # Android + iOS parallel
# Submit ke Play Console (Internal → Production) + App Store Connect (TestFlight → Review)
```

- Play Store: promote via staged rollout, ~1-2 hari
- App Store: butuh review ulang ~1-2 hari (biasanya lebih cepat untuk hotfix vs first launch)

### Version Roadmap

| Version | ETA | Content |
|---|---|---|
| **1.5.0** | Aug 2026 | First launch (S1-S5 bundle) |
| **1.5.1** | +1 minggu | Bug fixes dari smoke test |
| **1.6.0** | Sep-Oct 2026 | Backlog features (family granular UI, ministry attendance, dll) |
| **2.0.0** | Q4 2026 | Major redesign atau new module besar |

---

## Timeline Estimate

**Scenario A — Play Store first, App Store paralel:**

| Week | Action |
|---|---|
| Week 1 | Play Store: build + submit + Internal testing 1 minggu |
| Week 1-4 | App Store: Apple Developer register (kalau belum) + credentials setup |
| Week 2 | Play Store: promote ke Production staged rollout |
| Week 4 | App Store: build + TestFlight + submit review |
| Week 5-6 | App Store: review + live |

**Scenario B — Both parallel (kalau Apple Developer sudah aktif):**

| Week | Action |
|---|---|
| Week 1 | Both: build production Android + iOS bareng |
| Week 1 | Android: Internal testing 3-5 hari |
| Week 1-2 | iOS: TestFlight 3-5 hari, submit for review |
| Week 2 | Android: promote Production staged rollout |
| Week 2-3 | iOS: review + live |
| Week 4 | Both: 100% rollout |

---

## Confirmation Ari sebelum lanjut

1. ✅ Apakah Apple Developer Program membership aktif? Kalau BELUM, deploy Android dulu, register Apple paralel.
2. ✅ Apakah Privacy Policy URL sudah live public? Kalau belum, host dulu (Play Store + App Store keduanya butuh).
3. ✅ Screenshots ready? Kalau tidak, capture dari APK preview (min 4 layar: Welcome, Home, Ibadah, CKids/Group).
4. ✅ Bundle semua sprint (1.5.0) atau sequential release (1.1 → 1.5)? Recommendation: 1.5.0 bundle.

---

## Quick Commands Reference

```bash
# Prep
cd ~/Projects/ecc-mobile-app && git push origin main
cd app
npm install
npx expo prebuild --clean
npx tsc --noEmit

# Build production
eas build --profile production --platform android    # ~15-20 min
eas build --profile production --platform ios         # ~20-30 min
eas build --profile production --platform all         # parallel both

# Submit (kalau eas.json submit config ready)
eas submit --profile production --platform android --latest
eas submit --profile production --platform ios --latest

# Monitor
open https://expo.dev/accounts/arichrst92/projects
open https://play.google.com/console
open https://appstoreconnect.apple.com

# Sentry / errors (kalau configured)
open https://sentry.io
```

---

## Contact + Escalation

- **Mobile team:** Ari (arichrst@ide.asia)
- **BE support:** IDEA dev (ping via ECC repo issue)
- **Play Store issue:** support@google.com
- **App Store issue:** developer.apple.com/contact

---

*Doc versi: 1.0 — 2026-08-03. Update sesuai actual deploy progress.*
