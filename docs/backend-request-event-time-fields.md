# Backend Request: Event Time Fields (jamMulai / jamSelesai)

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-22
**Priority**: 🟡 **MEDIUM** — UX polish, blocking event detail completeness
**Status**: 🆕 **PROPOSED**

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
