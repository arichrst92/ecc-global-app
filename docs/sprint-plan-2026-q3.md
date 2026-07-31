# Mobile Sprint Plan — Q3 2026

**Owner:** Ari
**Date:** 2026-07-31
**Scope:** Sprints v1.1 → v1.3 dari Els App mobile
**Related BE notices:**
- `backend-notice-shiftsoft-migration.md` — data migration 6782 jemaat + 314 group
- `backend-notice-magic-link-email-login.md` — magic link + onboarding wizard
- `backend-notice-group-endpoints.md` — 12 endpoint Group ready

---

## Overview

BE deployed 3 major batches 2026-07-29. Mobile roadmap dibagi 3 sprint incremental. Sprint 1 sudah 90% done (Play Store ready). Sprint 2 unblocks 6736 legacy jemaat (highest business priority). Sprint 3 new discovery feature.

| Sprint | Version | Theme | Duration | Priority |
|---|---|---|---|---|
| **S1** | v1.1.0 | Play Store first release | ~1 minggu (mostly done) | 🔴 Critical |
| **S2** | v1.2.0 | Magic Link + Onboarding | ~2 minggu | 🔴 Critical |
| **S3** | v1.3.0 | Group Feature | ~2 minggu | 🟡 High |
| **Backlog** | v1.4+ | Profile enhancements + push | TBD | 🟢 Medium |

---

## 🚀 Sprint 1 — v1.1.0 Play Store First Release

**Goal:** Rilis APK v1.1.0 ke Play Store production. Sudah stable, tanpa face login, dengan homecell schedule feature complete.

**Status:** ~90% done. Blocking items sisa: hosting Privacy Policy URL + build production AAB + Play Console setup.

### User Stories

| ID | Story | Points |
|---|---|---|
| S1.1 | As jemaat, aku bisa download Els App v1.0 dari Play Store | 3 |
| S1.2 | As jemaat, aku login pakai OTP WhatsApp tanpa dipaksa face login | 2 |
| S1.3 | As PIC homecell, aku bisa create jadwal pertemuan + scan QR member untuk absensi | 5 |
| S1.4 | As jemaat, aku bisa pull-to-refresh halaman profile | 1 |
| S1.5 | As user, aku bisa akses T&C + Privacy Policy dari Welcome screen | 2 |

### Task Breakdown (remaining)

