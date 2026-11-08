# Els App v2.4.8 — Release Notes (iOS & Android)

Versi sebelumnya di toko: **2.4.6**. Rilis ini **menggabungkan 2.4.7 + 2.4.8** (2.4.7 tidak dirilis terpisah). Build baru lewat EAS (bukan OTA). Tidak ada modul native baru (hanya tambahan Android app link `/local-market`).

## Isi rilis

### Perbaikan 2.4.8 (setelah uji 2.4.7)
- **Tombol bawah lembar tidak tertutup navigasi Android** — 31 lembar isian/pilihan (Tambah tamu, Reservasi, Tamu walk-in, Ganti no HP, Pilih tanggal, filter Local Market, materi homecell, scanner, dll.) memberi ruang setinggi bilah navigasi; HP bertombol fisik tidak mendapat celah tambahan.
- **Isian tidak tertutup keyboard** — Pesan untuk pemimpin saat minta bergabung homecell (halaman otomatis bergulir ke kolom & tombol) dan kolom industri di filter Local Market.
- **Detail hadiah CKids di HP lipat / layar lebar** — foto dibatasi tingginya dan isi lembar bisa digulir sampai tombol Tutup; lembar filter Local Market, mata uang katalog, dan pilih cabang memakai pola yang sama (gulir lebih andal di Android).
- **Status bar di halaman ber-hero** — Beranda, detail usaha & item Local Market, detail event, berita, renungan, dan pelayanan: konten tidak lagi menabrak jam/sinyal/baterai saat digulir; tombol di atas foto Local Market selalu di bawah area aman atas.

### Local Market (usaha jemaat)
- **Katalog produk & jasa** — Usaha Saya → usaha → **Katalog produk & jasa**: item Produk / Jasa, nama, deskripsi, sampai 4 foto (dipotong 3:2, foto pertama jadi sampul), harga **Tetap / Mulai dari / By agreement** + **mata uang** (IDR, AUD, SGD, MYR, USD, EUR, NZD, HKD, TWD, CNY, JPY) + satuan, tampil/sembunyikan, urutan naik/turun. Batas item per usaha diatur global di Portal; item langsung tampil (admin Portal bisa menyembunyikan).
- **Detail usaha baru** — ikon sosial media (lingkaran) & toko online **Shopee / Lazada / TikTok Shop / Tokopedia** (kotak) yang bisa diketuk, hanya yang diisi; tombol **WhatsApp** & **Email**; tombol **Buka lokasi di Google Maps** (bila link diisi); lalu tab **Katalog (n)** | **Info** (deskripsi, lokasi, website, company profile, **Pemilik & partner**). Pernyataan: *"ECC hanya memfasilitasi bisnis jemaat dan tidak mengambil keuntungan dalam bentuk apa pun."*
- **Detail item** — galeri foto 3:2, harga, **Beli juga di** (link produk di marketplace; link kosong tidak memakai link toko), **Tanya via WhatsApp** (pesan otomatis berisi nama item, harga, dan link), Email, Bagikan.
- **Bagikan** — usaha & item bisa dibagikan (detail usaha, Usaha Saya, detail item); pratinjau WhatsApp memakai foto sampul / foto item; link terbuka di browser untuk yang belum punya app (dan langsung di app Android 2.4.8).
- **Form usaha** — Nomor WhatsApp, Email, **Link Google Maps**, sosial media cukup **username** (Instagram, Facebook, TikTok, YouTube, X, LinkedIn, Threads), **Toko online** (4 link, dicek domainnya). Kolom "Chat WhatsApp" lama dihapus; sosmed lama otomatis terbaca sebagai username. Ketikan tidak hilang saat upload foto sebelum Simpan.
- **Partner usaha** — bagian **Pemilik & partner** → **Undang partner** (cari nama/no HP/kode jemaat yang punya akun). Orangnya mendapat notifikasi dan **Terima / Tolak** di Usaha Saya (perlu app 2.4.8). Partner punya hak sama dengan pemilik (ubah usaha, katalog, partner, hapus usaha), jumlah tidak dibatasi, bisa **Keluar sebagai partner**; badge **Partner** di Usaha Saya.
- **Jumlah kunjungan** — "Dilihat N kali" di form usaha & per item di Katalog (juga di Portal). Dihitung dari app + web; pemilik/partner tidak dihitung; satu pengunjung sekali per 30 menit; bot pratinjau link diabaikan.

### Homecell
- **Asisten homecell** — PIC (atau PIC / pastor zona) menunjuk anggota aktif sebagai **asisten** (⋯ → Jadikan / Lepas asisten; tanpa batas). Asisten mendapat notifikasi, badge **Asisten**, dan tombol **Kelola** untuk: buat & ubah jadwal, absen (scan / manual), catat tamu, pengumuman, voting, lampiran. Asisten tidak bisa menambah/mengeluarkan anggota, menghapus jadwal, mengubah info homecell, laporan, atau memproses permintaan bergabung.
- **Ubah jadwal pertemuan** — ikon pensil di detail pertemuan (tanggal, jam, lokasi, catatan), juga setelah absen tercatat; untuk PIC, PIC / pastor zona, dan asisten; tanpa notifikasi ke anggota.
- **Keluarkan anggota dengan alasan** — popup konfirmasi dengan alasan wajib (salah invite, tidak aktif, pindah homecell, pindah kota, atau ketik sendiri); alasan tampil di app & riwayat Portal. Hanya PIC homecell, PIC / pastor zona, atau admin. Anggota yang pernah dikeluarkan bisa dimasukkan kembali (juga di grup & pelayanan).
- **Lokasi** — kolom lokasi menerima link Google Maps apa pun (tautan Bagikan, link tempat) atau koordinat.

