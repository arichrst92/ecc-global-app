# Backend Request: Event Time Fields (jamMulai / jamSelesai)

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-22
**Priority**: 🟡 **MEDIUM** — UX polish, blocking event detail completeness
**Status**: ✅ **RESOLVED** (BE patch 2026-05-22a)

## TL;DR

Mobile butuh tahu jam mulai & jam selesai event (mis. "Seminar 09:00 - 12:00 WIB"). Saat ini Event type hanya punya `tanggalMulai` + `tanggalSelesai` (ISO datetime). Confirm:

1. Apakah BE sudah include jam ke ISO datetime (`2026-06-15T09:00:00+07:00`)?
2. Atau perlu field `jamMulai` / `jamSelesai` terpisah?

## Background

User feedback iter 4:
> "pada event hanya ada tanggal tidak ada jam mulai dan selesainya (untuk event yang membutuhkan detail sampai jam)"

Mobile sudah implement helper `formatTimeRange(startIso, endIso)` di `app/event/[id].tsx`:
- Extract HH:mm dari ISO string pakai `new Date(iso).getHours()` + `.getMinutes()`
- Kalau jam start = 00 + menit start = 00 + jam end = 00 + menit end = 00 → return null (date-only event, tidak tampil row jam)
- Else → tampil "HH:mm - HH:mm WIB" di Event Detail screen

Logic ini akan jalan **kalau BE fill jam ke ISO**. Kalau BE selalu kirim `T00:00:00`, maka jam tidak akan pernah tampil meski event sebenarnya ada jam mulai.

## Question / Option 1: Confirm BE fill jam ke ISO

Cek di Prisma schema `Event` model — apakah field `tanggalMulai` dan `tanggalSelesai` bertipe `DateTime` dan admin web isi jam saat create event?

Kalau ya, mobile sudah jalan — cuma perlu pastikan:
- ISO yang dikirim ke mobile pakai timezone yang benar (preferred: WIB / `+07:00`, atau UTC dengan `Z` lalu mobile convert)
- Admin web UI ada input jam (time picker), bukan cuma date picker

**Action**: BE konfirmasi schema + admin UI.

## Option 2: Add separate jam fields

Kalau BE saat ini `tanggalMulai`/`tanggalSelesai` adalah **date-only** (atau `DateTime` tapi admin web cuma isi tanggal tanpa jam), perlu field baru:

```typescript
type Event = {
  // ... existing fields
  tanggalMulai: string;           // "2026-06-15" — tanggal aja
  tanggalSelesai: string;          // "2026-06-15" atau "2026-06-17"
  jamMulai?: string | null;        // "09:00" (HH:mm 24-hour WIB) — NEW
  jamSelesai?: string | null;      // "12:00" — NEW
}
```

Aturan display di mobile:
- Kalau `jamMulai` null → date-only event, sembunyikan row jam
- Kalau `jamMulai` ada + `jamSelesai` ada → "09:00 - 12:00 WIB"
- Kalau hanya `jamMulai` → "Mulai 09:00 WIB"

## Mobile-side preferred shape

Untuk konsistensi dengan Ibadah type (yang sudah punya `jamMulai`), saya prefer Option 2 — separate `jamMulai`/`jamSelesai` fields supaya:

1. Lebih eksplisit (gak perlu parsing time dari ISO)
2. Konsisten dengan Ibadah (sudah ada `jamMulai`)
3. Timezone-safe (pure `HH:mm` string, no UTC conversion ambiguity)
4. Bisa null kalau memang date-only (mis. "Festival 3 hari" tanpa jam tertentu)

## Reference: Ibadah type yang sudah ada

```typescript
// src/types/ibadah.ts (current)
export type Ibadah = {
  id: string;
  nama: string;
  tanggalMulai: string;     // datetime ISO
  jamMulai: string;          // "HH:mm:ss" atau "HH:mm"
  // ...
}
```

Pattern serupa untuk Event akan konsisten.

## Effort estimate BE

**Option 1** (confirm existing): 15 menit cek schema + reply.

**Option 2** (add jam fields):
- Prisma migration `add_event_jam_fields`: 15 menit
- Update endpoint `GET /event/:id` + `GET /event/list` return new fields: 30 menit
- Update admin web event form: time picker input: 1-2 jam
- Backfill existing events (default null atau ekstrak dari datetime): 15 menit

Total Option 2: **2-3 jam BE work**.

## Action items BE

- [ ] Cek dulu: apakah `Event.tanggalMulai` schema include jam? Apakah admin UI ada time picker?
- [ ] Reply di doc ini atau Slack: Option 1 (sudah ada) atau Option 2 (perlu tambah)
- [ ] Kalau Option 2: implement migration + endpoint update + admin UI
- [ ] Update mobile-api-guide section 8 (Event) dengan field jam (kalau ditambah)

## Mobile-side plan

### Kalau Option 1 (BE sudah fill jam ke ISO):
- Tidak ada perubahan mobile, helper `formatTimeRange` sudah jalan
- Test dengan event yang punya jam non-zero

