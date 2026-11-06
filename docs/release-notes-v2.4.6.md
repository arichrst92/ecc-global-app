# Els App v2.4.6 — Release Notes (iOS & Android)

Versi sebelumnya: **2.4.5**. Build baru lewat EAS (bukan OTA). Tidak ada modul native baru.

## Isi rilis
- **Area → Zona** — semua label "Area" / "Area Homecell" kini **Zona** (akses cepat, halaman Zona, detail homecell, privasi, pencarian homecell).
- **Pastor zona** — satu zona bisa punya beberapa pastor (diatur di Portal). Pastor:
  - melihat **semua zona yang ia layani** di halaman Zona (tile **Zona** muncul di akses cepat), dengan badge **Pastor** / **PIC** per zona;
  - membuka laporan zona & homecell di dalamnya;
  - di detail homecell punya hak yang sama dengan PIC zona (jadwal & kehadiran, tamu homecell, papan konten, laporan); badge **PASTOR ZONA**;
  - tidak bisa mengubah nama/info zona (tombol Ubah hanya untuk PIC zona).
- **Zona untuk semua jemaat** — tile **Zona** di akses cepat kini selalu tampil. Jemaat yang bukan PIC/pastor melihat zona dari homecell yang diikuti (nama, cabang, zone leader, pastor, daftar homecell di zona itu; homecell sendiri ditandai) — hanya lihat. Belum ikut homecell → ajakan **Cari homecell**. Kartu zona bisa diketuk untuk membuka/menutup daftar homecell-nya (terbuka otomatis bila hanya satu zona).
- **Potensial member homecell** — tombol **Potensial member** di detail homecell (pemimpin homecell, PIC & pastor zona): daftar jemaat yang belum ikut homecell dan rumahnya (perkiraan dari alamat) dalam radius yang bisa diatur (− / +, 0,5–50 km), urut terdekat, dengan jenis kelamin, usia, cabang, serta tombol telepon & WhatsApp. Ketuk nama untuk membuka profilnya. No HP & usia mengikuti pengaturan privasi masing-masing jemaat; alamat tidak ditampilkan.
- **Tambah keluarga — Cari jemaat** — pilihan "Cari via Nomor HP" diganti **Cari jemaat**: cari dengan nama (sebagian, min. 3 huruf), email, atau no HP (keduanya harus lengkap). Hasil hanya menampilkan nama, foto, kode & cabang; yang sudah terhubung ditandai. Pilih orangnya → pilih hubungan → Hubungkan.
- **Request update Spiritual Journey** — di halaman Spiritual Journey ada tombol **Ajukan update tahap**: pilih tahap terakhir yang sudah dicapai + catatan (mis. tanggal & tempat baptis). Status "Menunggu persetujuan" tampil (bisa dibatalkan). Admin menyetujui di Portal → tahap itu dan semua tahap sebelumnya tercatat, jemaat mendapat notifikasi; ditolak → alasan ditampilkan.
- **Anggota ministry per cabang** — daftar anggota di halaman ministry default hanya cabang yang sedang dibuka; chip di atas daftar untuk pindah ke cabang lain atau **Semua cabang** (dengan jumlah per cabang).
- **Approval request bergabung ministry** — hanya anggota yang diberi **otoritas approval** di Portal (per cabang) yang melihat & bisa menyetujui/menolak request, dan hanya untuk pemohon dari cabang tsb (berlaku juga di app lama lewat server). Leader tanpa otoritas tidak lagi bisa approve.
- **Atur jadwal pelayanan** — pemegang otoritas (diberikan di Portal, per cabang) punya tombol **Atur jadwal pelayanan** di halaman ministry: daftar ibadah yang memakai pelayanan itu & event cabangnya 8 minggu ke depan (kuning = belum ada petugas). Ketuk → tambah / hapus petugas dan ubah perannya; untuk ibadah pilih **Tanggal ini saja** atau **Setiap jadwal** (susunan tetap), serta **Kembalikan ke susunan tetap**. Saat memilih petugas tampil tanda bentrok di hari yang sama dan jumlah tugas bulan ini. Petugas mendapat notifikasi dan melihatnya di Jadwal Pelayanan Saya. Hak scan kehadiran tidak diatur dari app.
- **Tandai banyak ayat sekaligus** — di Alkitab, ketuk beberapa ayat lalu gunakan bar bawah: **Tandai** (semua ayat terpilih; bila semua sudah ditandai → hapus penanda), **Ke catatan**, atau **Bagikan** (rentang ayat mis. 3-5, 8).

## Syarat server
Migrasi `20261107090000_homecell_area_pastor`, `20261108090000_spiritual_journey_request`, `20261111090000_pelayanan_approver`, `20261112090000_ministry_duty_notif` + perubahan core-api (`/admin/me/homecell-area-managed` mengembalikan zona pastor + `myRole`, detail homecell mengirim `area.pastorIds`, `GET /admin/me/homecell/:id/potensial-member`, `GET /admin/me/family/search`, `POST /admin/me/family/link-by-id`, `GET /admin/me/zona-saya`, `POST/DELETE /admin/me/spiritual-journey/request`, `GET/PUT /admin/ministry/:id/jadwal…`) sudah di-deploy sebelum app 2.4.6 dipakai. App 2.4.5 tetap jalan: pastor sudah melihat zonanya, hanya label masih "Area" dan tombol Ubah zona masih tampil (server menolak perubahannya).

## Google Play — "Yang baru" (id-ID)
```
Els App 2.4.6:
• "Area" kini bernama "Zona"
• Pastor zona dapat melihat semua zona yang dilayani
• Cari potensial member di sekitar homecell
• Tambah keluarga: cari dengan nama, email, atau no HP
• Ajukan update tahap Spiritual Journey
• Tandai beberapa ayat sekaligus
• Menu Zona untuk semua jemaat
• Perbaikan kecil
```

## App Store — "What's New" (en)
```
Els App 2.4.6:
• "Area" is now called "Zone"
• Zone pastors can view all the zones they serve
• Find potential members near a homecell
• Add family: search by name, email, or phone
• Request a Spiritual Journey stage update
• Bookmark several verses at once
• Zone menu for every member
• Minor fixes
```
