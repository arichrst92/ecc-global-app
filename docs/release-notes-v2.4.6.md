# Els App v2.4.6 — Release Notes (iOS & Android)

Versi sebelumnya: **2.4.5**. Build baru lewat EAS (bukan OTA). Tidak ada modul native baru.

## Isi rilis
- **Area → Zona** — semua label "Area" / "Area Homecell" kini **Zona** (akses cepat, halaman Zona, detail homecell, privasi, pencarian homecell).
- **Pastor zona** — satu zona bisa punya beberapa pastor (diatur di Portal). Pastor:
  - melihat **semua zona yang ia layani** di halaman Zona (tile **Zona** muncul di akses cepat), dengan badge **Pastor** / **PIC** per zona;
  - membuka laporan zona & homecell di dalamnya;
  - di detail homecell punya hak yang sama dengan PIC zona (jadwal & kehadiran, tamu homecell, papan konten, laporan); badge **PASTOR ZONA**;
  - tidak bisa mengubah nama/info zona (tombol Ubah hanya untuk PIC zona).

## Syarat server
Migrasi `20261107090000_homecell_area_pastor` + perubahan core-api (`/admin/me/homecell-area-managed` mengembalikan zona pastor + `myRole`, detail homecell mengirim `area.pastorIds`) sudah di-deploy sebelum app 2.4.6 dipakai. App 2.4.5 tetap jalan: pastor sudah melihat zonanya, hanya label masih "Area" dan tombol Ubah zona masih tampil (server menolak perubahannya).

## Google Play — "Yang baru" (id-ID)
```
Els App 2.4.6:
• "Area" kini bernama "Zona"
• Pastor zona dapat melihat semua zona yang dilayani
• Perbaikan kecil
```

## App Store — "What's New" (en)
```
Els App 2.4.6:
• "Area" is now called "Zone"
• Zone pastors can view all the zones they serve
• Minor fixes
```
