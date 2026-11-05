# Els App v2.4.6 — Release Notes (iOS & Android)

Versi sebelumnya: **2.4.5**. Build baru lewat EAS (bukan OTA). Tidak ada modul native baru.

## Isi rilis
- **Area → Zona** — semua label "Area" / "Area Homecell" kini **Zona** (akses cepat, halaman Zona, detail homecell, privasi, pencarian homecell).
- **Pastor zona** — satu zona bisa punya beberapa pastor (diatur di Portal). Pastor:
  - melihat **semua zona yang ia layani** di halaman Zona (tile **Zona** muncul di akses cepat), dengan badge **Pastor** / **PIC** per zona;
  - membuka laporan zona & homecell di dalamnya;
  - di detail homecell punya hak yang sama dengan PIC zona (jadwal & kehadiran, tamu homecell, papan konten, laporan); badge **PASTOR ZONA**;
  - tidak bisa mengubah nama/info zona (tombol Ubah hanya untuk PIC zona).
- **Potensial member homecell** — tombol **Potensial member** di detail homecell (pemimpin homecell, PIC & pastor zona): daftar jemaat yang belum ikut homecell dan rumahnya (perkiraan dari alamat) dalam radius yang bisa diatur (− / +, 0,5–50 km), urut terdekat, dengan jenis kelamin, usia, cabang, serta tombol telepon & WhatsApp. No HP & usia mengikuti pengaturan privasi masing-masing jemaat; alamat tidak ditampilkan.
- **Tambah keluarga — Cari jemaat** — pilihan "Cari via Nomor HP" diganti **Cari jemaat**: cari dengan nama (sebagian, min. 3 huruf), email, atau no HP (keduanya harus lengkap). Hasil hanya menampilkan nama, foto, kode & cabang; yang sudah terhubung ditandai. Pilih orangnya → pilih hubungan → Hubungkan.

## Syarat server
Migrasi `20261107090000_homecell_area_pastor` + perubahan core-api (`/admin/me/homecell-area-managed` mengembalikan zona pastor + `myRole`, detail homecell mengirim `area.pastorIds`, `GET /admin/me/homecell/:id/potensial-member`, `GET /admin/me/family/search`, `POST /admin/me/family/link-by-id`) sudah di-deploy sebelum app 2.4.6 dipakai. App 2.4.5 tetap jalan: pastor sudah melihat zonanya, hanya label masih "Area" dan tombol Ubah zona masih tampil (server menolak perubahannya).

## Google Play — "Yang baru" (id-ID)
```
Els App 2.4.6:
• "Area" kini bernama "Zona"
• Pastor zona dapat melihat semua zona yang dilayani
• Cari potensial member di sekitar homecell
• Tambah keluarga: cari dengan nama, email, atau no HP
• Perbaikan kecil
```

## App Store — "What's New" (en)
```
Els App 2.4.6:
• "Area" is now called "Zone"
• Zone pastors can view all the zones they serve
• Find potential members near a homecell
• Add family: search by name, email, or phone
• Minor fixes
```
