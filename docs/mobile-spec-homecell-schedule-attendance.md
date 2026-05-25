# Mobile Spec — Homecell Schedule + Attendance Feature

**Owner:** Mobile (Ari)
**Pair:** `docs/backend-request-homecell-schedule-attendance.md` (BE side)
**Status:** Design — pending BE implementation
**Date:** 2026-05-24

Brief implementation untuk fitur jadwal pertemuan homecell + scan QR absensi. Mobile-first feature — PIC pakai mobile sebagai source of truth.

---

## TL;DR untuk Mobile Dev

Tambah 3 layar baru di mobile:
1. **Schedule list** — section di Homecell Detail screen existing
2. **Create Schedule** — form sederhana (date + lokasi + catatan)
3. **Schedule Detail + Scanner** — view attendance + scan QR member

Reuse:
- Existing `Scanner` component dari visit feature
- Existing `useMyHomecellDetail` hook (akan auto-include `scheduleCount` setelah BE deploy)
- Existing PIC gating dari `useAuthStore`

PIC-only feature — non-PIC member tidak lihat schedule UI sama sekali.

---

## User Flow

```
[PIC opens app]
  ↓
[Homecell Detail screen — existing]
  ↓ (PIC sees new "Jadwal Pertemuan" section)
  ↓
  ├─ Tap "+ Buat Jadwal" → /homecell/:id/schedule/new
  │    └─ Form: tanggal (date picker) + lokasi + catatan
  │    └─ Save → POST /admin/homecell/:id/schedule → back to detail
  │
  └─ Tap schedule row → /homecell/:id/schedule/:scheduleId
       ├─ View: tanggal, lokasi, list attended, list missing
       ├─ FAB "Scan QR" → fullscreen camera scanner
       │    └─ Scan member QR → POST attendance → toast "Hadir!" → stay scanner
       │       (allow continuous scan untuk efficiency saat pertemuan)
       └─ Tap attendee → modal "Hapus catatan?" (DELETE attendance)
```

---

## File Structure

```
app/
  homecell/
    [id].tsx                              ← EXISTING, modify: add Jadwal section
    [id]/
      schedule/
        new.tsx                           ← NEW
        [scheduleId].tsx                  ← NEW (detail + scanner)

src/
  types/
    homecellSchedule.ts                   ← NEW
  api/
    homecellSchedule.ts                   ← NEW
  hooks/
    useHomecellSchedules.ts               ← NEW
  components/
    homecell/
      ScheduleCard.tsx                    ← NEW (used di list)
      AttendanceRow.tsx                   ← NEW (used di detail)
      ScheduleScanModal.tsx               ← NEW (wrapper around Scanner)
```

---

## Types

```typescript
// src/types/homecellSchedule.ts

export type HomecellSchedule = {
  id: string;
  homecellId: string;
  tanggal: string;        // YYYY-MM-DD
  lokasi: string;
  catatan: string | null;
  createdBy: string;
  creator: { id: string; namaLengkap: string };
  createdAt: string;      // ISO datetime
  attendanceCount: number;
};

export type HomecellAttendance = {
  id: string;
  jemaatId: string;
  jemaat: {
    id: string;
    namaLengkap: string;
    kode: string;
    fotoUrl?: string | null;
  };
  scannedAt: string;
  scannedBy: string;
  scanner: { namaLengkap: string };
  source: 'QR_SCAN' | 'MANUAL';
};

export type HomecellScheduleDetail = HomecellSchedule & {
  memberCount: number;
  attendances: HomecellAttendance[];
  missingMembers: Array<{
    jemaatId: string;
    namaLengkap: string;
    kode: string;
  }>;
};

export type CreateSchedulePayload = {
  tanggal: string;       // YYYY-MM-DD
  lokasi: string;
  catatan?: string;
};

export type ScanAttendanceResponse = {
  id: string;
  scheduleId: string;
  jemaatId: string;
  jemaat: HomecellAttendance['jemaat'];
  scannedAt: string;
  alreadyAttended: boolean;
  attendanceCount: number;
};
```

Plus extend existing `HomecellDetail` type:

```typescript
// src/types/homecell.ts — ADD
export type HomecellDetail = {
  // ... existing fields ...
  scheduleCount?: number;           // ← NEW (optional untuk backwards-compat)
  lastSchedule?: {                   // ← NEW
    id: string;
    tanggal: string;
    attendanceCount: number;
  } | null;
};
```

