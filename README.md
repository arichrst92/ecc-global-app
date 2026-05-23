# ECC Mobile App

Mobile app untuk jemaat dan volunteer ECC (Indonesian Pentecostal church network).

## Stack

- **React Native + Expo** (managed workflow, SDK 53+)
- **TypeScript** strict mode
- **Expo Router** untuk file-based routing
- **react-i18next** untuk bilingual (Indonesia / English)
- **Tanstack Query** untuk data fetching + cache
- **NativeWind / Tailwind** untuk styling (atau StyleSheet — TBD)
- **expo-secure-store** untuk token storage
- **react-native-vision-camera** untuk QR scanner & face login
- **react-native-qrcode-svg** untuk render QR jemaat
- **Lucide icons** (`lucide-react-native`)

## Struktur

```
ecc-mobile-app/
├── README.md
├── .gitignore
│
├── mockup/                       # Interactive HTML prototype (current source-of-truth UX)
│   └── ecc-mobile-mockup.html    # 38 screens, bilingual, role toggle — open in browser
│
├── reference/                    # Source-of-truth docs from ECC backend team
│   ├── mobile-api-guide.md       # API integration guide (auth, endpoints, errors)
│   └── mobile-app-reference.md   # Product & engineering reference (domain, UX, design)
│
├── docs/                         # Project-specific docs (decisions, ADRs, screen specs)
│
└── app/                          # React Native source — TBD when scaffolded
    ├── (auth)/                   # auth group: splash, welcome, login, signup, face-login
    ├── (tabs)/                   # main tabs: home, ibadah, event, persembahan, profile
    ├── ibadah/                   # ibadah detail, reserve
    ├── event/                    # event detail, daftar, bayar
    ├── family/                   # family list, add, register-new
    ├── homecell/                 # PIC Homecell, PIC Area screens
    ├── bible/                    # bible browse, chapter read
    ├── settings/                 # printer, change-branch, notifications
    ├── scanner/                  # volunteer scanner (full-screen)
    ├── _layout.tsx
    └── ...
```

## Quick start

### Lihat mockup
```bash
open mockup/ecc-mobile-mockup.html
```

### Scaffold project Expo (saat siap mulai coding)

⚠️ Jalankan dari project root (`~/Projects/ecc-mobile-app/`), **bukan** dari dalam `app/`.

```bash
# 1) Pastikan di project root (bukan di dalam app/)
cd ~/Projects/ecc-mobile-app
pwd   # → /Users/idea/Projects/ecc-mobile-app

# 2) Folder app/ harus kosong/tidak ada sebelum scaffold
rm -rf app

# 3) Scaffold project Expo (akan create folder app/ otomatis)
npx create-expo-app@latest app --template tabs

# 4) BARU SEKARANG cd ke app/ dan install deps
cd app
npx expo install expo-router expo-secure-store expo-camera react-native-qrcode-svg
npm install --save lucide-react-native react-i18next i18next @tanstack/react-query

# 5) Jalankan dev server
npx expo start
```

**Common mistake**: `cd app && npx expo install ...` tanpa scaffold dulu → error "Project root directory not found". Pastikan `package.json` ada di `app/` sebelum install.

## Roles & Personas (RBAC)

App ini single-app dengan UI yang berubah berdasarkan role user:

| Role | Akses tambahan |
|---|---|
| `jemaat` | Default — Home, Ibadah, Event, Persembahan, Profile |
| `volunteer` | + tombol Scanner di Ibadah Detail / Event Detail (saat user authorized scanner) |
| `pic-homecell` | + akses Homecell detail via Profile (list anggota, tambah via QR scan) |
| `pic-area` | + akses Area dashboard via Profile (drill-down per homecell) |
| `pastor` | + dashboard stats cabang (read-only) |
| `guest` | Nav terbatas: hanya News, Renungan, Persembahan info |

Scanner, Homecell, Area **bukan** di bottom nav — accessed via context (detail page / profile menu).

## Backend API

- Production: `https://api.eccchurch.global` (live per BE handoff 2026-05-23)
- Swagger UI: `{BASE_URL}/docs`
- Auth: OTP WhatsApp (JWT) untuk user, X-API-Key untuk scanner stateless
- Build profile: set `EXPO_PUBLIC_API_BASE_URL` via `eas.json` env block per profile
- Lihat `reference/mobile-api-guide.md` untuk integrasi lengkap, `docs/production-launch-brief-2026-05-23.md` untuk detail launch

## Error Reporting (Custom BE Endpoint)

Tidak pakai Sentry/GlitchTip — events push langsung ke BE via fire-and-forget
`POST /diagnostics/error`. Tidak ada subscription cost, BE handles
aggregation/dashboard. Architecture aligned dengan telemetry (sama-sama push
ke BE).

Setup:
- Mobile: zero — sudah wired di `src/services/errorReporting.ts`.
- BE: implement endpoint per spec di `docs/backend-request-diagnostics-error-endpoint.md`.
  Selama BE belum implement, mobile push akan return 404 dan di-drop silently
  (zero impact ke user flow).

Skip di `__DEV__` mode — supaya pilot dashboard tidak polluted dengan dev errors.

Manual report:

```typescript
import { reportError, addBreadcrumb } from '@/services/errorReporting';

addBreadcrumb('User tapped face login', 'auth');
try { ... } catch (e) { reportError(e, { context: 'face_login_flow' }); }
```

Auth user di-sync ke reporter context otomatis via `setReportingUser` di root
layout — events akan tag dengan `noHp` untuk filter per user di BE dashboard.

Errors carry breadcrumb buffer (last 20 events) + device meta + release version
untuk debugging context.

## Network Resilience

`QueryClient` defaults pakai smart retry policy (`src/lib/retryPolicy.ts`):
- 4xx errors: no retry (client bug)
- 5xx / 408 / 429 / network errors: retry up to 3x (query) / 2x (mutation)
- Exponential backoff dengan ±20% jitter: 1s → 2s → 4s (capped 8s)

Override per query: `useQuery({ retry: false, ... })`.

## Offline-First Persistence

React Query cache survive app restart via AsyncStorage persister
(`src/lib/queryPersistence.ts`). Read-only data (news, renungan, events,
jemaat, ibadah, ministry) langsung load dari cache + refetch in background
— prevent loading spinner spam saat flaky network.

- maxAge **24 jam** — cache > 24h drop, force fresh fetch
- buster **app version** — schema change otomatis purge old cache
- gcTime **25 jam** — sedikit > maxAge, supaya restored queries tidak
  langsung di-evict

Excluded dari persist (always fetch fresh): `maintenance-mode`, `app-version`,
`face-profile-status`, `liveness-nonce-*`, `me-access`.

Install (kalau belum):
```bash
cd ~/Projects/ecc-mobile-app/app
npx expo install @react-native-async-storage/async-storage
npm install @tanstack/react-query-persist-client @tanstack/query-async-storage-persister
```

## i18n

Bahasa Indonesia default, English untuk expat. Setup dari awal — jangan retrofit.

Format display:
- Date: `19 Mei 2026` (id) / `19 May 2026` (en)
- Currency: `Rp 750.000` (id) — `Intl.NumberFormat('id-ID')`

## Conventions

- Tap target min 44x44 pt
- Color contrast 4.5:1 untuk body text
- Sticky bottom CTAs = part of flex column, **NOT** `absolute bottom-0`
- Loading = skeleton shimmer (bukan spinner full-screen)
- Error = retry button + technical detail collapsible
- Offline = banner + cached data + queue scan ke local DB

## License

Internal — milik ECC & IDEA Asia.
