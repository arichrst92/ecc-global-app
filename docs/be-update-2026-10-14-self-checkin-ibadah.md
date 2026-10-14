# BE Update: Self Check-in Ibadah (saya + keluarga)

**Date**: 2026-10-14

## Endpoint

| Method | Path | Keterangan |
|---|---|---|
| GET | `/admin/me/ibadah/:id/self-checkin` | Status jendela self check-in hari ini + daftar saya & keluarga |
| POST | `/admin/me/ibadah/:id/self-checkin` | Body `{ jemaatIds: string[] }` (1–20). Check-in saya dan/atau keluarga |

Respons GET:

```jsonc
{
  "available": true,             // tombol Self Check-in hanya tampil kalau true
  "reason": null,                // INACTIVE | KIDS_IBADAH | NOT_TODAY | CANCELLED | TOO_EARLY | ENDED
  "reasonText": null,
  "tanggal": "2026-10-18",       // occurrence hari ini (WIB)
  "opensAt": "…", "closesAt": "…",
  "ibadah": { "id": "…", "nama": "…", "jamMulai": "09:00", "jamSelesai": "11:00", "lokasi": "…" },
  "members": [{ "id": "…", "namaLengkap": "…", "fotoUrl": null, "isSelf": true, "relasi": null, "status": "NONE", "checkedInAt": null }]
}
```

Respons POST: `{ tanggal, results: [{ jemaatId, namaLengkap, result: "CHECKED_IN" | "ALREADY" | "FAILED", message? }] }`.

## Aturan

- **Kapan bisa:** self check-in hanya bisa dilakukan di hari ibadah sesuai jadwal (WEEKLY, BIWEEKLY, MONTHLY, atau ONCE) dan pada occurrence yang tidak dibatalkan. Jendelanya dibuka **15 menit sebelum jamMulai sampai jamSelesai**, menurut waktu WIB. Di luar jendela itu, POST mengembalikan 400 `SELF_CHECKIN_<REASON>`.
- **Siapa yang bisa di-check-in:** diri sendiri dan keluarga, dengan cakupan yang sama seperti menu Keluarga. Artinya relasi langsung, anak/orang tua/saudara dari pasangan, dan tanggungan. Kalau ada ID di luar keluarga, server menolak dengan 400.
- **Ibadah anak** (`isKidsIbadah`) tidak bisa self check-in, karena check-in anak tetap dilakukan di meja CKids yang mengeluarkan kode jemput.
- **Penyimpanan:** self check-in tercatat di tabel reservasi yang sama dengan scan QR petugas (status `JOIN`). Reservasi yang sudah ada diubah ke JOIN, dan kalau belum ada, reservasi baru dibuat.

## Implementasi mobile

- **Tombol:** `app/ibadah/[id].tsx` punya tombol **Self Check-in** di sebelah **Tampilkan QR Saya**. Tombol ini hanya muncul saat `available`. Statusnya di-refetch tiap 60 detik, dan setelah semua check-in labelnya berubah menjadi "Sudah Check-in".
- **Popup:** `src/components/ibadah/SelfCheckinModal.tsx` menampilkan pertanyaan "Apakah Anda sudah berada di ruang ibadah?" dan daftar saya & keluarga untuk dicentang. Nama yang sudah check-in ditandai hijau. Tombolnya **Tidak** dan **Ya, saya di lokasi ibadah**.

## Sinkron jam HP ↔ server (update)

- **Jendela:** sekarang **15 menit** sebelum jam mulai sampai jam selesai.
- **`serverNow`:** GET sekarang mengirim `serverNow` (ISO UTC). Mobile (`src/utils/serverClock.ts`) menyimpan selisih jam HP terhadap server, dengan koreksi latensi. Buka/tutup tombol dihitung dari **jam server**, sehingga jam atau zona waktu HP yang salah tidak berpengaruh. Teks jam ditampilkan dalam WIB.
- **Refetch:** status di-refetch tepat di batas buka/tutup, ditambah setiap 60 detik.
- **Validasi akhir** tetap di server: POST ditolak di luar jendela.

## Hitung mundur (update)

- **Kapan tampil:** saat hari ini ada ibadah tetapi self check-in belum dibuka (`reason = TOO_EARLY`). Detail ibadah lalu menampilkan **"Self check-in akan tersedia dalam hh:mm:ss"** beserta jam bukanya dalam WIB. Komponennya ada di `src/components/ibadah/SelfCheckinCountdown.tsx`.
- **Detik demi detik:** hitung mundur berjalan per detik memakai jam server (`serverNowMs`).
- **Saat mencapai 00:00:00:** kotak hitung mundur hilang, tombol **Self Check-in** muncul, dan status di-refetch dari server.
