# BE Update: Status Tamu & Tamu Saya

**Date**: 2026-10-17

## `GET /admin/me/tamu` (diperluas)

Tiap item sekarang berisi field tambahan berikut:

| Field | Keterangan |
|---|---|
| `isTamu` | `false` berarti tamu sudah daftar Els App |
| `addedAt` | Waktu tamu ditambahkan |
| `status` | `DIUNDANG` \| `TERLIBAT` \| `FOLLOWUP` \| `TERDAFTAR` |
| `statusLabel` | Label status siap tampil |
| `kehadiran` | Jumlah ibadah JOIN + event HADIR |
| `terakhirHadir` | Tanggal kehadiran terakhir |

Tamu yang sudah jadi anggota tetap tampil di daftar, dengan status `TERDAFTAR`.

## Status efektif

- **Status tersimpan:** diatur admin di Portal → Tamu.
- **Naik otomatis ke TERLIBAT:** kalau tamu sudah pernah hadir.
- **Naik otomatis ke TERDAFTAR:** kalau tamu sudah daftar Els App.
- **Status tidak pernah turun** di bawah fakta kehadiran/pendaftaran tersebut.

## `DELETE /admin/me/tamu/:id`

- **Yang dihapus:** hanya tautan antara pengundang dan tamu.
- **Yang tetap tersimpan:** data tamu dan riwayat kehadirannya.

## Portal

- **Halaman:** `/dashboard/tamu` (menu `tamu`, grup People).
- **Ringkasan:** jumlah tamu per status.
- **Filter:** cabang dan pencarian (nama tamu, no HP, atau nama pengundang).
- **Ubah status:** lewat dropdown di tiap baris.
- **Catatan follow-up:** khusus untuk tim, tidak tampil ke jemaat pengundang.

API-nya:
- `GET /admin/tamu`
- `PATCH /admin/tamu/:id` dengan body `{ status?, catatan? }`

## Mobile

- **Layar:** `app/profile/my-guests.tsx`, dibuka dari menu Profil → **Tamu Saya**.
- **Isi layar:** status tiap tamu, jumlah kehadiran, tombol hapus, dan tombol tambah tamu.
