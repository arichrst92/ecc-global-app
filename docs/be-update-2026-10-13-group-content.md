# BE Update: Konten Group (File, Pengumuman, Voting)

**Date**: 2026-10-13
**From**: BE (sudah diimplementasikan juga di repo mobile, mohon review)

## Akses

| Peran | Hak |
|---|---|
| PIC group / Fulltimer | Membuat, mengubah, menghapus file, pengumuman, dan voting. Menutup atau membuka voting dan melihat siapa memilih apa. |
| Anggota aktif | Melihat pengumuman, membuka file, dan ikut voting |
| Selain itu | `403 FORBIDDEN` |

Respons list memuat `meta.canManage`. Client `api` di mobile tidak meneruskan `meta`, jadi mobile memakai `isPIC || user.isFulltimer`.

## Endpoint (`/admin/group/:id/...`)

| Method | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `files` | anggota | `GroupFile[]` (terbaru dulu) |
| POST | `files` | PIC/admin | Multipart: `nama`, `deskripsi?`, `file` (PDF, gambar, Office, txt; maks 20 MB) |
| PATCH | `files/:fileId` | PIC/admin | `{ nama?, deskripsi? }` |
| DELETE | `files/:fileId` | PIC/admin | |
| GET | `announcements` | anggota | Yang disematkan tampil di atas, lalu terbaru |
| POST | `announcements` | PIC/admin | `{ judul, isi, isPinned?, notify?=true }` |
| PATCH | `announcements/:annId` | PIC/admin | `{ judul?, isi?, isPinned? }` |
| DELETE | `announcements/:annId` | PIC/admin | |
| GET | `polls` | anggota | `GroupPoll[]` |
| POST | `polls` | PIC/admin | `{ pertanyaan, deskripsi?, options: string[] (2–10), multiple?, closesAt?, notify?=true }` |
| PATCH | `polls/:pollId` | PIC/admin | `{ isClosed?, closesAt?, pertanyaan?, deskripsi? }` |
| DELETE | `polls/:pollId` | PIC/admin | Semua suara ikut terhapus |
| POST | `polls/:pollId/vote` | anggota | `{ optionIds: string[] }`. Menggantikan pilihan sebelumnya. Array kosong menarik suara. Respons berisi poll terbaru. |

### Bentuk `GroupPoll`

```jsonc
{
  "id": "…", "pertanyaan": "…", "deskripsi": null,
  "multiple": false, "closesAt": null, "isClosed": false,
  "isOpen": true,            // false kalau ditutup atau sudah lewat closesAt
  "totalVoters": 12,
  "myVotes": ["optionId"],
  "showResults": true,       // PIC/admin selalu; anggota setelah memilih atau setelah voting ditutup
  "options": [{ "id": "…", "label": "Sabtu", "count": 7 /* null kalau hasil disembunyikan */, "voters": [/* hanya PIC/admin */] }]
}
```

Error vote: `POLL_CLOSED`, `POLL_INVALID_OPTION`, `POLL_SINGLE_CHOICE` (400).

## Notifikasi

Saat pengumuman atau voting dibuat dengan `notify` true, semua anggota aktif dan PIC (kecuali pembuatnya) mendapat notifikasi in-app:

- **Jenis:** `GROUP_ANNOUNCEMENT` dan `GROUP_POLL_CREATED`.
- **actionUrl:** `/group/:id`.
- **metadata:** `groupId` dan `announcementId` / `pollId`.

## Implementasi mobile

- `src/components/group/GroupContent.tsx`: tab **Pengumuman / Voting / File** di `app/group/[id].tsx`. Hanya tampil untuk anggota dan PIC/admin.
  - **Pengumuman:** PIC/admin bisa membuat (dengan opsi sematkan dan notifikasi), menyematkan atau melepas, dan menghapus.
  - **Voting:**
    - Pilihan tunggal (radio) atau ganda (checkbox), lalu **Kirim suara**. Setelah memilih, hasil berupa bar dan bisa **Ubah pilihan** selama voting masih terbuka.
    - PIC/admin bisa membuat voting dengan batas waktu Tanpa / 1 / 3 / 7 hari, menutup atau membuka voting, melihat pemilih, dan menghapus.
  - **File:** memakai ulang `MaterialList` dan `UploadMaterialModal` (nama + deskripsi).
- Kode pendukung:
  - API: `src/api/groupContent.ts`
  - Hooks: `src/hooks/useGroupContent.ts`
  - Tipe: `src/types/groupContent.ts`
  - i18n: namespace `gc`
- Routing notifikasi untuk dua jenis baru diarahkan ke `/group/:groupId`.

**Versi app lama** tidak menampilkan fitur ini. Notifikasinya tetap masuk, tetapi memakai ikon default dan tidak bisa dibuka.
