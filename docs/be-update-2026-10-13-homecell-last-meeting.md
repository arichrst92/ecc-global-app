# BE Update: Pertemuan Terakhir Homecell

**Date**: 2026-10-13

Setiap item homecell sekarang punya dua field baru:

- `lastMeetingAt` berisi tanggal pertemuan terakhir (`YYYY-MM-DD`). Pertemuan dihitung dari jadwal dengan tanggal ≤ hari ini (WIB) yang punya **minimal 1 kehadiran** tercatat. Nilainya `null` kalau belum ada.
- `lastMeetingDaysAgo` berisi jumlah hari sejak tanggal itu (0 = hari ini), atau `null`.

Endpoint yang memuat field ini:

| Endpoint | Lokasi |
|---|---|
| `GET /admin/me/homecell` | `managed[]`, `memberships[].homecell` |
| `GET /admin/me/homecell/browse` | `data[]` |
| `GET /admin/me/homecell/nearest` | `items[]` |
| `GET /admin/me/homecell/:id` | root |
| `GET /admin/homecell` (portal) | `data[]`, ditambah `periodMeetingCount` kalau ada filter `periode` |

Implementasi mobile: `LastAttendanceText` sekarang punya prop `variant="homecell"` yang menampilkan "Terakhir homecell: 6 Okt 2026 · 7 hari lalu". Warnanya hijau untuk ≤7 hari, kuning untuk ≤30 hari, dan merah untuk >30 hari. Teks ini tampil di:
- `HomecellListCard`, yang dipakai di semua daftar homecell (punya saya, jelajah, terdekat);
- `HomecellSpotlight` di beranda;
- header `app/homecell/view/[id].tsx`.

Khusus portal: `GET /admin/homecell` dan `GET /admin/homecell/export?format=pdf` menerima filter `status`, `periode` (`last_7d`, `this_week`, `last_week`, `last_30d`, `this_month`, `last_month`, `custom` + `from`/`to`), dan `pertemuan` (`ada`/`tidak`).
