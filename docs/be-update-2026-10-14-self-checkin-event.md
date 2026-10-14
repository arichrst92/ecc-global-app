# BE Update: Self Check-in Event

**Date**: 2026-10-14

## Pengaturan event

Field baru `allowSelfCheckin: boolean` (default `false`) tersedia di create/update event dan di respons `GET /admin/event/:idOrSlug`. Admin mengaktifkannya di portal (form event → Kehadiran → "Perbolehkan self check-in"), dan opsi ini hanya bisa dipilih kalau `butuhKehadiran` aktif.

## Endpoint

| Method | Path | Keterangan |
|---|---|---|
| GET | `/admin/me/event-checkin/:eventId` | Jendela self check-in + saya & keluarga yang **terdaftar di event ini** (bukan BATAL) |
| POST | `/admin/me/event-checkin/:eventId` | `{ jemaatIds }`. Status peserta diubah ke HADIR |

Bentuk respons sama dengan self check-in ibadah (`available`, `reason`, `reasonText`, `opensAt`, `closesAt`, `serverNow`, `members[]`). Bedanya:
- Objeknya bernama `event` (`judul`, `lokasi`, `jamMulai`, `jamSelesai`), bukan `ibadah`.
- `members[].disabledReason` terisi untuk peserta event berbayar yang pembayarannya belum terverifikasi.
- Nilai `reason` yang mungkin: `DISABLED`, `NO_ATTENDANCE`, `INACTIVE`, `TOO_EARLY`, `ENDED`.

## Aturan

- **Jendela waktu:** dibuka 15 menit sebelum `tanggalMulai + jamMulai` sampai `tanggalSelesai (atau tanggalMulai) + jamSelesai`, menurut WIB. Tanpa jam mulai berarti dari 00:00, dan tanpa jam selesai berarti sampai 23:59 di hari terakhir.
- **Siapa yang muncul:** hanya saya dan keluarga (cakupan menu Keluarga) yang **terdaftar** di event. ID lain ditolak dengan 400.
- **Event berbayar:** peserta harus berstatus BAYAR. Yang belum lunas ditampilkan dengan label, tapi tidak bisa dipilih.
- **Efek check-in:** sama dengan scan petugas, yaitu `attendedAt`, role otomatis (grant saat HADIR), notifikasi in-app `EVENT_CHECKED_IN`, dan WA kalau aktif.

## Implementasi mobile

- `src/components/checkin/SelfCheckinBar.tsx` adalah blok serbaguna: hitung mundur → tombol Self Check-in → popup.
- Komponen ini dipasang di bagian atas CTA bawah `app/event/[id].tsx` saat `event.allowSelfCheckin` aktif.
- Komponen ini memakai ulang `SelfCheckinModal` (props baru: `question`, `subtitle`, `confirmLabel`) dan `SelfCheckinCountdown`.
- Popup event: "Apakah Anda sudah berada di lokasi event?" dengan tombol **Tidak** / **Ya, saya di lokasi event**.
