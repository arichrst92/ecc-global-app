# Els App v2.4.7 — Release Notes (iOS & Android)

Versi sebelumnya: **2.4.6**. Build baru lewat EAS (bukan OTA). Tidak ada modul native baru (hanya tambahan Android app link `/local-market`).

## Isi rilis
- **Akses Cepat** — ikon & label sedikit lebih besar (ikon 22→25, label 10→11,5 pt) dengan susunan grid yang sama.
- **Banner "Sedang menjelajahi" cabang lain** (Beranda, Event, Ibadah) — gradient oranye dengan tulisan putih (sebelumnya kuning dengan label hitam); di Beranda tidak lagi tertutup jam / sinyal / baterai.
- **Keluarkan anggota homecell dengan alasan** — ⋯ → Keluarkan dari homecell → popup konfirmasi dengan pilihan alasan wajib: *Salah invite member*, *Member sudah tidak aktif*, *Member berpindah homecell*, *Member berpindah kota*, atau *Alasan lain* (diketik). Alasan tampil di anggota nonaktif (app) & riwayat homecell di profil jemaat (Portal). Server kini hanya mengizinkan PIC homecell, PIC/pastor zona, atau admin mengeluarkan anggota.
- **Keyboard tidak menutupi isian (Android)** — semua form & lembar isian kini naik di atas keyboard di Android (mode layar penuh): login/daftar, edit profil, doa, kritik & saran, resolusi, catatan & Bible 365, visit, tamu, keluarga, group, homecell (jadwal, materi, gabung sebagai tamu, alasan tolak), zona, usaha, hapus akun, scanner (kode manual & jemput), pengumuman/voting, ajukan Spiritual Journey, gabung & tinjau pelayanan, pendaftaran pelayanan, daftar event, dan ulasan di tiket. iOS tetap seperti sebelumnya.
- **Ubah jadwal pertemuan homecell** — ikon pensil di detail pertemuan: ubah tanggal, jam, lokasi, catatan (form yang sama dengan Buat Jadwal), juga setelah absen tercatat. Untuk PIC homecell, PIC / pastor zona, dan asisten. Tanpa notifikasi ke anggota.
- **Asisten homecell** — PIC homecell (atau PIC / pastor zona) menunjuk anggota aktif sebagai **asisten** lewat tombol ⋯ di daftar anggota (**Jadikan asisten / Lepas asisten**; jumlah tidak dibatasi). Asisten mendapat notifikasi, badge **Asisten**, dan tombol **Kelola** di halaman homecell untuk: **buat jadwal pertemuan, absen (scan / manual), catat tamu, pengumuman, voting, dan lampiran**. Asisten tidak bisa menambah/mengeluarkan anggota, menghapus jadwal, mengubah info homecell, laporan, atau memproses permintaan bergabung. Keluar dari homecell → status asisten lepas.
- **Tambah keluarga harus disetujui** — menambah jemaat yang sudah punya akun (scan QR, input kode, Cari jemaat, no HP) kini mengirim **permintaan**; orangnya (atau **wali utamanya** bila ia tanggungan tanpa HP) menyetujui / menolak di menu **Keluarga** dan mendapat notifikasi. Pemohon melihat daftar **Menunggu persetujuan** (bisa dibatalkan) dan notifikasi hasilnya. "Daftarkan Baru" (balita / lansia tanpa HP) tetap langsung. Hasil Cari jemaat menandai orang yang permintaannya masih menunggu.
- **Pencarian jemaat (input manual) layar penuh** — kolom cari di atas, keyboard tidak menutupi, hasil bisa digulir & diketuk sampai baris terakhir (tambah anggota homecell, kehadiran homecell, scanner ibadah/event, group, keluarga scan, visit, Cari jemaat di Keluarga, dan pilih petugas di Atur jadwal pelayanan).
- **Spiritual Journey** — catatan pengajuan update tahap kini opsional.
- **Lokasi homecell** — kolom lokasi (Edit homecell & Atur lokasi) menerima link Google Maps apa pun (tautan Bagikan, link tempat / alamat) atau koordinat; titik dicari otomatis oleh server. Keyboard tidak lagi menutupi kolom / tombol simpan.
- **Group** — permintaan bergabung hanya tampil untuk PIC group.
- **Daftar event (konfirmasi)** — ringkasan event menampilkan gambar event sesuai rasio aslinya (ikon 🎉 dihapus).
- **Atur jadwal pelayanan (mode gelap)** — kartu "Belum ada petugas" tanpa border kuning.
- **Detail event** — kartu "Tiket Saya" tanpa gambar & judul (sudah ada di atas), cukup peserta, QR, status, dan check-in; ukuran judul bagian, ikon, dan kartu "Tentang Event" diseragamkan dengan detail ibadah.
- **Katalog Local Market** — pemilik usaha: Usaha Saya → bisnis → **Katalog produk & jasa**: tambah item (Produk / Jasa), nama, deskripsi, sampai 4 foto (dipotong 3:2, foto pertama jadi sampul), harga **Tetap / Mulai dari / By agreement** + **mata uang** (IDR, AUD, SGD, MYR, USD, EUR, NZD, HKD, TWD, CNY, JPY) + satuan, tampil/sembunyikan, urutan naik/turun. Jumlah item per bisnis dibatasi global dari Portal; item langsung tampil (admin Portal bisa menyembunyikan).
- **Detail bisnis Local Market** — tombol **WhatsApp admin** & **Email**, grid katalog 2 kolom (filter Semua/Produk/Jasa). Detail item: galeri foto 3:2, harga, **Tanya via WhatsApp** (pesan otomatis berisi nama item, harga, dan link), Email, Bagikan link item (pratinjau WhatsApp memakai foto item).
- **Form usaha** — kolom **Nomor WhatsApp admin** & **Email bisnis**; sosial media cukup isi **username** (Instagram, Facebook, TikTok, YouTube, X, LinkedIn, Threads — semua opsional). Kolom link "Chat WhatsApp" dihapus (digantikan WhatsApp admin); data sosmed lama otomatis terbaca sebagai username.
- **Self check-in setelah ibadah selesai** — selama masa tenggang 30 menit, tampil hitung mundur **"Self check-in akan berakhir dalam mm:ss"** (Beranda, detail ibadah, dan tiket di Reservasi Saya); saat habis, tombol/geser self check-in langsung hilang.
- **Local Market: ikon & tab** — detail usaha kini: ikon sosial media (lingkaran) & toko online Shopee/Lazada/TikTok Shop/Tokopedia (kotak) yang bisa diketuk — hanya yang ada datanya; tombol **WhatsApp** & Email; lalu tab **Katalog (n)** | **Info** (deskripsi, lokasi + **Buka di Google Maps**, website, company profile, pemilik). Detail item: baris **Beli juga di** berisi link produk di marketplace (link kosong tidak memakai link toko). Form usaha: kolom **Link Google Maps** & **Toko online** (4 link, dicek domainnya); form item: 4 link produk.
- **Partner usaha (Local Market)** — di form usaha bagian **Pemilik & partner** → **Undang partner** (cari nama/no HP/kode jemaat). Orangnya mendapat notifikasi dan **Terima / Tolak** di Usaha Saya. Partner yang menerima punya hak sama dengan pemilik (ubah usaha, katalog, partner, hapus usaha); jumlah tidak dibatasi; partner bisa **Keluar sebagai partner**. Detail usaha (tab Info) menampilkan **Pemilik & partner**; Portal menampilkan partner di detail usaha.
- **Jumlah kunjungan Local Market** — pemilik melihat "Dilihat N kali" di form usaha dan jumlah kunjungan per item di Katalog; Portal menampilkan kunjungan usaha & item. Dihitung dari app + web, pemilik sendiri tidak dihitung, satu pengunjung dihitung sekali per 30 menit, bot pratinjau link diabaikan.
- **Catatan (tulis / pratinjau)** — kotak isi kini memanjang sampai toolbar di bawah dan ikut memanjang mengikuti isi (halaman yang digulir), tidak lagi terpotong.
- **Upload foto usaha & katalog** — nama/tipe file diambil dari picker; di versi web foto dikirim sebagai file asli (sebelumnya gagal "File foto wajib (multipart)").