### Ibadah & event
- **Self check-in setelah ibadah selesai** — selama 30 menit tenggang tampil **"Self check-in akan berakhir dalam mm:ss"** (Beranda, detail ibadah, tiket); saat habis, tombol/geser self check-in langsung hilang.
- **Tiket keluarga** — reservasi ibadah untuk pasangan / orang tua / saudara kini tampil sebagai tiket di detail ibadah & Reservasi Saya (sebelumnya hanya anak, tanggungan, tamu). *(perbaikan server, berlaku juga untuk 2.4.6)*
- **Detail event** — kartu Tiket Saya lebih ringkas; tipografi seragam dengan detail ibadah; konfirmasi pendaftaran menampilkan gambar event sesuai rasio aslinya; Tiket Saya & Reservasi langsung diperbarui setelah mendaftar.

### Keluarga
- **Persetujuan tambah keluarga (siap, belum aktif)** — fitur permintaan + setujui/tolak di menu Keluarga sudah ada di app ini, tetapi **dimatikan sementara** di server: menambah keluarga tetap langsung terhubung seperti sebelumnya. Aktifkan nanti dengan `FAMILY_APPROVAL_ENABLED=true` (setelah sebagian besar pengguna memakai 2.4.8).

### Kenyamanan & tampilan
- **Keyboard tidak menutupi isian (Android)** di ±40 form & lembar isian.
- **Status bar di halaman ber-hero** — Beranda, detail usaha & item Local Market, detail event, berita, renungan, dan pelayanan: ikon status bar putih di atas hero; saat digulir muncul latar solid di belakang jam/sinyal/baterai sehingga konten tidak lagi menabraknya. Tombol kembali/bagikan di atas foto Local Market selalu di bawah area aman atas.
- **Tombol bawah lembar (Android)** — tombol Simpan dkk. di 30+ lembar isian/pilihan tidak lagi tertutup bilah navigasi Android (Tambah tamu, Reservasi, Tamu walk-in, Ganti no HP, filter Local Market, materi homecell, dll.). **Pesan untuk pemimpin** saat minta bergabung homecell & isian filter Local Market tidak lagi tertutup keyboard.
- **Cari jemaat (input manual) layar penuh** — hasil selalu bisa digulir & diketuk (homecell, kehadiran, scanner, grup, keluarga, visit, atur jadwal pelayanan).
- **Mode gelap** — placeholder semua kolom isian kini terlihat; kartu "Belum ada petugas" tanpa border kuning.
- **Profil** — ikon Data Diri abu-abu seragam dengan Pengaturan; ikon 🎉 di Spiritual Journey dihapus.
- **Akses Cepat** — ikon & label sedikit lebih besar. **Banner "Sedang menjelajahi"** — gradient oranye, tulisan putih, tidak tertutup status bar.
- **Catatan** — kotak isi memenuhi layar & memanjang mengikuti isi; versi web tidak lagi error saat mengedit.
- **Spiritual Journey** — catatan pengajuan update tahap opsional. **Group** — permintaan bergabung hanya untuk PIC.

## Syarat server (deploy SEBELUM app dirilis)
- Migrasi: `20261115090000_family_link_request`, `20261116090000_homecell_asisten`, `20261117090000_homecell_member_alasan_keluar`, `20261118090000_local_market_katalog`, `20261119090000_local_market_view_count`, `20261120090000_local_market_marketplace`, `20261121090000_local_business_partner`.
- core-api, Portal, dan landing terbaru (katalog, partner, kunjungan, marketplace, link Google Maps, tiket keluarga, web `/local-market/:id[/item/:itemId]` + OG image, whitelist Coming Soon untuk link share berita / renungan / Local Market).
- `FAMILY_APPROVAL_ENABLED` **tidak** di-set (persetujuan keluarga mati).

## Google Play — "Yang baru"
**id-ID**
```
Els App 2.4.8:
• Local Market: katalog produk & jasa, tanya via WhatsApp, link Shopee/Lazada/TikTok Shop/Tokopedia, Google Maps, bagikan usaha
• Partner usaha: kelola usaha bersama
• Asisten homecell & ubah jadwal pertemuan
• Hitung mundur self check-in setelah ibadah
• Keyboard & navigasi Android tidak lagi menutupi isian dan tombol
• Perbaikan mode gelap & lainnya
```
**en-US**
```
Els App 2.4.8:
• Local Market: product & service catalog, ask via WhatsApp, Shopee/Lazada/TikTok Shop/Tokopedia links, Google Maps, share businesses
• Business partners: manage a business together
• Homecell assistants & editable meeting schedules
• Self check-in countdown after service
• Keyboard and Android navigation bar no longer cover fields and buttons
• Dark mode fixes and more
```

