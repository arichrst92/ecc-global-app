# BE Update: Hero Image Group + Pengumuman & Voting Homecell

**Date**: 2026-10-13
**From**: BE (sudah diimplementasikan juga di repo mobile, mohon review)

## 1. Hero image group

Field baru `heroImageUrl` (nullable) ada di `GET /admin/group` (list) dan `GET /admin/group/:id` (detail).

| Method | Path | Akses |
|---|---|---|
| POST | `/admin/group/:id/hero` | Hanya PIC group. Kalau group belum punya PIC, Fulltimer boleh. Multipart `file` (jpg/png/webp/heic, maks 8 MB) → `{ heroImageUrl }` |
| DELETE | `/admin/group/:id/hero` | Akses sama dengan POST → `{ heroImageUrl: null }` |

Server mengubah gambar ke webp dengan sisi terpanjang maksimal 1600 px. URL-nya memakai `?v=` sebagai cache-buster.

Implementasi mobile:
- `src/components/group/GroupHero.tsx`: banner 16:9 di detail group. Kalau belum ada gambar, tampil emoji jenis group. PIC melihat tombol **Tambah/Ganti gambar** (expo-image-picker, crop 16:9) dan **Hapus**.
- Kartu di list group (`app/group/index.tsx`) memakai hero sebagai thumbnail kalau ada.

## 2. Pengumuman & voting homecell

Kontrak sama persis dengan pengumuman dan voting group (lihat `be-update-2026-10-13-group-content.md`). Bedanya hanya prefix path dan aksesnya:

| Prefix | `/admin/homecell/:homecellId` |
|---|---|
| Endpoint | `announcements`, `announcements/:annId`, `polls`, `polls/:pollId`, `polls/:pollId/vote` |
| Kelola | PIC homecell, PIC area, atau Fulltimer |
| Lihat & vote | Anggota aktif homecell |

Pengumuman dan voting ini berlaku di level homecell, tidak terikat ke jadwal tertentu. Materi pertemuan tetap per jadwal.

Notifikasi baru: `HOMECELL_ANNOUNCEMENT` dan `HOMECELL_POLL_CREATED`.
- **actionUrl:** `/homecell/view/:homecellId`
- **metadata:** `homecellId` dan `announcementId` / `pollId`

Implementasi mobile:
- Komponen papan dibuat generik: `ContentBoard({ root, canManage, showFiles })` di `src/components/group/GroupContent.tsx`. API dan hook di `src/api/groupContent.ts` serta `src/hooks/useGroupContent.ts` sekarang menerima `root` (`groupRoot(id)` / `homecellRoot(id)`), tidak lagi `groupId`.
- `app/homecell/view/[id].tsx` (anggota/pemimpin) dan `app/homecell/[id]/index.tsx` (PIC) menampilkan tab **Pengumuman / Voting**.
- Routing notifikasi untuk dua jenis baru diarahkan ke detail homecell.