## Syarat server
Migrasi `20261115090000_family_link_request`, `20261116090000_homecell_asisten`, `20261117090000_homecell_member_alasan_keluar`, `20261118090000_local_market_katalog`, `20261119090000_local_market_view_count`, `20261120090000_local_market_marketplace`, `20261121090000_local_business_partner` + core-api & landing terbaru (katalog `/admin/me/businesses/:id/items…`, `/public/local-market/:id/item/:itemId`, halaman web `/local-market/:id/item/:itemId` dengan OG image) (`PATCH /admin/homecell/:id/schedule/:scheduleId`, `/admin/me/family/requests…`, link-by-* jadi permintaan, catatan SJ opsional, resolver link Google Maps tanpa koordinat, request join group/homecell hanya PIC di app).
App 2.4.6 ke bawah: menambah keluarga berakun juga menjadi permintaan — app lama menampilkan pesan "Permintaan terkirim…"; persetujuan dilakukan dari app 2.4.7.

## Google Play — "Yang baru"
**id-ID**
```
Els App 2.4.7:
• Tambah keluarga kini perlu persetujuan orangnya
• PIC homecell bisa menunjuk asisten
• Setujui / tolak permintaan keluarga di menu Keluarga
• Pencarian jemaat manual lebih mudah (keyboard tidak menutupi)
• Katalog produk & jasa di Local Market + tanya via WhatsApp
• Catatan pengajuan Spiritual Journey opsional
• Perbaikan kecil
```
**en-US**
```
Els App 2.4.7:
• Adding family now requires their approval
• Homecell leaders can appoint assistants
• Approve / decline family requests in the Family menu
• Easier manual member search (keyboard no longer covers it)
• Local Market product & service catalog + ask via WhatsApp
• Spiritual Journey request notes are optional
• Minor fixes
```