- [x] Face login removal Phase 1 + Phase 2 (M33) — commit merged
- [x] Homecell schedule + attendance feature (M32) — commit merged
- [x] Pull-to-refresh profile — commit merged
- [x] Tabular schedule list — commit merged
- [x] FAB safe area fix — commit merged
- [x] Store listing copy (ID + EN)
- [x] Play Store deploy guide
- [x] Privacy Policy + T&C markdown
- [x] Icon 512 + Feature graphic 1024×500
- [x] Release notes v1.0.0
- [x] Keystore backup (Ari's local)
- [ ] **Host Privacy Policy URL public** (options: GitHub Pages / eccchurch.global / BE endpoint)
- [ ] `npm install` + `expo prebuild --clean` di Mac (setelah Phase 2 deps removal)
- [ ] Smoke test build local
- [ ] `eas build --profile production --platform android` → download AAB
- [ ] Play Console setup: create app, categorization, screenshots upload, Data Safety form, content rating
- [ ] Upload AAB ke Internal testing track
- [ ] Invite 5-10 tim ECC ke Internal testing
- [ ] Test 1-2 minggu di Internal
- [ ] Promote ke Production dengan staged rollout 20% → 50% → 100%

### Dependencies

- Privacy Policy URL harus live sebelum Play Console submission
- Native prebuild harus clean sebelum production build
- Screenshots harus real device (bukan placeholder) untuk polish

### Definition of Done

- APK v1.1.0 available di Play Store Production track
- Crash rate < 2% di first 7 hari post-launch
- Stable rollout > 80% adoption dalam 2 minggu

---

## 🔐 Sprint 2 — v1.2.0 Magic Link Login + Onboarding Wizard

**Goal:** Unblock 6736 legacy jemaat yang stuck karena noHp invalid. Enable email-based login + guided profile completion.

**Business impact:** Tanpa sprint ini, mayoritas jemaat legacy (dari Shiftsoft migration) tidak bisa login → mobile app effectively unusable untuk mereka.

### User Stories

| ID | Story | Points |
|---|---|---|
| S2.1 | As legacy jemaat dengan noHp invalid, aku bisa login pakai email → dapat link → auto sign in | 8 |
| S2.2 | As new jemaat, aku bisa daftar dengan optional field email untuk backup login | 2 |
| S2.3 | As legacy jemaat first login, aku diarahkan ke wizard untuk lengkapi profile (noHp, gender, tanggal lahir) | 8 |
| S2.4 | As user, sesi login aku tahan 365 hari (tidak perlu re-login bulan-bulanan) | 1 (auto BE) |
| S2.5 | As user, aku bisa lihat + update email di profile edit screen | 2 |

### Task Breakdown

**Phase 2A — Magic Link Email Login (~1 minggu)** — ✅ **CODE COMPLETE 2026-07-31 (M36)**

- [x] Types: `RequestMagicLinkPayload`, `VerifyMagicLinkPayload`, `CompleteOnboardingPayload` — di `src/types/auth.ts`
- [x] Types: User + `email`, `needsOnboarding`, `onboardingReason` — di `src/types/api.ts`
- [x] OtpPurpose enum: add `'ONBOARDING_ADD_NOHP'`
- [x] API client: `requestMagicLink`, `verifyMagicLink`, `resendMagicLink`, `completeOnboarding` di `src/api/auth.ts`
- [x] Auth route helper: `src/utils/auth-route.ts` — `getPostLoginRoute(user)` returns '/(auth)/onboarding' or '/(tabs)'
- [x] Welcome screen — tambah "Masuk dengan Email" button (di primary options)
- [x] New screen: `app/(auth)/login/email.tsx` — input email form + submit + "Cek inbox" sent state + Kirim Ulang cooldown 60s + rate limit copy
- [x] Deeplink handler: `app/auth/email/verify.tsx` — auto-consume token param, verify → login → route ke onboarding/tabs
- [x] `app.json` intentFilter Android untuk `ecc://auth/*` (iOS auto dari scheme "ecc")
- [x] Auth guard whitelist `segments[0]==='auth'` di root layout untuk deeplink pass-through
- [x] i18n keys `auth.email.*` — ID + EN (30+ keys per language)
- [x] Typecheck clean (npx tsc --noEmit)
- [ ] **NEXT:** Prebuild + smoke test build APK preview di Mac (`expo prebuild --clean` + EAS preview build)
- [ ] **NEXT:** End-to-end testing dgn email jemaat legacy staging (request → cek inbox → klik link → verify → login)

**Phase 2B — Onboarding Wizard (~1 minggu)** — ✅ **CODE COMPLETE 2026-07-31 (M37)**

- [x] Store: `src/stores/onboarding.store.ts` — step state machine + draft fields + hydrateFromUser
- [x] API: `requestOtpAddNoHp` + `verifyOtpAddNoHp` — extend OTP endpoints for purpose ONBOARDING_ADD_NOHP (verify uses Bearer JWT)
- [x] Wizard screen: `app/(auth)/onboarding/index.tsx` — 4 sub-step state machine (intro → add-phone-input → add-phone-otp → profile)
  - IntroStep: preview steps count berdasarkan missingNoHp + missingProfile.length
  - AddPhoneInputStep: PhoneInput + submit OTP request + handle 409 CONFLICT copy
  - AddPhoneOtpStep: OtpInput + verify with Bearer JWT + resend cooldown 60s
  - ProfileStep: TextField + SegmentedControl gender + inline DatePickerModal + Picker cabang + optional email
- [x] Skip logic: kalau `onboardingReason.missingNoHp === false` → langsung intro → profile (skip 2 phone step)
- [x] Post-submit: update auth store user (clear needsOnboarding, merge fields), invalidate `['me']` queries, reset wizard state, route ke /(tabs)
- [x] Auth guard update: force authed+needsOnboarding user ke onboarding route + whitelist onboarding dari auto-redirect ke tabs
- [x] i18n keys `auth.onboarding.*` — ID + EN (30+ keys per language)
- [x] Typecheck clean
- [ ] **NEXT:** Prebuild + smoke test E2E (login via magic link legacy jemaat → landing di onboarding → complete wizard → landing di tabs)
- [ ] **NEXT:** Test 5 scenarios: missing noHp only, missing profile only, both missing, partial complete, already complete (skip wizard)

**Phase 2C — Ancillary Updates**

- [ ] Update `OtpPurpose` type: add `'ONBOARDING_ADD_NOHP'`
- [ ] Register form (`app/(auth)/signup/data.tsx`): tambah field email optional dengan hint "Untuk backup login pakai magic link"
- [ ] Profile edit screen: tampil + editable email field
- [ ] BE contract change acknowledged: refresh token TTL 365d (no mobile code change, just longer sessions)

### Dependencies

- Requires v1.1.0 stable di Play Store (avoid concurrent complex rollouts)
- BE endpoints already live (2026-07-29)
- SendGrid + deep link config di BE side already active

### Definition of Done

- Magic link email flow works end-to-end di Android + iOS
- Onboarding wizard complete rate > 80% untuk legacy jemaat
- Legacy jemaat (yang tidak bisa login sebelumnya) sekarang bisa login via email
- No regression di existing OTP flow

### Risks

- **Deep link handling** iOS + Android bisa flaky — allocate buffer testing
- **SendGrid deliverability** — email masuk spam? Coordinate dengan BE untuk monitor bounce rate
- **User confusion** — magic link + OTP dual path bisa bingungkan. Solve dengan UX copy jelas

---

## 👥 Sprint 3 — v1.3.0 Group Feature

**Goal:** Enable discovery + participation di 314 groups (family/ministry/community/homecell-style) yang sudah di-import dari Shiftsoft.

**Business value:** Jemaat bisa temukan komunitas relevant (family circle, ministry team, fellowship group) tanpa harus tanya admin manual. PIC bisa manage membership dari mobile.

### User Stories

| ID | Story | Points |
|---|---|---|
| S3.1 | As jemaat, aku bisa browse public groups di cabang aku, filter by jenis (family/ministry/community/homecell) | 5 |
| S3.2 | As jemaat, aku bisa join public group sekali tap tanpa approval | 2 |
| S3.3 | As jemaat, aku bisa scan QR code untuk join private group (invitation only) | 3 |
| S3.4 | As jemaat, aku bisa lihat "My Groups" tab dengan semua group yang aku ikut | 3 |
| S3.5 | As jemaat, aku bisa lihat detail group (info, members, PIC contact) | 3 |
| S3.6 | As jemaat, aku bisa leave group secara voluntary | 2 |
| S3.7 | As PIC group, aku bisa add/remove member manual + rotate joinCode + dismiss group | 5 |
| S3.8 | As PIC private group, aku bisa show QR code untuk share ke calon member | 3 |
| S3.9 | As jemaat, aku dapat notif WA saat di-add/removed dari group (BE handled) | 0 (BE done) |

### Task Breakdown

**Phase 3A — Read-only (Browse + Detail + My Groups) — ~1 minggu**

- [ ] Types: `Group`, `GroupMember`, `GroupDetail`, `GroupMembership`, enum `GroupJenis` di `src/types/group.ts`
- [ ] API client: `listGroups`, `getGroupDetail`, `getMyGroupMemberships` di `src/api/group.ts`
- [ ] Hooks: `useGroups(opts)`, `useGroupDetail(id)`, `useMyGroupMemberships()` di `src/hooks/useGroup.ts`
- [ ] Route: `app/group/index.tsx` — Browse screen dengan filter cabang + jenis + search
- [ ] `GroupCard` component (tabular row per pattern homecell schedule)
- [ ] Route: `app/group/[id].tsx` — Group Detail screen
- [ ] `MemberRow` component (reuse dari homecell kalau bisa)
- [ ] Route: `app/profile/my-groups.tsx` — "My Groups" list
- [ ] Add "Group" ke Quick Access di dashboard (kalau ada slot)
- [ ] i18n keys group (ID + EN)

**Phase 3B — Self-service actions — ~3 hari**

- [ ] Hooks: `useJoinGroup`, `useJoinGroupByCode`, `useLeaveGroup` (mutations)
- [ ] Join button di Group Detail (public group only, disabled kalau already member)
- [ ] Leave button di Group Detail (kalau already member, dengan confirm modal)
- [ ] Idempotency handling — `alreadyMember: true` show "Sudah anggota"
- [ ] QR scanner screen untuk join by code:
  - Reuse `ScannerCamera` component
  - Support 2 QR format: plain code (8-char) atau deeplink URL (`ecc://group/join?code=xxx`)
  - Extract code → `POST /admin/group/join-by-code`
- [ ] Manual input fallback screen — kalau QR rusak
- [ ] Success screen: "Berhasil bergabung ke {groupNama}" → redirect Group Detail
- [ ] Error handling: 403 (private tanpa code), 404 (invalid code), 429 (rate limit)

**Phase 3C — PIC actions — ~3 hari**

- [ ] Detect PIC role di Group Detail (`group.picJemaatId === user.jemaatId`)
- [ ] Hooks: `useAddGroupMember`, `useRemoveGroupMember`, `useRegenerateCode`, `useDismissGroup`, `useCreateGroup`, `useUpdateGroup`
- [ ] PIC action buttons di Group Detail:
  - Add Member (open jemaat picker atau QR scan jemaat)
  - Regenerate Code (dengan confirm — "Kode lama tidak bisa dipakai lagi")
  - Dismiss Group (dengan confirm modal — "Semua member akan di-notif")
- [ ] Route: `app/group/new.tsx` — Create Group wizard (4-step form)
- [ ] Route: `app/group/[id]/edit.tsx` — Edit Group form
- [ ] Route: `app/group/[id]/qr.tsx` — QR code display screen untuk PIC share invitation
- [ ] Use `react-native-qrcode-svg` (existing) untuk render QR
- [ ] Handle Public → Private toggle: show newly generated code

### Dependencies

- Requires v1.2.0 released (avoid too many concurrent updates)
- BE Group endpoints already live (2026-07-29)
- QR scanner infrastructure sudah existing (dari homecell attendance)

### Definition of Done

- All 12 BE endpoints ter-consume di mobile
- PIC bisa manage group lifecycle (create, edit, dismiss, member add/remove) dari mobile
- Non-PIC jemaat bisa discover + join public groups + scan invitation
- QR generator + scanner both work di Android + iOS
- No regression di existing homecell attendance flow

### Risks

- **UI complexity** — Group Detail dengan PIC vs non-PIC view bisa render banyak conditional. Test both roles thoroughly
- **QR code format** — decide plain code vs deeplink URL upfront (recommendation: support both di scanner untuk fleksibilitas)
- **Group vs Homecell confusion** — user bisa bingung 2 concept. Copy jelas: "Homecell = pemuridan strict, Group = komunitas umum"

---

## 📋 Backlog — v1.4+ (Future Sprints)

Item yang bisa masuk sprint berikutnya after v1.3, prioritas TBD:

### Profile Enhancements (dari Shiftsoft migration data)

- Show 14 field baru di Profile → detail screen: baptism status (Air + Roh Kudus), spiritual journey level, pendidikan/pekerjaan info, tanggal bergabung gereja
- Edit-profile form extended untuk allow user update field ini
- Bapa Rohani directory — jemaat pilih mentor mereka, browse "anak rohani lo siapa"
- Family relations UI — kalau BE eventually import family data dari Shiftsoft (deferred)

### Push Notifications (BE coordination needed)

- Server-side FCM push (BE deferred hint di sprint plan lama)
- In-app notif kalau di-add/removed dari group (currently WA only)
- Reminder push untuk homecell schedule H-1 dan H-day
- Event RSVP reminder push
- Renungan harian push (opt-in)

### Local Market Improvements

- Sort by distance (butuh GPS permission — trade-off privacy)
- Chat langsung ke business owner (butuh in-app messaging BE)
- Business analytics untuk owner (view count, contact click count)

### Face Login Cleanup (setelah 90d retention window expire)

- BE drop endpoints face + fields di /public/app-config + /auth/me
- Mobile: no action needed (types sudah optional, tolerant kalau field hilang)

### Bible Reader Enhancements

- Bookmark verses
- Highlight + notes
- Reading plan tracking (target chapters per week)
- Cross-reference popup

### Ministry Attendance (mirror homecell pattern)

- Ministry meeting schedules + QR check-in mirror pattern homecell schedule
- Requires BE coordination — new endpoints similar to homecell schedule

---

## 🎯 Sprint Cadence Assumptions

- **Sprint length:** 2 minggu per sprint (industry standard)
- **Buffer:** 20% capacity untuk bug fixes + BE coordination delays
- **Testing:** Internal testing 1 minggu per release sebelum promote ke Production
- **Release rhythm:** 1 minor version per 3 minggu (2 sprint + 1 minggu release buffer)

**Rough Q3 timeline:**

| Bulan | Sprint | Milestone |
|---|---|---|
| **Aug 2026** | S1 wrap (v1.1.0) + S2 start | Play Store live + Magic Link dev |
| **Sep 2026** | S2 wrap (v1.2.0) + S3 start | Legacy jemaat unblocked + Group dev |
| **Oct 2026** | S3 wrap (v1.3.0) + backlog planning | Group feature live |

---

## 📊 Success Metrics (per sprint)

### S1 (v1.1.0)

- Play Store install count: target 200+ first month
- Crash rate: < 2%
- ANR rate: < 0.5%
- App Store rating: > 4.0
- Home-cell PIC actively use schedule feature: > 30% of PICs

### S2 (v1.2.0)

- Legacy jemaat login success (via magic link): > 60% dari 6736 target
- Onboarding wizard completion rate: > 80%
- Email deliverability (via SendGrid): > 95% inbox rate
- Session extension impact — user retention 7d: expect +15%

### S3 (v1.3.0)

- Group browse screen impressions: track weekly
- Join actions per week: baseline TBD, growth target set setelah 1 minggu data
- PIC create group manual (bukan Shiftsoft imported): > 20 new groups per month
- QR scanner usage: > 40% of joins via QR (rest via public browse)

---

## 🔄 Coordination Points dengan BE

Anticipated BE requests per sprint:

**S1:** None (all BE work done, mobile deploy only)

**S2:**
- Confirm SendGrid rate limits + deliverability monitoring dashboard
- Test staging endpoint availability
- Coordinate force-update threshold timing pasca Play Store rollout (untuk face login final drop)

**S3:**
- Kalau ada bug di Group endpoints — quick BE turnaround (~1-2 hari)
- Consider Guest browse endpoint kalau mau expose Group ke non-authenticated (optional, tidak blocking)

**Backlog:**
- Push notification infra (FCM setup end-to-end)
- Ministry attendance mirror pattern (new endpoints)
- Family relations import from Shiftsoft (complex fuzzy match, deferred)

---

## 📝 Notes

- Sprint plan ini living document — update kalau priorities shift atau BE deliver feature baru
- Estimate points (S/M/L per user story) di-refine di planning meeting per sprint
- Retro tiap end-of-sprint untuk adjust cadence
- Documentation update tiap sprint di `docs/` folder — user-facing changes di release notes, BE contract di `backend-request-*.md`

---

*Doc versi: 1.0 — 2026-07-31. Update log: v1.0 initial sprint plan post-BE 3-batch deploy.*
