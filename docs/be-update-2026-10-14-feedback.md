# BE Update: Kritik & Saran

**Date**: 2026-10-14

## Endpoint jemaat (`/admin/me/feedback`)

| Method | Path | Keterangan |
|---|---|---|
| GET | `/` | Daftar kiriman saya: `{ id, tipe, kategori, isi, status, unreadForUser, replyCount, createdAt, lastActivityAt }[]` |
| POST | `/` | `{ tipe: KRITIK\|SARAN, kategori: APLIKASI\|IBADAH\|PELAYANAN\|EVENT\|HOMECELL\|LAINNYA, isi (10–3000), appInfo? }` |
| GET | `/:id` | Detail beserta `replies[] { id, isi, fromAdmin, createdAt }`. Membuka detail menandai balasan admin sebagai terbaca |
| POST | `/:id/replies` | `{ isi }` untuk tanggapan lanjutan. Kalau status sudah SELESAI, status kembali menjadi DIPROSES |

Status: `BARU` (tampil sebagai "Terkirim" di app), `DIPROSES`, `SELESAI`. Nama admin tidak dikirim ke app, dan di app ditampilkan sebagai "Tim Gereja".

## Notifikasi

Jenis baru `FEEDBACK_REPLIED` dengan `actionUrl` `/feedback/:id` dan `metadata.feedbackId`. Dikirim saat admin membalas dari portal.

## Portal

Menu **People → Kritik & Saran** (`/dashboard/feedback`, menuKey `feedback`):
- **Isi halaman:** tab status dengan jumlahnya; filter jenis, topik, cabang, dan pencarian; tampilan percakapan; kotak balasan dengan pilihan status setelah dibalas; ganti status langsung.
- **Akses:** fulltimer otomatis punya akses. Role lain perlu diberi akses menu `feedback` lewat Role Access (baca = lihat, tulis = balas/ubah status).

## Implementasi mobile

- **Menu:** Profil → **Kirim Kritik & Saran** membuka `app/feedback/index.tsx`, yaitu daftar kiriman dengan badge status dan "Balasan baru".
- **Form kirim:** `app/feedback/new.tsx` berisi pilihan Kritik/Saran, topik, dan pesan. `appInfo` (platform + versi) dikirim otomatis.
- **Percakapan:** `app/feedback/[id].tsx` menampilkan pesan awal, balasan "Tim Gereja", dan kotak tanggapan.
- **Kode pendukung:** API di `src/api/feedback.ts`, routing notifikasi di `src/utils/notifRouting.ts`.
