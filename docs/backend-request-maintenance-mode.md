# Backend Handoff: Maintenance Mode (Mobile Force-Pause)

**Untuk**: Mobile dev (Ari Christian)
**Dari**: Tim Backend ECC
**Tanggal**: 2026-05-23
**Priority**: 🟡 **MEDIUM** — Ops feature untuk graceful pause saat deploy / urgent fix
**Status**: ✅ **READY** — endpoint + portal admin deployed, awaiting mobile UI

## TL;DR

Admin portal sekarang punya menu **App Settings → Maintenance Mode** untuk
toggle global flag yang paksa mobile app tampilkan modal full-screen
"Sedang maintenance". Berguna saat:

- Deploy backend dengan downtime (mis. major migration)
- Recovery dari incident / data inconsistency
- Coordinated maintenance window dengan tim ops

Mobile butuh polling endpoint `GET /public/maintenance` (no auth) di
splash + periodic, dan render modal blocking kalau `isEnabled=true`.

## Endpoint

```http
GET /public/maintenance
(no auth)
```

**Response saat off (default):**
```json
{
  "success": true,
  "data": {
    "isEnabled": false,
    "message": null,
    "startedAt": null,
    "estimatedEndAt": null
  }
}
```

**Response saat on:**
```json
{
  "success": true,
  "data": {
    "isEnabled": true,
    "message": "Sistem sedang dalam pemeliharaan. Mohon coba kembali sebentar lagi.",
    "startedAt": "2026-05-23T10:00:00Z",
    "estimatedEndAt": "2026-05-23T11:00:00Z"
  }
}
```

**Field reference:**

| Field | Type | Note |
|---|---|---|
| `isEnabled` | boolean | Source of truth. `true` = blocking. |
| `message` | string \| null | Plain text / markdown singkat. Default text disediakan kalau admin kosongin. |
| `startedAt` | ISO datetime \| null | Kapan maintenance dimulai. |
| `estimatedEndAt` | ISO datetime \| null | Kapan diperkirakan selesai. NULL = tidak ada estimasi (tampil tanpa countdown). |

### Graceful auto-disable

Kalau `estimatedEndAt` sudah lewat tapi admin belum sempat off, server
**auto-treat sebagai isEnabled=false** di response — mobile tidak akan
stuck di modal. Admin tetap perlu off explicit lewat portal untuk audit
log bersih, tapi mobile tidak terdampak.

## Polling strategy

Recommended:

1. **Splash check** — fetch saat app launch sebelum show home screen. Cache last
   response dalam React state.
2. **Periodic check** — setInterval setiap 60 detik selama app foreground.
   Pause polling saat app background (battery friendly).
3. **Pre-request gate** — sebelum heavy API call (mis. create reservasi, upload
   foto), kalau cache <60 detik tampilkan flag. Tidak wajib pre-check lagi.
4. **Foreground resume** — saat app dari background ke foreground, fetch ulang
   immediately (state mungkin berubah saat user pegang phone tidak aktif).

```typescript
// src/hooks/useMaintenanceMode.ts
import { useQuery } from '@tanstack/react-query';

export function useMaintenanceMode() {
  return useQuery({
    queryKey: ['maintenance-mode'],
    queryFn: async () => {
      const res = await api.get('/public/maintenance');
      return res.data.data;
    },
    refetchInterval: 60_000,         // poll tiap 60 detik
    refetchOnWindowFocus: true,       // refetch saat foreground
    staleTime: 30_000,
    retry: 1,                         // jangan retry agresif (kalau gateway down, jangan ke-amplify)
  });
}
```

## Suggested UI flow

### 1. Modal blocking full-screen

Saat `isEnabled === true`, render full-screen modal (above everything,
including navigator) dengan:

- Icon maintenance (mis. ⚙️ atau wrench)
- Title: "Sedang dalam pemeliharaan"
- Subtitle: `message` dari API
- Countdown: `Selesai dalam {fmt}` kalau `estimatedEndAt` tidak null
- Loading spinner kecil
- Footer: "Coba lagi" button → manual refetch

