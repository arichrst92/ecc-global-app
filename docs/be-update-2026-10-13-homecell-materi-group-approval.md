# BE Update: Materi Jadwal Homecell dan Approval Join Group

**Date**: 2026-10-13
**From**: BE (sudah diimplementasikan juga di repo mobile, mohon review)

## 1. Materi pertemuan homecell (file + nama + deskripsi)

PIC homecell (atau PIC area / admin) bisa meng-upload file ke setiap jadwal pertemuan. Anggota homecell bisa melihat dan membuka file tersebut.

| Method | Path | Akses |
|---|---|---|
| POST | `/admin/homecell/:homecellId/schedule/:scheduleId/files` | PIC/admin. Multipart: `nama`, `deskripsi?`, `file` |
| PATCH | `/admin/homecell/:homecellId/schedule/:scheduleId/files/:fileId` | PIC/admin. JSON `{ nama?, deskripsi? }` |
| DELETE | `/admin/homecell/:homecellId/schedule/:scheduleId/files/:fileId` | PIC/admin |
| GET | `/admin/homecell/:homecellId/schedule/:scheduleId` | sekarang berisi `files[]` |
| GET | `/admin/me/homecell/:id/materi` | anggota/pemimpin → `{ upcoming[], past[] }` (jadwal yang punya file, berisi `files[]`) |

Tipe file yang diterima: PDF, gambar, Word, Excel, PowerPoint, dan teks, maksimal 20 MB. Setiap `file` berisi `{ id, nama, deskripsi, fileUrl, fileMime, fileName, fileSize, createdAt, uploadedBy }`. Kalau jadwal dihapus, file-nya ikut terhapus.

Implementasi di mobile:
- Layar jadwal PIC (`app/homecell/[id]/schedule/[scheduleId].tsx`) punya bagian **Materi pertemuan** dengan tombol upload (memakai `expo-document-picker`) dan hapus.
- Detail homecell anggota (`app/homecell/view/[id].tsx`) punya bagian **Materi pertemuan** per jadwal. Tap file untuk membukanya.
- Komponen ada di `src/components/homecell/ScheduleMaterials.tsx`.

## 2. Join group harus disetujui PIC

`POST /admin/group/:id/join` (group publik) dan `POST /admin/group/join-by-code` **tidak langsung menjadikan anggota lagi**. Sekarang:

- **Jemaat biasa:** dibuat permintaan berstatus `PENDING`, lalu PIC mendapat notifikasi (`GROUP_JOIN_REQUESTED`).
- **PIC group / Fulltimer:** tetap langsung menjadi anggota.

Respons join sekarang memuat:

```jsonc
{ "data": { "groupId": "…", "status": "PENDING" /* atau "MEMBER" */, "requestId": "…", "alreadyMember": false },
  "message": "Permintaan bergabung ke X terkirim. Menunggu persetujuan PIC group." }
```

Endpoint baru:

| Method | Path | Akses |
|---|---|---|
| DELETE | `/admin/group/:id/join-request` | jemaat, untuk membatalkan permintaannya sendiri |
| GET | `/admin/group/join-requests/mine` | jemaat, melihat permintaan yang masih menunggu |
| GET | `/admin/group/:id/join-requests` | PIC/admin |
| POST | `/admin/group/:id/join-requests/:reqId/approve` | PIC/admin. Jemaat langsung menjadi anggota |
| POST | `/admin/group/:id/join-requests/:reqId/reject` | PIC/admin. Body `{ reason? }` |

`GET /admin/group/:id` sekarang juga berisi `myJoinRequest` (permintaan saya yang masih menunggu) dan `pendingJoinCount` (hanya terisi untuk PIC/admin).

Notifikasi: `GROUP_JOIN_REQUESTED`, `GROUP_JOIN_APPROVED`, `GROUP_JOIN_REJECTED`. WhatsApp bersifat opsional lewat WA config, dengan placeholder `{nama}`, `{pemohon}`, `{group_nama}`, `{alasan}`.

Implementasi di mobile (`app/group/[id].tsx`, `app/group/scan.tsx`):
- **Tombol join:** labelnya menjadi "Minta bergabung". Setelah ditekan, muncul status "menunggu persetujuan" dan tombol **Batalkan permintaan**.
- **Scan kode undangan:** kalau hasilnya `PENDING`, muncul toast dan layar kembali ke sebelumnya. Group private belum bisa dibuka sebelum permintaan diterima.
- **PIC:** ada bagian **Permintaan bergabung** dengan tombol Terima, atau Tolak beserta alasan.

**Versi app lama:** setelah join, versi lama tetap menampilkan pesan dari server ("menunggu persetujuan"), tetapi bisa mencoba membuka group private dan mendapat error akses sampai permintaannya diterima. Ini diperbaiki di build baru.
