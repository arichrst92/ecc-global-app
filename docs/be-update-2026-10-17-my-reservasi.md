# BE Update: Reservasi Saya (audit end-to-end)

**Date**: 2026-10-17

## `GET /admin/me/reservasi`

- **Cakupan baru:**
  - Saya.
  - Anak saya, termasuk anak pasangan.
  - Tanggungan (`primaryGuardianId` = saya).
  - Tamu saya (`JemaatTamu` / `invitedByJemaatId`).
  - Keluarga yang saya self check-in-kan (`checkedInBy` = user saya **dan** `checkinMethod = SELF`).
- **Bug lama yang diperbaiki:**
  - Filter `checkedInBy = jemaatId` tidak pernah cocok, karena `checkedInBy` menyimpan **userId**. Akibatnya kode jemput anak tidak pernah muncul di app orang tua.
  - Reservasi yang di-scan usher tidak ikut ke daftar milik usher.
- **`activeOnly` (default):** ibadah **hari ini & mendatang (WIB)**, atau check-in < 24 jam. Sebelumnya: RESERVE hanya yang dibuat < 24 jam.
- **`activeOnly=false`:** riwayat, 100 terbaru.
- **Urutan:** `tanggalIbadah` desc, lalu `joinedAt` desc (null di akhir).
- **Field baru:**
  - `relation`: `SELF | ANAK | TANGGUNGAN | TAMU | KELUARGA`.
  - `ibadah.lokasi` dan `ibadah.cabang`.

## Notifikasi

- **`CKIDS_CHECKIN` / `CKIDS_PICKUP`:** `actionUrl` = `/my-reservasi`. Sebelumnya `/ckids/reservasi/:id`, rute yang tidak ada di app.
- **`POINT_EARNED` / gift:** `actionUrl` = `/ckids`.
- **Notifikasi lama:** URL lama tetap dipetakan di `notifRouting.ts`.

## Mobile

- **Tab Aktif / Riwayat.**
- **Anak yang belum dijemput:**
  - Kode jemput tampil besar di atas.
  - Data di-refresh otomatis tiap 20 detik dan saat layar dibuka kembali.
- **Jam pakai WIB.** Sebelumnya `slice(11,16)` menampilkan jam UTC (selisih 7 jam).
- **Label status diterjemahkan:** Terdaftar / Hadir / Dibatalkan / Sudah checkout. Status fiktif `COMPLETED` dihapus.
- **Tiap baris** menampilkan badge relasi, cabang & lokasi, dan cara check-in. Ada pengingat checkout kalau ibadahnya mewajibkan checkout.
- **Tap baris:** membuka detail ibadah.
- **Setelah self check-in:** cache Reservasi Saya di-invalidate.
