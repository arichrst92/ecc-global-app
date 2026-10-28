# Els App v2.4.3 — Release Notes (iOS & Android)

Rilis produksi **iOS & Android** + Els App web. Versi sebelumnya: **2.4.2** (hotfix crash iOS).
Build baru wajib (modul native baru: `expo-notifications`, `expo-sharing`, `expo-media-library`, `react-native-view-shot`) — **bukan OTA**.

> Teks App Store tidak menyebut Android / Google Play. Resolusi tidak diumumkan.

## Isi rilis
- **Bible 365** — baca Alkitab Kejadian–Wahyu dalam 365 hari (3–4 pasal/hari), mulai kapan saja dengan popup komitmen, centang per pasal (juga dari layar baca), hari tertinggal bisa dikejar, catatan renungan pribadi + Jurnal, pengingat harian (notifikasi lokal), putaran baru setelah selesai.
- **Share gambar 1080×1080** di 10 titik: Ayat Hari Ini, ayat dari pasal (tema oranye/gelap), Renungan, Berita, Event, lagu (pemutar & menu ⋮), album, Bagikan Els App (QR), Bible 365. Teks + link otomatis disalin untuk keterangan.
- **Portal → Bible 365**: peserta aktif, aktif 7 hari, sesuai jadwal, rata-rata progres, sebaran, per cabang (catatan jemaat tidak tampil).
- **Bible 365**: pilih versi Alkitab (BIMK/KJV) langsung di layar Bible 365.
- **Homecell**: jam mulai & selesai pertemuan; kategori Single/Couple + rentang usia (filter di Cari homecell); indikator kehadiran 4 warna di halaman Area; pemimpin edit info homecell (nama, deskripsi, alamat, Maps, kategori, usia), PIC area edit area; usia anggota; tab Anggota/Tamu.
- **Tamu homecell**: pemimpin catat tamu (masuk menu Tamu portal), tandai tamu hadir per pertemuan (terpisah dari % anggota).
- **Mode tamu → homecell**: cari homecell (cabang/terdekat) & minta bergabung sebagai tamu; PIC terima/tolak; alamat & kontak pemimpin baru terbuka setelah diterima.
- **Laporan PDF** homecell & area per periode dari app (PIC), mengikuti bahasa app.
- Perbaikan: absen bulk homecell, jam jadwal terbaca di mode gelap, halaman tiket bisa digulir sampai bawah, gradient oranye iOS aktif kembali.
- Release notes PDF: `docs/Release-Notes-Els-App-27-Okt-2026.pdf`.

## Google Play — "Yang baru"
**id-ID**
```
Els App 2.4.3:
• Bible 365: baca seluruh Alkitab dalam setahun, 3–4 pasal sehari
• Catatan renungan harian & pengingat setiap hari
• Bagikan ayat, renungan, event, dan lagu sebagai gambar
• Homecell: kategori & usia, jam pertemuan, catat tamu, laporan PDF
• Mode tamu: cari homecell terdekat & minta bergabung
• Perbaikan & peningkatan stabilitas
```
**en-US**
```
Els App 2.4.3:
• Bible 365: read the whole Bible in a year, 3–4 chapters a day
• Daily reflection notes & reminders
• Share verses, devotionals, events and songs as images
• Homecell: categories & ages, meeting times, guests, PDF reports
• Guest mode: find a nearby homecell & ask to join
• Fixes & stability improvements
```

## App Store — "What's New"
**Bahasa Indonesia**
```
Els App 2.4.3 — Bible 365 & bagikan sebagai gambar.

BIBLE 365 (BARU)
• Baca seluruh Alkitab, Kejadian sampai Wahyu, dalam 365 hari
• Centang pasal yang sudah dibaca dan lihat progres setiap hari
• Tulis catatan renungan pribadi, tersimpan di Jurnal
• Pengingat harian di jam pilihan Anda

BAGIKAN SEBAGAI GAMBAR
• Ayat, renungan, berita, event, dan lagu ECC Worship kini bisa dibagikan sebagai gambar
• Bagikan progres Bible 365 ke Instagram Story atau WhatsApp

HOMECELL
• Jam mulai & selesai pertemuan, kategori Single/Couple & rentang usia
• Pemimpin bisa mengubah info homecell, mencatat tamu, dan membuka laporan PDF
• Mode tamu: cari homecell terdekat dan minta bergabung

PERBAIKAN
• Halaman tiket kini bisa digulir sampai bawah
• Peningkatan stabilitas
```
**English**
```
Els App 2.4.3 — Bible 365 & share as image.

BIBLE 365 (NEW)
• Read the whole Bible, Genesis to Revelation, in 365 days
• Tick chapters as you read and watch your progress grow
• Write private reflection notes, kept in your Journal
• A daily reminder at the time you choose

SHARE AS IMAGE
• Share verses, devotionals, news, events and ECC Worship songs as images
• Share your Bible 365 progress to Instagram Stories or WhatsApp

HOMECELL
• Meeting start & end times, Single/Couple categories and age ranges
• Leaders can edit homecell info, record guests and open PDF reports
• Guest mode: find a nearby homecell and ask to join

FIXES
• Ticket pages now scroll all the way down
• Stability improvements
```

