# BE Update: Tamu (tahap 1)

**Date**: 2026-10-14

**Tamu** adalah orang non-anggota tanpa akun Els App yang dibawa jemaat, atau yang datang walk-in ke event/ibadah. Di server, tamu disimpan sebagai `Jemaat` dengan `isTamu = true` (punya `kode`, tidak punya User). Karena itu, alur pendaftaran, pembayaran, kuota, dan check-in yang sudah ada tetap berlaku untuk tamu. No HP menjadi kunci, sehingga tamu yang sama dikenali lagi di kedatangan berikutnya.

## Tamu saya (`/admin/me/tamu`)

| Method | Path | Keterangan |
|---|---|---|
| GET | `/` | `{ id, namaLengkap, noHp, kode, addedAt }[]` |
| POST | `/` | `{ nama, noHp }` → tamu (201 baru / 200 tamu lama + `isReturning`). Kalau no HP milik anggota → **409 `PHONE_IS_MEMBER`** |
| DELETE | `/:id` | Hapus dari daftar saya (data & riwayat tamu tetap) |

Tamu saya otomatis diperlakukan seperti **keluarga** di:
- `POST /admin/event/:id/peserta/batch`: bisa didaftarkan. Partisipasi tamu diberi `invitedByJemaatId` dan `guestSource: "DIUNDANG"`, dan tamu tidak dikirimi notifikasi.
- `GET /admin/event/:idOrSlug/peserta/mine-and-family`: tamu muncul dengan `isTamu: true` dan `relationLabel: "Tamu"`. Pembayaran (upload bukti) dan pembatalan berjalan seperti keluarga, dan biayanya ditanggung pengundang.
- **Self check-in ibadah:** member list memuat tamu (`relasi: "Tamu"`).
- **Self check-in event:** tamu ikut tampil kalau sudah terdaftar di event itu.

Syarat role event tetap berlaku. Tamu tidak punya role, jadi event yang dibatasi role akan menolaknya (`NOT_ELIGIBLE`).

## Walk-in petugas

| Method | Path | Body |
|---|---|---|
| POST | `/admin/event/:id/walk-in-guest` | `{ nama, noHp, pembayaran?: TUNAI\|TRANSFER\|QRIS\|GRATIS, nominal?, force? }` |
| POST | `/admin/reservasi/walk-in-guest` | `{ ibadahId, tanggalIbadah (YYYY-MM-DD), nama, noHp }` |

- **Hasil:** tamu langsung tercatat **HADIR** (event) atau **JOIN** (ibadah) dengan `guestSource: "WALK_IN"`.
- **No HP milik anggota:** anggota itu yang dicatat hadir (`isMember: true`).
- **Event berbayar:** `pembayaran` wajib. Selain GRATIS, server mencatat donation berstatus BAYAR (diterima petugas).
- **Kuota penuh:** server mengembalikan 409 `QUOTA_FULL`. Kirim ulang dengan `force: true` untuk tetap memasukkan.
- **Akses event:** sama dengan scan check-in (volunteer `canScanAttendance`) atau Fulltimer.
- **Ibadah anak:** ditolak.

## Pendaftaran Els App oleh tamu

- **Request OTP `ENROLLMENT`:** no HP tamu sekarang diterima, tidak lagi ditolak sebagai "sudah terdaftar".
- **`/auth/register`:** record tamu di-**upgrade** (`isTamu = false`, kode tetap sama), sehingga riwayat hadirnya ikut terbawa.
- **Request OTP `LOGIN`:** no HP tamu mendapat 404 "belum terdaftar", supaya pengguna diarahkan ke pendaftaran.

## Implementasi mobile

- **Daftar event** (`app/event/[id]/register.tsx`): ada bagian **Ajak teman (tamu)** berisi daftar tamu saya dan tombol **+ Tambah tamu** (`src/components/tamu/AddTamuModal.tsx`). Tamu yang baru ditambahkan langsung tercentang.
- **Popup self check-in ibadah:** ada tombol **+ Tambah tamu** (prop `onGuestAdded` di `SelfCheckinModal`).
- **Scanner event & ibadah** (mode check-in, bukan ibadah anak): ada tombol **Tamu** di sebelah Input Manual. Tombol ini membuka `src/components/tamu/WalkInGuestModal.tsx` (nama, no HP, pembayaran untuk event berbayar, dan opsi tetap masukkan kalau kuota penuh).
- **Hasil pencarian manual scanner:** tamu ditandai "Tamu".
- **Kode pendukung:** API di `src/api/tamu.ts`, dan i18n di namespace `tamu`.
