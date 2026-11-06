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
- **Tampilan baru halaman Pelayanan** — daftar: header oranye dengan ajakan melayani & kartu **Tugas berikutnya**, kartu **Pelayanan saya**, grid **Jelajahi** (ikon, tagline, foto anggota). Detail: header dengan ikon & tagline, badge "Anda melayani · peran", statistik (anggota, cabang, peran), aksi cepat (**Atur jadwal**, **Permintaan**, **Chat koordinator**), tab **Anggota / Jadwal / Tentang**; badge **Koordinator** pada pemegang otoritas cabang. Tombol Gabung hanya untuk yang belum anggota.
- **Buka / tutup pendaftaran per cabang** — koordinator punya aksi cepat **Pendaftaran** di detail pelayanan: per cabang otoritasnya **Buka pendaftaran** (catatan untuk calon pendaftar + tutup otomatis 7/14/30 hari) atau **Tutup pendaftaran**. Jemaat melihat badge **Buka pendaftaran** di daftar (plus chip saring) & catatannya di detail; bila ditutup, tombol Gabung diganti keterangan "Pendaftaran di {cabang} sedang ditutup". Tanpa notifikasi. Patokan = cabang jemaat yang mendaftar.
- **Validasi isian lebih ketat** — nama tidak boleh berisi angka/simbol; alamat, judul, catatan, pokok doa, masukan, lokasi, nama usaha/grup harus bermakna (bukan hanya simbol); tanggal lahir tidak di masa depan / > 120 th; tanggal pernikahan hanya untuk status selain Single, tidak di masa depan & wajar terhadap tanggal lahir; nama kantor disembunyikan untuk Belum Bekerja / Ibu Rumah Tangga / Pensiunan; usia tamu 5–110; nominal & alamat web dicek. Aturan yang sama juga dijaga server (berlaku untuk app lama).
- **Ikon & warna pelayanan** — dipilih admin di Portal; tampil di daftar & detail pelayanan, Atur jadwal, Jadwal Pelayanan Saya, kartu tugas di Beranda, Profil saya, profil jemaat, dan petugas di detail ibadah.
- **Tandai banyak ayat sekaligus** — di Alkitab, ketuk beberapa ayat lalu gunakan bar bawah: **Tandai** (semua ayat terpilih; bila semua sudah ditandai → hapus penanda), **Ke catatan**, atau **Bagikan** (rentang ayat mis. 3-5, 8).

## Syarat server
Migrasi `20261107090000_homecell_area_pastor`, `20261108090000_spiritual_journey_request`, `20261111090000_pelayanan_approver`, `20261112090000_ministry_duty_notif`, `20261113090000_pelayanan_ikon_warna`, `20261114090000_pelayanan_pendaftaran` + perubahan core-api (`/admin/me/homecell-area-managed` mengembalikan zona pastor + `myRole`, detail homecell mengirim `area.pastorIds`, `GET /admin/me/homecell/:id/potensial-member`, `GET /admin/me/family/search`, `POST /admin/me/family/link-by-id`, `GET /admin/me/zona-saya`, `POST/DELETE /admin/me/spiritual-journey/request`, `GET/PUT /admin/ministry/:id/jadwal…`) sudah di-deploy sebelum app 2.4.6 dipakai. App 2.4.5 tetap jalan: pastor sudah melihat zonanya, hanya label masih "Area" dan tombol Ubah zona masih tampil (server menolak perubahannya).

## Server & Portal (deploy terpisah, kompatibel dengan app lama)
- Portal → Map View: cari potensial member dari pin homecell (radius km), filter sudah/belum homecell, filter Pastor zona.
- Portal → Zona Homecell: filter Pastor (ikut ke PDF & CSV); PIC zona, PIC homecell, dan pastor bisa diklik.
- Portal → Onboarding config: jumlah kehadiran ibadah untuk promosi otomatis **New Comer → Jemaat Tetap** (migrasi `20261109090000_new_comer_promosi`).
- Portal → Spiritual Journey: persetujuan request update tahap; hapus jemaat dari tahap.
- Portal → Jemaat: kolom email (juga di PDF & CSV), penanda **potensial junk data** (migrasi `20261110090000_jemaat_junk_flag`); data hasil sync Shiftsoft yang sudah dirapikan tidak tertimpa.
- Portal → Audit log: aktor bisa diklik.
- Portal → Pelayanan: anggota per cabang + tambah anggota (cari nama/kode/no HP), otoritas approval, ikon & warna, buka/tutup pendaftaran per cabang.
- Portal → Grup: PIC dicari dengan nama / no HP / email / kode.
- Portal → Kritik & Saran: tampil untuk role yang diberi menu `feedback` di Role Access.