Dan `AreaHomecellRow`:

```typescript
// src/types/homecell.ts — ADD
export type AreaHomecellRow = {
  // ... existing fields ...
  scheduleCount?: number;            // ← NEW
};
```

---

## API Client

```typescript
// src/api/homecellSchedule.ts

import { api } from './client';
import type {
  HomecellSchedule,
  HomecellScheduleDetail,
  CreateSchedulePayload,
  ScanAttendanceResponse,
} from '@/types/homecellSchedule';

export function listSchedules(
  homecellId: string,
  opts: { from?: string; to?: string; limit?: number } = {},
): Promise<HomecellSchedule[]> {
  const params = new URLSearchParams();
  if (opts.from) params.set('from', opts.from);
  if (opts.to) params.set('to', opts.to);
  if (opts.limit) params.set('limit', String(opts.limit));
  const q = params.toString();
  return api.get(`/admin/homecell/${homecellId}/schedules${q ? `?${q}` : ''}`);
}

export function getScheduleDetail(
  homecellId: string,
  scheduleId: string,
): Promise<HomecellScheduleDetail> {
  return api.get(`/admin/homecell/${homecellId}/schedule/${scheduleId}`);
}

export function createSchedule(
  homecellId: string,
  payload: CreateSchedulePayload,
): Promise<HomecellSchedule> {
  return api.post(`/admin/homecell/${homecellId}/schedule`, payload);
}

export function deleteSchedule(homecellId: string, scheduleId: string): Promise<{ deleted: true }> {
  return api.delete(`/admin/homecell/${homecellId}/schedule/${scheduleId}`);
}

export function recordAttendance(
  homecellId: string,
  scheduleId: string,
  kode: string,
): Promise<ScanAttendanceResponse> {
  return api.post(
    `/admin/homecell/${homecellId}/schedule/${scheduleId}/attendance`,
    { kode },
  );
}

export function deleteAttendance(
  homecellId: string,
  scheduleId: string,
  attendanceId: string,
): Promise<{ deleted: true }> {
  return api.delete(
    `/admin/homecell/${homecellId}/schedule/${scheduleId}/attendance/${attendanceId}`,
  );
}
```

---

## Hooks

```typescript
// src/hooks/useHomecellSchedules.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listSchedules,
  getScheduleDetail,
  createSchedule,
  deleteSchedule,
  recordAttendance,
  deleteAttendance,
} from '@/api/homecellSchedule';

export function useHomecellSchedules(homecellId: string | undefined) {
  return useQuery({
    queryKey: ['homecell', homecellId, 'schedules'],
    queryFn: () => listSchedules(homecellId!),
    enabled: !!homecellId,
    staleTime: 60_000,
  });
}

export function useHomecellSchedule(
  homecellId: string | undefined,
  scheduleId: string | undefined,
) {
  return useQuery({
    queryKey: ['homecell', homecellId, 'schedule', scheduleId],
    queryFn: () => getScheduleDetail(homecellId!, scheduleId!),
    enabled: !!homecellId && !!scheduleId,
    staleTime: 30_000,
    // Refetch lebih sering untuk reflect new attendance saat scanning
    refetchInterval: 15_000,
  });
}

export function useCreateSchedule(homecellId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSchedulePayload) => createSchedule(homecellId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['homecell', homecellId, 'schedules'] });
      qc.invalidateQueries({ queryKey: ['homecell', homecellId] }); // refresh scheduleCount
    },
  });
}

export function useRecordAttendance(homecellId: string, scheduleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (kode: string) => recordAttendance(homecellId, scheduleId, kode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['homecell', homecellId, 'schedule', scheduleId] });
      qc.invalidateQueries({ queryKey: ['homecell', homecellId, 'schedules'] });
    },
  });
}
// ... similar useDeleteSchedule + useDeleteAttendance
```

---

## UI Specs

### 1. Homecell Detail — add Jadwal section

Add di bawah Members section di `app/homecell/[id].tsx`:

```tsx
{/* Jadwal Pertemuan section — PIC only */}
{isPic ? (
  <View className="mt-5">
    <View className="flex-row items-center justify-between mb-2">
      <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
        {t('homecell.schedules_section', { count: homecell.scheduleCount ?? 0 })}
      </Text>
      <Pressable
        onPress={() => router.push(`/homecell/${id}/schedule/new`)}
        className="flex-row items-center gap-1"
      >
        <Plus size={14} color="#EA580C" />
        <Text className="text-xs font-semibold text-brand-600">
          {t('homecell.create_schedule')}
        </Text>
      </Pressable>
    </View>
    {schedulesQuery.data && schedulesQuery.data.length > 0 ? (
      <View className="gap-2">
        {schedulesQuery.data.slice(0, 5).map((s) => (
          <ScheduleCard
            key={s.id}
            schedule={s}
            memberCount={homecell.members.length}
            onPress={() => router.push(`/homecell/${id}/schedule/${s.id}`)}
          />
        ))}
        {schedulesQuery.data.length > 5 ? (
          <Pressable onPress={() => router.push(`/homecell/${id}/schedule`)}>
            <Text className="text-xs text-brand-600 text-center mt-2">
              {t('homecell.see_all_schedules', { count: schedulesQuery.data.length })}
            </Text>
          </Pressable>
        ) : null}
      </View>
    ) : (
      <View className="bg-white rounded-2xl p-5 border border-neutral-100 items-center">
        <Calendar size={28} color="#A3A3A3" />
        <Text className="text-sm text-neutral-500 mt-2">
          {t('homecell.empty_schedules')}
        </Text>
      </View>
    )}
  </View>
) : null}
```

### 2. Create Schedule screen (`app/homecell/[id]/schedule/new.tsx`)

Form fields:
- **Tanggal** — pakai existing `DateTimePicker` component, default today, min: today-30days, max: today+90days
- **Lokasi** — `TextInput` placeholder "Rumah Pak Yohanes, Jl. Mawar 5"
- **Catatan** — multiline `TextInput` (optional), placeholder "Bawa Alkitab"

Submit button bottom sticky, `mutation.mutate(payload)`. Success → `router.back()` + toast.

### 3. Schedule Detail + Scanner (`app/homecell/[id]/schedule/[scheduleId].tsx`)

Layout:
```
[Header: tanggal + lokasi + creator]
[Stats: 8 / 12 hadir — progress bar]
[FAB "Scan QR" — bottom-right floating, brand orange]

[Section: Hadir (8)]
  [AttendanceRow] avatar + name + scannedAt + delete icon
  ...

[Section: Belum Hadir (4)]
  [Row] avatar + name + kode
  ...
```

Scan flow:
- Tap FAB → modal full-screen scanner (camera)
- Scanner detect QR → resolve kode → call `recordAttendance(kode)`
- Success → haptic + toast "✓ {namaLengkap} hadir" → STAY in scanner (PIC scan banyak member berturut-turut)
- `alreadyAttended` → toast "ℹ {namaLengkap} sudah tercatat" (info, not error)
- Error → toast (NOT_HOMECELL_MEMBER, KODE_NOT_FOUND)
- Close button top-right exit modal

Scanner: **reuse `Scanner` component** dari `app/scanner/index.tsx` (visit feature) — pass callback `onScan(kode) => mutation.mutate(kode)`. Continuous mode (no auto-close after first scan).

---

## PIC Gating

Check `isPic` di Homecell Detail:

```tsx
const user = useAuthStore((s) => s.user);
const isPic = !!user && (
  homecell.picJemaatId === user.jemaatId ||
  homecell.area.picJemaatId === user.jemaatId
);
```

Schedule UI (section, create button, schedule detail, scanner) all gated `isPic`.

Non-PIC member tidak lihat fitur ini sama sekali — UX clean.

---

## i18n Keys (add to `id.json` + `en.json`)

```json
{
  "homecell": {
    "schedules_section": "Jadwal Pertemuan ({{count}})",
    "create_schedule": "Buat Jadwal",
    "empty_schedules": "Belum ada jadwal pertemuan",
    "see_all_schedules": "Lihat semua ({{count}})",
    "schedule_form_title": "Jadwal Pertemuan Baru",
    "field_tanggal": "Tanggal",
    "field_lokasi": "Lokasi / Alamat",
    "field_catatan": "Catatan (opsional)",
    "save_schedule": "Simpan Jadwal",
    "schedule_created": "Jadwal berhasil dibuat",
    "scan_attendance": "Scan QR",
    "attendance_recorded": "{{nama}} hadir",
    "attendance_already": "{{nama}} sudah tercatat",
    "attendance_section": "Hadir ({{count}})",
    "missing_section": "Belum Hadir ({{count}})",
    "delete_attendance_confirm": "Hapus catatan kehadiran ini?",
    "schedule_progress": "{{attended}} / {{total}} hadir"
  }
}
```