## App Store — "What's New" (en)
```
Els App 2.4.8:
• Local Market: product & service catalog with prices and currencies, ask via WhatsApp, marketplace links (Shopee, Lazada, TikTok Shop, Tokopedia), Google Maps, and share a business or item
• Business partners: invite fellow members to manage your business together
• Homecell: appoint assistants and edit meeting schedules
• Self check-in countdown after the service ends
• Keyboard and Android navigation bar no longer cover fields and buttons
• Dark mode and other fixes
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
- [ ] (FAMILY_APPROVAL_ENABLED belum diset) A tambah keluarga B lewat Cari jemaat / scan / kode / no HP → langsung terhubung seperti 2.4.6, di app 2.4.6 maupun 2.4.8
- [ ] *Setelah persetujuan diaktifkan:* A cari jemaat B → pilih hubungan → Tambahkan → toast "Permintaan terkirim…", B belum ada di Keluarga A; A melihat B di "Menunggu persetujuan"
- [ ] B dapat notifikasi → Keluarga → kartu permintaan → Setujui → A & B saling terhubung (hubungan balik benar), A dapat notifikasi disetujui
- [ ] Ulangi dengan Tolak → A dapat notifikasi ditolak; A Batalkan permintaan yang masih menunggu
- [ ] A scan QR / input kode C yang tanggungan (tanpa HP) → permintaan masuk ke wali C
- [ ] Wali menambahkan tanggungannya sendiri via kode → langsung terhubung
- [ ] Cari jemaat → orang yang permintaannya menunggu ditandai "Menunggu persetujuan"
- [ ] *Setelah persetujuan diaktifkan:* App 2.4.6 → tambah keluarga → muncul pesan "Permintaan terkirim…"
- [ ] Daftarkan Baru (balita) → langsung masuk Keluarga
- [ ] Tambah anggota homecell → input manual → keyboard tidak menutupi, hasil bisa diketuk (Android & iOS)
- [ ] Spiritual Journey → ajukan update tanpa catatan → terkirim
- [ ] Group: Fulltimer non-PIC tidak melihat permintaan bergabung
- [ ] Portal → Local Market → Batas katalog = 3 → simpan
- [ ] Pemilik → Usaha Saya → bisnis → isi WA admin (08…), email, username Instagram "@usahaku" → Simpan → detail publik: tombol WhatsApp & Email; Sosial Media → instagram.com/usahaku
- [ ] Katalog → Tambah item Produk, 2 foto (crop 3:2), harga Tetap IDR 150000 /porsi → tampil "Rp 150.000/porsi"; item Jasa harga By agreement; item USD Mulai dari 20 → "Mulai US$ 20"
- [ ] Item ke-4 ditolak (batas 3); ubah urutan naik/turun; nonaktifkan item → hilang dari detail publik
- [ ] Jemaat → detail bisnis → grid katalog & filter Produk/Jasa → detail item → Tanya via WhatsApp membuka chat dengan pesan + link; Email membuka aplikasi email
- [ ] Bagikan link item ke WhatsApp → pratinjau berisi foto item, nama, harga; link membuka halaman web item (dan app di Android 2.4.8)
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
- [ ] Detail usaha → ikon Bagikan (kanan atas) & Usaha Saya → ikon Bagikan → link /local-market/{id} terbuka di browser (tidak tertahan Coming Soon), pratinjau memakai foto sampul
- [ ] Usaha dengan link Google Maps → tombol "Buka lokasi di Google Maps" tampil; tanpa link → tombol tidak ada
- [ ] Mode gelap: placeholder kolom isian (form usaha, edit profil, hapus akun, cari Local Market) terlihat jelas
- [ ] Reservasi ibadah untuk diri sendiri + pasangan → detail ibadah & Reservasi Saya menampilkan 2 tiket (label Keluarga)
- [ ] Undangan partner ke tanggungan tanpa akun → ditolak "belum punya akun Els App"
- [ ] Form usaha: ketik nama baru → upload logo sebelum Simpan → ketikan tidak hilang
- [ ] Android (navigasi 3 tombol): buka Tambah tamu, Reservasi, Ganti no HP, filter Local Market, pilih tanggal → tombol paling bawah terlihat di atas bilah navigasi
- [ ] Android: Homecell → detail (belum anggota) → ketuk Pesan untuk pemimpin → kolom & tombol Minta bergabung terlihat di atas keyboard
- [ ] Detail usaha/item Local Market, detail event, berita, renungan, pelayanan, Beranda → gulir ke bawah → konten tidak bertumpuk dengan jam/sinyal/baterai (Android & iPhone ber-notch/Dynamic Island)
- [ ] HP lipat (dibuka) / tablet: CKids → katalog hadiah → ketuk hadiah → foto tidak memenuhi lembar, isi bisa digulir sampai tombol Tutup; ketuk area gelap menutup lembar, ketuk isi lembar tidak menutup