## App Store — "What's New" (en)
```
Els App 2.4.7:
• Adding family now requires their approval
• Homecell leaders can appoint assistants
• Approve / decline family requests in the Family menu
• Easier manual member search (keyboard no longer covers it)
• Local Market product & service catalog + ask via WhatsApp
• Spiritual Journey request notes are optional
• Minor fixes
```

## Smoke test
- [ ] PIC → ⋯ anggota → Keluarkan dari homecell → tombol Keluarkan nonaktif sampai alasan dipilih; Alasan lain wajib diketik → anggota pindah ke nonaktif dengan alasannya; Portal → profil jemaat → riwayat homecell menampilkan alasan
- [ ] Android: buka beberapa form (Doa baru, Kritik & Saran, Tambah tamu, Gabung pelayanan → motivasi, Tolak permintaan homecell, ulasan di tiket) → ketik di kolom paling bawah → kolom & tombol simpan tetap terlihat di atas keyboard
- [ ] Detail pertemuan (sudah ada absen) → pensil → ubah jam & lokasi → Simpan Perubahan → detail & daftar jadwal ter-update, absen tetap
- [ ] Asisten bisa mengubah jadwal; anggota biasa tidak melihat pensil
- [ ] Detail event yang sudah didaftar → Tiket Saya tanpa gambar; ketuk → tiket penuh (dengan gambar) tetap normal
- [ ] PIC → detail homecell → ⋯ pada anggota → Jadikan asisten → badge Asisten; anggota dapat notifikasi
- [ ] Asisten → homecell (view) → Kelola → Buat jadwal, scan/absen manual, catat tamu, upload lampiran, buat pengumuman & voting berhasil
- [ ] Asisten tidak melihat tombol tambah anggota, ⋯ anggota, Laporan/Ubah/Potensial member, hapus jadwal
- [ ] Lepas asisten / anggota dikeluarkan → akses kelola hilang
- [ ] A cari jemaat B → pilih hubungan → Tambahkan → toast "Permintaan terkirim…", B belum ada di Keluarga A; A melihat B di "Menunggu persetujuan"
- [ ] B dapat notifikasi → Keluarga → kartu permintaan → Setujui → A & B saling terhubung (hubungan balik benar), A dapat notifikasi disetujui
- [ ] Ulangi dengan Tolak → A dapat notifikasi ditolak; A Batalkan permintaan yang masih menunggu
- [ ] A scan QR / input kode C yang tanggungan (tanpa HP) → permintaan masuk ke wali C
- [ ] Wali menambahkan tanggungannya sendiri via kode → langsung terhubung
- [ ] Cari jemaat → orang yang permintaannya menunggu ditandai "Menunggu persetujuan"
- [ ] App 2.4.6 → tambah keluarga → muncul pesan "Permintaan terkirim…"
- [ ] Daftarkan Baru (balita) → langsung masuk Keluarga
- [ ] Tambah anggota homecell → input manual → keyboard tidak menutupi, hasil bisa diketuk (Android & iOS)
- [ ] Spiritual Journey → ajukan update tanpa catatan → terkirim
- [ ] Group: Fulltimer non-PIC tidak melihat permintaan bergabung
- [ ] Portal → Local Market → Batas katalog = 3 → simpan
- [ ] Pemilik → Usaha Saya → bisnis → isi WA admin (08…), email, username Instagram "@usahaku" → Simpan → detail publik: tombol WhatsApp admin & Email; Sosial Media → instagram.com/usahaku
- [ ] Katalog → Tambah item Produk, 2 foto (crop 3:2), harga Tetap IDR 150000 /porsi → tampil "Rp 150.000/porsi"; item Jasa harga By agreement; item USD Mulai dari 20 → "Mulai US$ 20"
- [ ] Item ke-4 ditolak (batas 3); ubah urutan naik/turun; nonaktifkan item → hilang dari detail publik
- [ ] Jemaat → detail bisnis → grid katalog & filter Produk/Jasa → detail item → Tanya via WhatsApp membuka chat dengan pesan + link; Email membuka aplikasi email
- [ ] Bagikan link item ke WhatsApp → pratinjau berisi foto item, nama, harga; link membuka halaman web item (dan app di Android 2.4.7)
- [ ] Portal → detail bisnis → Katalog → Sembunyikan item → item hilang dari app & web, pemilik melihat label "Disembunyikan admin"
- [ ] Bisnis lama dengan link sosmed → form usaha menampilkan username terisi
- [ ] Akun lain buka detail usaha & item (app dan web) → Portal / form usaha pemilik: kunjungan bertambah 1; buka ulang dalam 30 menit tidak menambah; pemilik membuka sendiri tidak menambah
- [ ] Tambah foto item & hero/logo usaha (Android, iOS, dan web) → berhasil
- [ ] Catatan → tulis teks panjang → kotak isi memenuhi layar sampai toolbar & memanjang, teks tidak terpotong (iOS, Android, web)
- [ ] Form usaha: isi link Google Maps + link Shopee & Tokopedia → detail usaha: ikon Shopee & Tokopedia saja (Lazada/TikTok Shop tidak tampil), Info → Buka di Google Maps membuka Maps
- [ ] Link Shopee diisi domain lain (mis. evil.com) → ditolak "Link Shopee tidak valid"
- [ ] Item: isi link TikTok Shop saja → detail item "Beli juga di" hanya TikTok Shop; item tanpa link → baris tidak tampil (walau usaha punya link toko)
- [ ] Usaha dengan item → tab Katalog terbuka lebih dulu; usaha tanpa item → langsung Info tanpa tab
- [ ] Ikon sosmed hanya untuk username yang diisi; mode gelap: ikon TikTok/X/Threads tetap terlihat
- [ ] Ibadah yang baru selesai → Beranda, detail ibadah, & tiket menampilkan "Self check-in akan berakhir dalam 29:xx" berjalan per detik; saat 00:00 tombol/geser self check-in hilang tanpa perlu refresh
- [ ] Pemilik → Undang partner B → B dapat notifikasi → Usaha Saya: kartu undangan → Terima → usaha muncul di daftar B dengan badge Partner; pemilik dapat notifikasi diterima
- [ ] B mengubah info, katalog, foto, dan mengundang C → berhasil; B Keluar sebagai partner → usaha hilang dari daftar B, pemilik dapat notifikasi
- [ ] Tolak undangan → pemilik dapat notifikasi ditolak; batalkan undangan yang masih menunggu
- [ ] Detail usaha (jemaat) → tab Info: Pemilik & partner; Portal → detail usaha: Partner