## App Review notes
`docs/app-review-notes-v2.4.3.md` (≤ 4.000 karakter).

## Popup update (Portal → App Versions)
```
• Bible 365: baca seluruh Alkitab dalam setahun
• Bagikan ayat, renungan, event & lagu sebagai gambar
• Homecell: kategori & usia, tamu, laporan PDF
```

## Portal → App Versions (setelah 2.4.3 LIVE)
| Field | iOS | Android |
|---|---|---|
| Latest version | 2.4.3 | 2.4.3 |
| Min supported version | **2.4.2** (2.4.1 crash di iOS) | tetap |

## Smoke test WAJIB sebelum submit (build production/TestFlight + APK)
**Start & crash**
- [ ] iOS (iPhone iOS 16 & iOS 17/18) & Android: buka app → splash → Beranda **tanpa crash**, login & mode tamu
- [ ] Mode gelap ↔ terang; tab Reservasi; tiket penuh (kecerahan naik/turun)

**Bible 365**
- [ ] Alkitab → kartu Bible 365 → Mulai → centang komitmen wajib sebelum tombol aktif
- [ ] Pilih pengingat 06:00 → izin notifikasi muncul → ubah jam HP/tunggu → notifikasi tampil
- [ ] Pilih "Tanpa pengingat" → tidak ada izin diminta
- [ ] Centang pasal → progres & bar naik; ketuk pasal → layar baca → "Tandai pasal ini selesai" → kembali, tercentang
- [ ] Tandai hari selesai; hari kemarin belum → banner "tertinggal" → Kejar
- [ ] Tulis catatan → tersimpan → Jurnal; hapus catatan
- [ ] Hentikan → Mulai putaran baru
- [ ] Portal → Bible 365 → angka muncul, filter cabang

**Share gambar** (iOS & Android)
- [ ] Ayat Hari Ini (oranye/gelap), ayat dari pasal, renungan, berita, event (gambar asli termuat), lagu dari pemutar, lagu dari menu ⋮, album, Profil → Bagikan Els App, Bible 365
- [ ] "Bagikan gambar" → Instagram Story & WhatsApp menerima gambar; teks tersalin
- [ ] "Simpan ke galeri" → izin foto (iOS: tambah saja) → gambar ada di Galeri/Photos
- [ ] Els App web: share hanya teks, tidak error

**Homecell & mode tamu**
- [ ] Buat jadwal → jam mulai/selesai (cek mode gelap) → tampil di daftar & Beranda
- [ ] Absen sekaligus (bulk) tersimpan; tandai tamu hadir → tidak mengubah % anggota
- [ ] Edit homecell (nama, deskripsi, alamat, Maps, kategori, usia); PIC area edit area
- [ ] Tab Anggota / Tamu; Tambah tamu → muncul di portal menu Tamu (filter Tamu homecell)
- [ ] Laporan PDF dari app (homecell & area) — app bahasa English → laporan English
- [ ] Mode tamu → Beranda → "Cari homecell terdekat" → minta bergabung → akun PIC: Permintaan → Terima → mode tamu tarik refresh → alamat, Maps & WA muncul
- [ ] Service Ticket / Event Ticket bisa digulir sampai bawah (iPhone kecil)

## Urutan rilis
1. **Server dulu** (semua migrasi harus sudah jalan sebelum app 2.4.3 dipakai) — lihat perintah deploy di bawah.
2. Build production iOS & Android → TestFlight / internal testing → smoke test di atas.
3. Submit ke App Store & Google Play (teks di atas, App Review notes).
4. Deploy Els App web.
5. Setelah LIVE di kedua store: Portal → App Versions (tabel di atas).
