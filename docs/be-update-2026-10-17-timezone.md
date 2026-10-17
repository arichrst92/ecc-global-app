# BE Update: Zona Waktu per Cabang (multi-negara)

**Date**: 2026-10-17

## Backend

- **Kolom baru:** `cabang_gereja.timezone` (IANA, default `Asia/Jakarta`). Migration `20261017150000_cabang_timezone`. Diatur dari Portal → Cabang → Zona Waktu.
- **Jam jadwal** ibadah/event (`jamMulai`/`jamSelesai`) = jam dinding **di zona cabang**.
- **Logika waktu memakai zona cabang** (`lib/tz.ts`, aman DST). Sebelumnya semuanya WIB:
  - jendela self check-in ibadah & event
  - reservasi (buka/tutup, batal)
  - "aktif" di Reservasi Saya
  - usia anak CKids
- **`GET /auth/cabang`** sekarang mengirim `timezone`.
- **Respons yang sekarang mengirim `timezone`:**
  - `GET /admin/me/ibadah/:id/self-checkin`
  - `GET /admin/me/event-checkin/:id`
  - `GET /admin/me/ibadah/:id/reservasi`
  - `GET /admin/me/reservasi`, di `ibadah.timezone`
- **Instant** (`opensAt`, `joinedAt`, dll.) tetap ISO UTC.

## Mobile

- **`src/utils/time.ts`:**
  - `localTime(iso)` / `formatInstantDate(iso)`: instant di zona waktu HP.
  - `venueToLocal` / `formatVenueRange`: jam jadwal cabang dikonversi ke zona HP. Kalau harinya bergeser, diberi penanda `(+1)` / `(-1)`.
  - `venueTimeHint`: "Jam gereja: 09:00 - 11:00 (waktu Sydney)", hanya tampil kalau zona HP berbeda dari zona cabang.
- **`useVenueTz(cabangId?)`:** zona cabang dari daftar cabang. Urutan cadangan: cabang yang sedang dilihat, lalu default. Cache daftar cabang di-bump ke `ecc.branches.v2`.
- **Diterapkan di:**
  - Beranda (Ibadah hari ini)
  - Daftar ibadah
  - Detail ibadah
  - Kalender
  - Detail event, termasuk teks share
  - Scanner
  - Ibadah (mode tamu)
  - Reservasi Saya
  - Popup reservasi
  - Popup self check-in
  - Hitung mundur self check-in
  - Kode jemput
  - Tanggal publikasi konten & riwayat hadiah
- **Label "WIB" dihapus.**

## Belum (catatan)

- Jam homecell / group masih teks bebas (`jam`), jadi tidak dikonversi.
- Pengingat H-1 (WA) dan "terakhir hadir N hari lalu" masih dihitung dengan tanggal server (WIB).