(English counterpart: "Meeting Schedules", "Create Schedule", "Scan QR", dll.)

---

## Implementation Phases

### Phase 1 — Stub + types (parallel dengan BE dev, 2 jam)
- Types + API client (commented `// pending BE deploy`)
- Hooks dengan dummy enabled flag
- Add scheduleCount to existing HomecellDetail type
- i18n keys

### Phase 2 — Schedule list + create (4-6 jam, setelah BE endpoint #1, #2, #7 ready)
- Modify Homecell Detail page — Jadwal section + PIC gating
- ScheduleCard component
- Create Schedule screen + DateTimePicker integration
- Empty state + see all link

### Phase 3 — Schedule detail + scanner (4-6 jam, setelah BE endpoint #3, #4, #5 ready)
- Schedule Detail screen layout
- AttendanceRow component
- Missing members list
- Wire reuse Scanner component dengan continuous mode
- Toast feedback (recorded, alreadyAttended, errors)
- Delete attendance modal

### Phase 4 — Polish + test (2 jam)
- Pull-to-refresh
- Loading + error states
- Offline behavior: queue scans kalau no network? (defer to v2 — for MVP show toast "no connection")
- Test PIC + area-PIC + non-PIC + admin views

### Phase 5 — Portal coordination check (1 jam)
- Confirm BE deploy portal changes (homecell list scheduleCount column, detail page Jadwal section)
- Cross-test mobile create → portal display

**Total estimate: ~15 jam mobile work** (paralel BE: ~similar).

---

## Edge Cases & Notes

1. **PIC area parent vs PIC homecell direct** — both can manage. UI tidak perlu distinguish (same UX).
2. **Member yang resign dari homecell** — kalau dia sudah hadir di jadwal lama, attendance row tetap exist (historical record). Hanya `missingMembers` di future schedules exclude dia.
3. **Member pindah cabang** — same as resign. Historical attendance preserved.
4. **Scanner battery drain** — continuous camera. Add timeout idle 60s → auto-close modal kalau tidak ada scan, prompt PIC tap "Resume" untuk lanjut.
5. **QR jemaat format** — kode existing `ECC-2025-00123` style. Reuse parser di existing scanner.
6. **Date validation** — frontend block date > 30 days backwards (BE juga validate, double protection).
7. **No member di homecell** — disable "Scan QR" FAB + show hint "Tambah member dulu di homecell".
8. **Network failure saat scan** — toast error, NO auto-retry (PIC bisa re-scan member).
9. **React Query staleTime detail = 30s + refetchInterval 15s** — supaya saat PIC scan banyak member berturut, list attended auto-update di background.

---

## Cross-checks dengan existing code

- Scanner component: lihat `app/scanner/index.tsx` (visit feature) — reuse-able dengan callback prop
- Toast: `useToast` from `@/components/ui/Toast` — sudah dipakai luas
- DateTimePicker: `@react-native-community/datetimepicker` — sudah installed (dipakai di edit-profile)
- API client: `@/api/client` (api.get/post/delete) — standard pattern
- React Query persistence: scheduleCount data akan otomatis cached di AsyncStorage via persister (lihat M22 work)

---

## Open Questions

1. **Notif ke member?** — saat PIC create jadwal, kirim push notif ke member homecell? Untuk MVP **NO** — defer to v2. PIC bisa share via WhatsApp manually (link deep ke schedule detail kalau perlu).
2. **Member self check-in?** — member scan QR PIC, atau PIC scan QR member? Brief saat ini: **PIC scan member** (PIC pegang HP, member tunjukkan QR). Lebih kontrolled + audit clear (`scannedBy` = PIC).
3. **Reschedule?** — jadwal yang sudah ada attendance, PIC bisa edit tanggal/lokasi? Untuk MVP **NO** — read-only setelah punya attendance. Kalau perlu hapus + buat ulang.
4. **Recurring schedule?** — PIC bisa create "setiap Jumat" sekali? Untuk MVP **NO** — manual entry per pertemuan. Pattern Ibadah lebih complex (master schedule + occurrence) tidak cocok untuk homecell yang lokasi sering ganti.

---

## Quick Reference

- BE doc: `docs/backend-request-homecell-schedule-attendance.md`
- Existing homecell types: `src/types/homecell.ts`
- Scanner component: `app/scanner/index.tsx`
- PIC detection pattern: `useAuthStore` user.jemaatId === picJemaatId