**TIDAK ADA** tombol close / dismiss / skip — modal benar-benar blocking.

```tsx
// app/_layout.tsx atau root component
function App() {
  const { data, refetch } = useMaintenanceMode();

  if (data?.isEnabled) {
    return <MaintenanceModal data={data} onRetry={refetch} />;
  }

  return <NormalAppRoot />;
}
```

### 2. Countdown component

Kalau `estimatedEndAt` di-set, tampilkan live countdown:

```tsx
const [remaining, setRemaining] = useState(() => calcRemaining(estimatedEndAt));
useEffect(() => {
  const t = setInterval(() => setRemaining(calcRemaining(estimatedEndAt)), 1000);
  return () => clearInterval(t);
}, [estimatedEndAt]);

// Display: "Selesai dalam 1j 23m 45d"
```

Kalau `estimatedEndAt === null` → display "Mohon tunggu" tanpa angka.

### 3. Auto-recover saat selesai

Setiap polling tick (60s) atau refresh manual: kalau response sekarang
`isEnabled: false`, langsung dismiss modal + mount normal app root.
Tidak perlu navigation reset — UI naturally back to normal.

### 4. Network error handling

Kalau polling fail (gateway down sambil maintenance?), **JANGAN** assume
`isEnabled=true` — tampil modal generic "Koneksi terputus, retry" dengan
tombol retry. Diferensiasi dari maintenance modal supaya user tahu apa
yang terjadi.

## Edge cases

- **Estimasi lewat tapi flag masih on** — server auto-return `isEnabled=false`. Mobile aman, jangan handle manual.
- **Admin enable lalu langsung disable dalam 1 menit** — mobile mungkin baru fetch saat sudah disable. UX: kalau mobile sempat tampil modal, akan auto-dismiss di polling berikutnya (<60s).
- **App di background saat enable** — saat foreground resume, fetch ulang → modal tampil.
- **Mobile cache stale lama** — staleTime 30s di React Query, fresh data didapat <60s.

## Backend access (untuk reference)

Admin endpoint (JWT + RBAC `maintenance-mode`):

```http
GET /admin/maintenance-mode       → current status (raw row)
PUT /admin/maintenance-mode       → set status

PUT body:
{
  "isEnabled": true,
  "message": "Optional custom message",
  "durationMinutes": 60            // optional, 1-1440 menit
}
```

Server compute `estimatedEndAt = now + durationMinutes` saat enable.

## Schema impact

Singleton row di table `maintenance_mode` dengan `id="global"`. Migration
`20260523100000_maintenance_mode` auto-seed row dengan default off + RBAC
backfill Fulltimer.

## Action items mobile

- [ ] `src/api/maintenance.ts` — `getMaintenanceMode()` fetch helper
- [ ] `src/hooks/useMaintenanceMode.ts` — React Query wrapper dengan polling 60s
- [ ] `src/components/MaintenanceModal.tsx` — full-screen blocking modal dengan countdown
- [ ] Integrate di app root: kalau `isEnabled` true, render modal di atas semua navigator
- [ ] Handle foreground/background — pause polling saat background (battery)
- [ ] Optional: i18n key untuk title + subtitle (default "Sedang maintenance")

Mobile-side estimasi: **2-3 jam** setelah review handoff.

## Test cases yg patut dicoba

1. Mobile app launch dengan maintenance OFF → normal app
2. Admin enable maintenance dengan durasi 5 menit → mobile foreground polling → modal muncul ~60s setelah enable
3. Modal countdown count-down ke 0 → admin off → modal dismiss di poll berikutnya
4. estimatedEndAt lewat tapi admin lupa off → mobile auto-treat off (graceful)
5. Network error saat polling → tampil retry modal (BEDA dari maintenance modal)

---

Backend ready. Endpoint deployed + portal admin punya UI lengkap dengan toggle
+ preset durasi (15m, 30m, 1h, 2h, 4h, 8h) + custom input + live countdown
untuk admin track. Tanya kalau ada edge case yang belum ke-cover.
