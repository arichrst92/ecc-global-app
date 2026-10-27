# Els App v2.5.0 — Release Notes (iOS & Android)

Rilis produksi **iOS & Android** + Els App web. Versi sebelumnya: **2.4.2** (hotfix crash iOS).
Build baru wajib (modul native baru: `expo-notifications`, `expo-sharing`, `expo-media-library`, `react-native-view-shot`) — **bukan OTA**.

> Teks App Store tidak menyebut Android / Google Play. Resolusi tidak diumumkan.

## Isi rilis
- **Bible 365** — baca Alkitab Kejadian–Wahyu dalam 365 hari (3–4 pasal/hari), mulai kapan saja dengan popup komitmen, centang per pasal (juga dari layar baca), hari tertinggal bisa dikejar, catatan renungan pribadi + Jurnal, pengingat harian (notifikasi lokal), putaran baru setelah selesai.
- **Share gambar 1080×1080** di 10 titik: Ayat Hari Ini, ayat dari pasal (tema oranye/gelap), Renungan, Berita, Event, lagu (pemutar & menu ⋮), album, Bagikan Els App (QR), Bible 365. Teks + link otomatis disalin untuk keterangan.
- **Portal → Bible 365**: peserta aktif, aktif 7 hari, sesuai jadwal, rata-rata progres, sebaran, per cabang (catatan jemaat tidak tampil).
- iOS: warna oranye solid (gradient native dimatikan sejak 2.4.2).

## Google Play — "Yang baru"
**id-ID**
```
Els App 2.5.0:
• Bible 365: baca seluruh Alkitab dalam setahun, 3–4 pasal sehari
• Catatan renungan harian & pengingat setiap hari
• Bagikan ayat, renungan, event, dan lagu sebagai gambar
• Bagikan progres Bible 365 ke Instagram & WhatsApp
• Perbaikan & peningkatan stabilitas
```
**en-US**
```
Els App 2.5.0:
• Bible 365: read the whole Bible in a year, 3–4 chapters a day
• Daily reflection notes & reminders
• Share verses, devotionals, events and songs as images
• Share your Bible 365 progress to Instagram & WhatsApp
• Fixes & stability improvements
```

## App Store — "What's New"
**Bahasa Indonesia**
```
Els App 2.5.0 — Bible 365 & bagikan sebagai gambar.

BIBLE 365 (BARU)
• Baca seluruh Alkitab, Kejadian sampai Wahyu, dalam 365 hari
• Centang pasal yang sudah dibaca dan lihat progres setiap hari
• Tulis catatan renungan pribadi, tersimpan di Jurnal
• Pengingat harian di jam pilihan Anda

BAGIKAN SEBAGAI GAMBAR
• Ayat, renungan, berita, event, dan lagu ECC Worship kini bisa dibagikan sebagai gambar
• Bagikan progres Bible 365 ke Instagram Story atau WhatsApp

PERBAIKAN
• Peningkatan stabilitas
```
**English**
```
Els App 2.5.0 — Bible 365 & share as image.

BIBLE 365 (NEW)
• Read the whole Bible, Genesis to Revelation, in 365 days
• Tick chapters as you read and watch your progress grow
• Write private reflection notes, kept in your Journal
• A daily reminder at the time you choose

SHARE AS IMAGE
• Share verses, devotionals, news, events and ECC Worship songs as images
• Share your Bible 365 progress to Instagram Stories or WhatsApp

FIXES
• Stability improvements
```

## App Review notes
`docs/app-review-notes-v2.5.0.md` (3.910 karakter).

## Popup update (Portal → App Versions)
```
• Bible 365: baca seluruh Alkitab dalam setahun
• Bagikan ayat, renungan, event & lagu sebagai gambar
```

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
