# BE Update: Kehadiran Terakhir Anggota Homecell

**Date**: 2026-10-13

Setiap anggota di respons berikut sekarang punya dua field baru:

| Endpoint | Lokasi field |
|---|---|
| `GET /admin/homecell/:id` (layar PIC) | `members[].lastAttendedAt`, `members[].lastAttendedDaysAgo` |
| `GET /admin/me/homecell/:id` (anggota/pemimpin) | `members[].lastAttendedAt`, `members[].lastAttendedDaysAgo` |

- `lastAttendedAt` berisi tanggal pertemuan terakhir (`YYYY-MM-DD`) yang dihadiri anggota **di homecell ini**, dari scan kehadiran. Nilainya `null` kalau anggota belum pernah hadir.
- `lastAttendedDaysAgo` berisi jumlah hari sejak tanggal itu, dihitung menurut tanggal WIB (0 = hari ini). Nilainya `null` kalau belum pernah hadir.

Implementasi mobile: `src/components/homecell/LastAttendanceText.tsx` tampil di bawah nama anggota di `app/homecell/[id]/index.tsx` dan `app/homecell/view/[id].tsx`. Contoh: "Terakhir hadir: 6 Okt 2026 · 7 hari lalu". Warnanya hijau untuk ≤7 hari, kuning untuk ≤30 hari, dan merah untuk >30 hari. Anggota yang belum pernah hadir mendapat teks "Belum pernah hadir homecell".