## Google Play — "Yang baru"
**id-ID**
```
Els App 2.4.6:
• Tampilan baru halaman Pelayanan dengan ikon & warna
• Koordinator: atur jadwal pelayanan & buka/tutup pendaftaran
• Anggota pelayanan per cabang
• "Area" kini bernama "Zona", menu Zona untuk semua jemaat
• Cari potensial member di sekitar homecell
• Tambah keluarga: cari dengan nama, email, atau no HP
• Ajukan update tahap Spiritual Journey
• Tandai beberapa ayat sekaligus
• Validasi isian lebih rapi & perbaikan kecil
```
**en-US**
```
Els App 2.4.6:
• Redesigned Ministry page with icons & colors
• Coordinators: schedule servants & open/close registration
• Ministry members grouped by branch
• "Area" is now "Zone", with a Zone menu for every member
• Find potential members near a homecell
• Add family: search by name, email, or phone
• Request a Spiritual Journey stage update
• Bookmark several verses at once
• Cleaner form validation & minor fixes
```

## App Store — "What's New" (en)
```
Els App 2.4.6:
• Redesigned Ministry page with icons & colors
• Coordinators: schedule servants & open/close registration
• Ministry members grouped by branch
• "Area" is now "Zone", with a Zone menu for every member
• Find potential members near a homecell
• Add family: search by name, email, or phone
• Request a Spiritual Journey stage update
• Bookmark several verses at once
• Cleaner form validation & minor fixes
```

## Smoke test
- [ ] Akses cepat → Zona tampil untuk jemaat biasa (zona homecell sendiri, hanya lihat); PIC/pastor melihat zona yang dikelola + badge
- [ ] Pastor zona → detail homecell → badge PASTOR ZONA, bisa kelola jadwal/kehadiran; tombol Ubah zona tidak ada
- [ ] Detail homecell → Potensial member → ubah radius → ketuk nama → profil; telepon/WA sesuai privasi
- [ ] Profil → Keluarga → Tambah → Cari jemaat (nama sebagian / email / no HP lengkap) → Hubungkan
- [ ] Spiritual Journey → Ajukan update tahap → Menunggu → batalkan; ajukan lagi → Portal setujui → notifikasi & tahap tercatat; tolak → alasan tampil
- [ ] Alkitab → pilih 3 ayat → Tandai / Ke catatan / Bagikan (rentang ayat benar)
- [ ] Pelayanan (daftar): header, Tugas berikutnya, Pelayanan saya, grid Jelajahi dengan ikon & warna; mode gelap ikon tidak terang
- [ ] Detail pelayanan sebagai anggota → tidak ada tombol Gabung; badge "Anda melayani · peran"
- [ ] Anggota: default cabang aktif; chip cabang lain & Semua cabang
- [ ] Koordinator → Permintaan → setujui/tolak (hanya pemohon cabang otoritasnya); non-koordinator tidak melihat aksi ini
- [ ] Koordinator → Atur jadwal → hanya cabang otoritas; ibadah: Tanggal ini saja / Setiap jadwal / Kembalikan ke susunan tetap; event cabang; tanda bentrok; petugas dapat notifikasi & muncul di Jadwal Pelayanan Saya
- [ ] Koordinator → Pendaftaran → Buka (catatan + 7 hari) → badge & chip saring di daftar; Tutup → jemaat cabang itu melihat "Pendaftaran di {cabang} sedang ditutup"
- [ ] Ikon pelayanan tampil di Beranda (kartu tugas), Profil saya, profil jemaat, petugas detail ibadah
- [ ] Validasi: nama "Budi123" ditolak; pekerjaan "!!!" ditolak; status Single → tanggal nikah tersembunyi; tanggal lahir masa depan ditolak; usia tamu 3 ditolak
- [ ] App 2.4.5 masih bisa login & membuka pelayanan setelah server di-deploy