### Kalau Option 2 (BE tambah jamMulai/jamSelesai):
- Update `src/types/event.ts` — add `jamMulai?: string | null`, `jamSelesai?: string | null`
- Update `app/event/[id].tsx` `formatTimeRange` → read langsung dari `event.jamMulai`/`jamSelesai` instead of parsing ISO
- Backward compat: kalau field tidak ada, fallback ke parse ISO (existing logic)

Mobile-side estimasi: **1 jam** setelah BE ready.

## Related

- BE request lain (parallel): [GET /admin/jemaat/:id](./backend-request-jemaat-public-profile.md)
- Mobile commit iter 4: event detail show time range (tapi belum testable until BE confirm)

---

## ✅ Backend Response — 2026-05-22 (patch 2026-05-22a)

**Pilihan**: Option B (separate `jamMulai`/`jamSelesai` fields) — sesuai preference mobile untuk konsistensi dengan `Ibadah`. Lebih eksplisit + timezone-safe + bisa null kalau date-only event.

### Audit existing state

- Schema `Event.tanggalMulai` ✅ bertipe `DateTime` (bukan `@db.Date`), bisa store jam
- Admin portal form ❌ cuma `type="date"` input → jam selalu T00:00:00 saat create event
- → Effectively existing data tidak punya jam meski schema support

### Implementasi

1. **Migration** `20260522010000_event_jam_fields`:
   ```sql
   ALTER TABLE "event" ADD COLUMN "jam_mulai" VARCHAR(5), ADD COLUMN "jam_selesai" VARCHAR(5);
   ```
   Existing events biarkan NULL. Admin bisa edit per event untuk add jam.

2. **`schema.prisma Event`** — tambah `jamMulai`/`jamSelesai` `String?` `@db.VarChar(5)`.

3. **`shared-types/event.ts`** — `createEventSchema` & `updateEventSchema` accept optional `jamMulai`/`jamSelesai` regex `HH:mm` 24-hour:
   ```typescript
   jamMulai: emptyToUndefined(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/))
   ```

4. **`routes/admin/event.ts`** — POST/PATCH propagate `jamMulai`/`jamSelesai` (default null kalau tidak diisi).

5. **`portal/event-form-modal.tsx`** — 2 input `type="time"` di Section "Waktu & Lokasi" (di bawah Tanggal Mulai/Selesai). Optional, helper text jelas: "Kosongkan kalau acara seharian / festival tanpa jadwal jam spesifik".

### Response shape — `GET /admin/event/:idOrSlug`

```json
{
  "tanggalMulai": "2026-08-15T00:00:00.000Z",
  "tanggalSelesai": "2026-08-17T00:00:00.000Z",
  "jamMulai": "09:00",
  "jamSelesai": "12:00",
  ...
}
```

`jamMulai`/`jamSelesai` ada di **list endpoint juga** (no select limitation di routes).

### Mobile-side rekomendasi

- Update `src/types/event.ts` — add `jamMulai?: string | null`, `jamSelesai?: string | null`
- Update `app/event/[id].tsx` `formatTimeRange`:
  ```typescript
  function formatTimeRange(event: Event): string | null {
    if (event.jamMulai && event.jamSelesai) return `${event.jamMulai} - ${event.jamSelesai} WIB`;
    if (event.jamMulai) return `Mulai ${event.jamMulai} WIB`;
    // Fallback parse ISO (backward compat untuk existing events tanpa jam fields populated)
    return null;
  }
  ```
- Display row "Jam" cuma kalau function return non-null

### Backward compat

Existing events (jam = NULL):
- Mobile fallback ke parse ISO `tanggalMulai` (helper existing). Kalau ISO jam = T00:00:00 → hide row jam.
- Admin bisa update existing events satu-satu kalau perlu add jam.

### Effort actual

15 menit (sesuai estimate Option 2 BE side) — migration + schema + 2 endpoint handler + form input. Mobile side ~30 min update types + helper.

### Git

```bash
cd /Users/idea/Projects/ecc-core-platform
git add packages/database/prisma/migrations/20260522010000_event_jam_fields/ \
        packages/database/prisma/schema.prisma \
        packages/shared-types/src/schemas/event.ts \
        apps/core-api/src/routes/admin/event.ts \
        apps/portal/src/components/event/event-form-modal.tsx \
        docs/mobile-api-guide.md \
        knowledge-base.md
git commit -m "feat(event): add jamMulai/jamSelesai fields (Option B per mobile)

Mobile request backend-request-event-time-fields.md — separate jam
fields untuk konsistensi dengan Ibadah model. Backward compat: existing
events (jam = NULL) → mobile fallback parse ISO dari tanggalMulai.

- Migration 20260522010000_event_jam_fields (ADD COLUMN VARCHAR(5))
- schema.prisma Event.jamMulai/jamSelesai String?
- shared-types createEventSchema/updateEventSchema accept jam regex HH:mm
- routes/admin/event.ts propagate jam in POST/PATCH
- portal event-form-modal time inputs di Section Waktu

Refs: ecc-mobile-app/docs/backend-request-event-time-fields.md"
git push
```
