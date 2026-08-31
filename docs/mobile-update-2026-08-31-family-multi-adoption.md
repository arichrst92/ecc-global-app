# Mobile Update — Family Multi-Participation Adopted (v1.8.0)

**Date**: 2026-08-31
**From**: Tim Mobile (Ari)
**Reply-to**: `be-update-2026-08-31-family-participation-list.md`

---

## Status

✅ **DELIVERED** — v1.8.0 mobile bundle, all 3 new BE endpoints wired up + N tracker cards + per-tracker cancel. Typecheck clean.

## Endpoints Adopted

| BE Endpoint | Mobile Consumer |
|---|---|
| `GET /admin/event/:id/peserta/mine-and-family` | `useMyEventParticipations(id)` hook (5min stale), auth-gated skip guest |
| `POST /admin/event/:id/peserta/:pid/self-cancel` | `selfCancelParticipation(id, pid)` — used by cancel button di detail modal |
| `GET /admin/event/:id` `familyParticipationsCount` | Type added, tidak displayed di UI dulu (redundant dengan tracker list) |
| `POST /peserta/:pid/bukti` extended guard | Belum dipakai — payment flow saat ini masih assume self, akan di-address di next iteration |

## UX Changes

### Event detail screen (`/event/:id`)

**Before:**
- 1 tracker card (self only, from `myParticipation`)
- Bottom CTA: "Batalkan Pendaftaran" for self

**After:**
- N tracker cards (self + family, from `/mine-and-family`)
- Each card shows: nama peserta, relation label ("Diri sendiri", "Istri", "Anak Laki-Laki", dll), status pill, waktu daftar, nominal
- Each card **clickable** → detail modal
- Detail modal shows: nama + relation, waktu daftar/bayar/hadir, nominal, bukti transfer image (tap to zoom), catatan admin
- Detail modal has action buttons:
  - **Continue Payment** (self + DAFTAR + berbayar only) → route to `/event/:id/payment`
  - **Batalkan Pendaftaran** → confirmation modal → `selfCancelParticipation(pid)`
- Bottom CTA: "Daftarkan Anggota Keluarga Lain" (kalau ada family list) atau "Daftar Sekarang" (kalau kosong)
- Ketika user sudah punya self participation, ada secondary link "+ Daftarkan Anggota Keluarga Lain" di bawah primary CTA

### Cancel confirmation

Modal konfirmasi tunjukkan nama peserta yang di-cancel:
> Batalkan pendaftaran?
> Dewi Christian (Istri)
> Yakin ingin membatalkan?

Handling error codes dari BE:
- `BAD_REQUEST` → "Tidak bisa dibatalkan karena sudah hadir"
- `NOT_FOUND` → "Anda belum terdaftar di event ini"
- `FORBIDDEN` → "Anda tidak diizinkan membatalkan pendaftaran ini" (new — untuk case non-family)
- `alreadyCancelled: true` → "Pendaftaran sudah dibatalkan sebelumnya"

## Files Changed (Mobile)

- `app/src/types/event.ts`
  - `EventParticipation` extended: `cancelledAt`, `isSelf`, `relationLabel`
  - `EventDetail.familyParticipationsCount` added
  - `MineAndFamilyParticipationsResponse` new type
- `app/src/api/event.ts`
  - `listMineAndFamilyParticipations(id)` new
  - `selfCancelParticipation(id, pid)` new (POST endpoint per BE decision)
- `app/src/hooks/useEvents.ts`
  - `useMyEventParticipations(id)` new hook
- `app/app/event/[id].tsx`
  - Render N tracker cards from mine-and-family list
  - Cancel via `selfCancelParticipation`
  - Modal wired to `selectedParticipation` state
  - Bottom CTA logic updated for multi-participation state
- `app/app/event/[id]/payment.tsx`, `register.tsx`, `donate.tsx`
  - All mutation `onSuccess` handlers invalidate `['event', 'mine-and-family', id]`
- `app/src/i18n/locales/{id,en}.json`
  - `detail_self`, `family_registrations_title`, `register_family_more`, `cancel_not_family`
- `app.json` — 1.7.4 → **1.8.0**

## Known Limitations (untuk next iteration)

1. **Payment flow (upload bukti) still assumes self.** Kalau user mau upload bukti untuk istri → belum bisa dari mobile. Butuh:
   - Selected participation state di payment flow (bukan self-only)
   - `uploadBukti(eventId, participationId, file)` — endpoint sudah support participationId + BE guard sudah allow family
   - UX: dari tracker card istri (DAFTAR + berbayar) → tap → Continue Payment → payment.tsx dengan participationId istri
2. **Batch register belum di-adopt.** Register flow masih one-at-a-time. Endpoint `POST /peserta/batch` available tapi UX belum ada checkbox multi-select
3. **Donation flow** (`donate.tsx`) — full BEBAS flow via web (Apple 3.2.2iv), tidak affected
4. **familyParticipationsCount** field tidak dipakai UI — redundant dengan actual list length

## Deploy Steps

Mobile side ready untuk build + submit setelah BE deploy VPS confirmed.

```bash
cd ~/Projects/ecc-mobile-app
git add -A
git commit -m "feat(event): family multi-participation trackers + per-id self-cancel (v1.8.0)

Adopts BE endpoints from be-update-2026-08-31-family-participation-list.md:
- GET /peserta/mine-and-family → useMyEventParticipations hook
- POST /peserta/:pid/self-cancel → per-tracker cancel button
- familyParticipationsCount type added

UX: N tracker cards di event detail (self + family), each clickable
to detail modal with cancel/continue-payment actions."
git push origin main

cd app
eas build --platform ios --profile production --auto-submit
eas build --platform android --profile production --auto-submit
```

## Follow-up Requests

Kalau BE mau expand:
- Extend guard yg sama (`getFamilyJemaatIds`) ke `DELETE /donations/:donationId` supaya user bisa cancel donation family member
- Extend guard ke `POST /donations/:donationId/bukti` untuk konsistensi

Tidak urgent — donation flow hybrid (web-first) di mobile masih valid.

---

*Doc versi: 1.0 — 2026-08-31.*
