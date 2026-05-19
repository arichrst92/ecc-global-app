# Screen Inventory (dari Mockup)

38 screens di mockup, dikelompokkan berdasarkan flow. Saat scaffold Expo app, gunakan grouping ini sebagai struktur folder di `app/`.

## (auth) — sebelum login

| Screen | Mockup ID | Path Expo (suggested) | Catatan |
|---|---|---|---|
| Splash | `splash` | `(auth)/splash.tsx` | Auto-advance ke onboarding |
| Onboarding | `onboarding` | `(auth)/onboarding.tsx` | 3 slides, skip-able |
| Welcome | `welcome` | `(auth)/welcome.tsx` | 4 paths: OTP, Face, Sign Up, Guest |
| Login Phone | `login-phone` | `(auth)/login.tsx` | Input no HP, normalize ke E.164 |
| Login OTP | `login-otp` | `(auth)/otp.tsx` | 6 input boxes, cooldown timer |
| Face Login | `face-login` | `(auth)/face-login.tsx` | Camera oval, descriptor 128-dim |
| Sign Up Phone | `sign-up-phone` | `(auth)/signup/index.tsx` | Step 1/3 |
| Sign Up OTP | `sign-up-otp` | `(auth)/signup/otp.tsx` | Step 2/3 (purpose=ENROLLMENT) |
| Sign Up Data | `sign-up-data` | `(auth)/signup/data.tsx` | Step 3/3 — nama, tgl lahir, cabang, dll |
| Sign Up Success | `sign-up-success` | `(auth)/signup/success.tsx` | Show kode jemaat baru |

## (tabs) — main navigation

| Screen | Mockup ID | Path | Catatan |
|---|---|---|---|
| Home | `home` | `(tabs)/index.tsx` | Variant untuk guest |
| Ibadah List | `ibadah-list` | `(tabs)/ibadah.tsx` | Grouped by date |
| Event List | `event-list` | `(tabs)/event.tsx` | Filter chips |
| Persembahan List | `persembahan-list` | `(tabs)/persembahan.tsx` | 4 rekening |
| Profile | `profile` | `(tabs)/profile.tsx` | Family, role cards, settings |

## Ibadah flow

| Screen | Mockup ID | Path |
|---|---|---|
| Ibadah Detail | `ibadah-detail` | `ibadah/[id].tsx` |
| Reserve (w/ family selector) | `ibadah-reserve` | `ibadah/[id]/reserve.tsx` |
| QR Card (carousel) | `qr-card` | `qr-card.tsx` (modal route) |

## Event flow

| Screen | Mockup ID | Path |
|---|---|---|
| Event Detail | `event-detail` | `event/[id].tsx` |
| Event Daftar (w/ family selector) | `event-daftar` | `event/[id]/register.tsx` |
| Event Bayar | `event-bayar` | `event/[id]/payment.tsx` |

## Content

| Screen | Mockup ID | Path |
|---|---|---|
| News List | `news-list` | `news/index.tsx` (tab: news/renungan) |
| News Detail | `news-detail` | `news/[slug].tsx` |
| Renungan Detail | `renungan-detail` | `renungan/[slug].tsx` |

## Persembahan

| Screen | Mockup ID | Path |
|---|---|---|
| Persembahan Detail | `persembahan-detail` | `persembahan/[rekeningId].tsx` |

## Family

| Screen | Mockup ID | Path |
|---|---|---|
| Family List | `family-list` | `family/index.tsx` |
| Family Add | `family-add` | `family/add.tsx` |
| Family Register New | `family-register` | `family/register-new.tsx` |

## Settings / Profile sub-screens

| Screen | Mockup ID | Path |
|---|---|---|
| Notifications | `notifications` | `notifications.tsx` |
| Change Branch | `change-branch` | `settings/change-branch.tsx` |
| Printer Settings | `printer-settings` | `settings/printer.tsx` |

## Scanner & Homecell (volunteer / PIC)

| Screen | Mockup ID | Path | Access |
|---|---|---|---|
| Scanner Volunteer | `scanner` | `scanner.tsx` | From Ibadah/Event Detail when authorized |
| PIC Homecell Detail | `homecell-pic-detail` | `homecell/index.tsx` | Profile menu (role=pic-homecell) |
| Add Member by QR | `homecell-add-member` | `homecell/add-member.tsx` | From PIC Homecell |
| PIC Area List | `homecell-area-list` | `area/index.tsx` | Profile menu (role=pic-area) |
| PIC Area Detail | `homecell-area-detail` | `area/[id].tsx` | From Area list |

## Bible

| Screen | Mockup ID | Path |
|---|---|---|
| Bible Home (browse) | `bible-home` | `bible/index.tsx` |
| Bible Chapter Read | `bible-chapter` | `bible/[book]/[chapter].tsx` |
