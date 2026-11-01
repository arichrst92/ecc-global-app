# Els App v2.4.5 — Release Notes (iOS & Android)

Versi sebelumnya: **2.4.4**. Build baru lewat EAS (bukan OTA). Tidak ada modul native baru.

## Isi rilis
- **Kategori tamu** — setiap form tamu kini menanyakan kategori: **Belum ditentukan** (default) · **New Comer** (orang baru, berpotensi berjemaat) · **Visitor saja** (hanya berkunjung).
  - Tambah tamu (Tamu saya, reservasi/daftar event untuk tamu, popup self check-in).
  - Usher / scanner: catat tamu walk-in ibadah & event.
  - Homecell: pemimpin/PIC menambah tamu.
  - Mode tamu → Cari Homecell → minta bergabung: tamu memilih sendiri ("Belum tahu" / "Ingin bergabung" / "Sekadar berkunjung"); pemimpin homecell melihat pilihannya.
  - Daftar Tamu saya & tamu homecell menampilkan kategori.
- **Batalkan check-in** — self check-in yang salah (mis. ikut men-check-in-kan keluarga yang tidak hadir) bisa dibatalkan sendiri dari tiket sampai ibadah selesai; kembali "Terdaftar" bila sebelumnya reservasi, selain itu "Dibatalkan". Ulasan di tiket itu ikut terhapus. Check-in hasil scan usher & CKids tetap lewat usher/admin.
- **Ibadah yang sudah selesai** — di Beranda (Ibadah Hari Ini), daftar ibadah, mode tamu, dan detail ibadah: kartu diburamkan + label **Sudah selesai** (menurut jam selesai di zona waktu cabang), diletakkan paling bawah; tombol **Reservasi** dan self check-in disembunyikan.
- **Popup self check-in** punya tombol tutup (×) di pojok kanan atas.
- Server & Portal (deploy terpisah, sudah kompatibel dengan app lama): kolom & filter kategori di Portal → Tamu (bisa diubah admin), laporan ibadah/event/cabang/homecell area + PDF/CSV dipecah per kategori, monitor ibadah/event. Data tamu lama = "Belum ditentukan". Follow-up tetap untuk semua tamu; tamu yang mendaftar akun mengikuti alur standar.

## Syarat server
Migrasi `20261101090000_tamu_kategori` sudah di-deploy sebelum app 2.4.5 dipakai (app lama tetap jalan tanpa kategori).

## Google Play — "Yang baru" (id-ID)
```
Els App 2.4.5:
• Kategori tamu: New Comer atau Visitor saat menambah tamu
• Minta bergabung homecell: pilih tujuan Anda
• Batalkan check-in yang salah dari tiket
• Perbaikan & peningkatan stabilitas
```
**en-US**
```
Els App 2.4.5:
• Guest category: New Comer or Visitor when adding a guest
• Joining a homecell as a guest: tell us what brings you
• Undo a mistaken check-in from your ticket
• Fixes & stability improvements
```

## Smoke test
- [ ] Self check-in ibadah (tanpa reservasi) → tiket → **Batalkan check-in** → status Dibatalkan; dengan reservasi → kembali Terdaftar; setelah ibadah selesai tombol hilang
- [ ] Popup self check-in → tombol × menutup popup
- [ ] Setelah jam selesai ibadah hari ini: Beranda & daftar ibadah menampilkan kartu buram "Sudah selesai" di bawah; detail ibadah tanggal itu tanpa tombol Reservasi
- [ ] Tamu saya → Tambah tamu → pilih New Comer → Portal → Tamu menampilkan New Comer
- [ ] Usher walk-in tamu ibadah & event dengan kategori Visitor
- [ ] Homecell → tambah tamu (default Belum ditentukan)
- [ ] Mode tamu → minta bergabung homecell → "Ingin bergabung" → pemimpin melihat "Ingin bergabung" → setujui → Portal: New Comer
- [ ] Portal → ubah kategori; laporan ibadah/event menampilkan kolom kategori
