# Els App v2.4.9 — Release Notes (iOS & Android)

Versi sebelumnya di toko: **2.4.8**. Build baru lewat EAS (bukan OTA). Tidak ada modul native baru.

## Isi rilis

### Navigasi & Beranda
- **Menu bawah baru: Beranda · Resolusi · Reservasi · CKids · Profil.** Event pindah ke Beranda (6 event mendatang, 90 hari) & Akses Cepat. Tab **CKids selalu tampil** (ajakan tambah anak bila belum ada); mode tamu: tab yang butuh akun mengajak masuk/daftar.
- **Carousel Homecell & Zona** di Beranda — homecell yang dipimpin + **Zona yang Anda pimpin** / **Zona yang Anda gembalakan** (pastor): jumlah homecell, anggota, bertemu 7 hari, belum bertemu > 14 hari, tanpa jadwal.
- **Urutan Akses Cepat baru**: Alkitab, Ibadah, Homecell, Ministry, Keluarga, Group, Worship, Renungan, Doa, Beri, Event, Berita, Zona, Visit, Tamu, Local Market.

### Catatan & kalender
- **Catatan saya: gambar** dari kamera / galeri menyatu dengan teks; editor **"ketuk paragraf untuk mengedit"** — catatan selalu tampil rapi (tanpa tab Tulis/Pratinjau). Format tersimpan tetap sama (kompatibel 2.4.8).
- **Kalender**: ulang tahun anggota homecell / ministry / zona (ikut privasi) + pertemuan homecell.
- **Crop gambar Android**: layar "Atur gambar" sendiri dengan tombol **Batal / Gunakan** (di beberapa HP tombol bawaan tidak muncul).

### Ibadah, event & ministry (tambahan)
- **Event sukarela** (istilah "donasi" → "sukarela"), **syarat peserta** & **info pembayaran** di detail, tanggal rentang untuk event beberapa hari, deskripsi markdown.
- **Label Online** di jadwal ibadah; **Petugas Pelayanan** dikelompokkan per ministry (rapi di HP kecil).
- **Gabung ministry hanya di cabang yang membuka pendaftaran** — selain itu tampil "Pendaftaran di {cabang} belum dibuka".
- **Hemat baterai**: refresh data berhenti saat app di latar belakang, pemutar worship tidak polling saat tersembunyi, keluar akun menghentikan pemutar.

### Masuk & daftar (WhatsApp / email)
- **Daftar dengan WhatsApp atau email** — layar pertama punya pilihan **WhatsApp | Email**. Email memakai kode 6 digit (berlaku 10 menit). Bila salah satu saluran gangguan, muncul saran pindah ke saluran lain. Kolom email opsional di daftar WhatsApp dihapus (sudah ada tab Email).
- **Data jemaat lama** — tanggal lahir (dianjurkan) di data diri. Bila ada data lama yang mirip (nama, tanggal lahir & cabang sama): layar **"Apakah ini Anda?"** → kode ke email data lama untuk menyambungkan, atau lanjut daftar (admin cabang menyatukan).
- **Waktu isi data 60 menit** (sebelumnya 15); alert "waktu habis" tidak berulang & kembali ke awal dengan bersih.
- **Masuk dengan email** — di app tetap link (magic link), dengan kotak **cek folder Spam**; di **versi web** kini memakai **kode 6 digit** (sebelumnya tidak tersedia).
- **Kode masuk dari admin cabang** — jalan darurat saat WhatsApp & email gangguan: "Sudah diberi kode masuk oleh admin cabang?" di layar kode / email.
- **Keterangan OTP** — bila WhatsApp gangguan, banner "kode juga dikirim ke email" + cek spam; saran masuk dengan email.
- Layar kode tidak tertutup keyboard di HP kecil; pesan error & petunjuk dirapikan.

### Profil & kontak
- **Kontak di Edit Profil** — tambah / ganti nomor WhatsApp (kode WhatsApp) dan email (kode email), label **Terverifikasi / Belum terverifikasi / Diinput wali / Diinput admin**.
- **Pengingat "Lengkapi kontak Anda"** — di Profil, Edit Profil, dan Beranda (bisa ditutup 30 hari) bila email atau nomor WhatsApp masih kosong.
- **Onboarding** — langkah tambah nomor HP bisa dilewati.
- **Zona yang dipimpin** — Zone Leader / Pastor zona melihat zonanya di kartu Homecell di Profil.

### Keluarga
- **Daftarkan anggota baru** — kontak opsional (nomor WhatsApp / email): diisi → anggota bisa masuk sendiri; kosong → tanggungan seperti sebelumnya.

### Pengumuman & notifikasi
- **Announcement** — popup pengumuman sekali tampil, halaman detail (banner, markdown, tautan), ikon megafon di Notifikasi.
- **Pengingat ibadah / event H-1 & ucapan ulang tahun di feed app** (bila diaktifkan di Portal → Saluran notifikasi), dengan ikon tiket & hadiah.

### Ibadah, event & reservasi
- **Hitung mundur batas reservasi / pendaftaran** ("2 hari 5 jam 30 menit" / "2 days 5 hours 30 minutes") di ibadah & event, rapi di layar kecil; tombol daftar event nonaktif setelah dimulai (walk-in).
- **Petugas Pelayanan** tampil di detail event.
- **Akses scan check-in** bisa diberi / dicabut koordinator langsung di Jadwal ministry.
- **Batalkan reservasi** CKids & tiket event; setelah batal kembali ke Reservasi Saya.
- **Detail ibadah** hanya menampilkan tiket untuk tanggal pertemuan itu; kuota seat di daftar ibadah.
- **Jadwal pelayanan** dipisah tab Ibadah & Event.

### Tampilan
- **Empty state** memakai ikon Els App di semua daftar kosong; **gambar default** konten = gradient oranye + logo Els App + watermark ECC.
- **Petunjuk unggah** (rasio, ukuran, format, maks) di semua unggahan gambar.
- **Alkitab → Catatan saya**; homecell: "Pertemuan" (ID) / "Gathering" (EN); label PIC / Zone Leader / Pastor di absen pertemuan; teks hardcoded dwibahasa.
- Chat koordinator ministry disembunyikan bila koordinator tanpa nomor; versi app dikirim ke server (statistik versi di Portal).

## Syarat server (deploy SEBELUM app dirilis)
- Migrasi s.d. `20261206090100_notification_channels` (termasuk `20261203090000_announcement`, `20261205090000_otp_purpose_dual_channel`, `20261205090100_auth_dual_channel`, `20261206090000_in_app_reminder_types`).
- core-api & Portal terbaru (OTP email, kode admin, deteksi data lama, kontak terverifikasi, saluran notifikasi, Announcement), landing `/pengumuman/[slug]`.
- Saklar Portal **"Kirim kode daftar ke email bila WhatsApp gagal (app lama)"** tetap **menyala** sampai 2.4.9 tersedia di toko.
- core-api terbaru juga: kalender ulang tahun (`/me/calendar-extra`), ringkasan zona, unggah gambar catatan, aturan event (RBAC, sukarela, kuota), aturan pendaftaran ministry.
- ⚠ **Pendaftaran ministry default = belum dibuka** (berlaku juga untuk app 2.4.8): koordinator perlu **Buka pendaftaran** per cabang di ministry yang menerima anggota baru.

## Setelah rilis
1. Pantau versi app di Portal → WhatsApp Config → Gateway & OTP (daftar versi aktif).
2. Setelah mayoritas memakai 2.4.9: matikan saklar app lama di atas.
3. ± 2–4 minggu kemudian: naikkan versi minimum app.

## Google Play — "Yang baru"
**id-ID**
```
Els App 2.4.9:
• Menu bawah baru: Beranda, Resolusi, Reservasi, CKids, Profil
• Daftar & masuk dengan WhatsApp atau email
• Ringkasan homecell & zona di Beranda
• Catatan khotbah dengan gambar, tampil rapi saat ditulis
• Kalender ulang tahun anggota & pertemuan homecell
• Pengumuman gereja, event sukarela, hitung mundur reservasi
• Perbaikan & penyempurnaan lainnya
```
**en-US**
```
Els App 2.4.9:
• New bottom menu: Home, Resolution, Bookings, CKids, Profile
• Sign up and sign in with WhatsApp or email
• Homecell & zone summary on Home
• Sermon notes with images, formatted as you write
• Calendar with members' birthdays & homecell meetings
• Church announcements, voluntary events, booking countdown
• Other fixes and improvements
```

## App Store — "What's New" (en)
```
Els App 2.4.9:
• New bottom menu: Home, Resolution, Bookings, CKids, Profile
• Sign up and sign in with WhatsApp or email, with a 6-digit code
• Add and verify your WhatsApp number and email in Profile
• Homecell & zone summary cards on Home for leaders and pastors
• Sermon notes with photos, neatly formatted as you write
• Calendar with members' birthdays and homecell meetings
• Church announcements, voluntary-contribution events, booking countdowns
• Fixes and improvements
```

## Smoke test
**Daftar & masuk**
- [ ] Daftar → tab Email → kode masuk ke email (cek Spam) → data diri → akun aktif, Profil: email "Terverifikasi", hint lengkapi nomor WhatsApp
- [ ] Daftar → tab WhatsApp (tanpa kolom email) → OTP WhatsApp → data diri → akun aktif
- [ ] WhatsApp gangguan saat daftar → kotak "WhatsApp sedang gangguan" → Daftar dengan email
- [ ] Data diri dengan nama + tanggal lahir + cabang sama dengan data lama (punya email) → "Apakah ini Anda?" → Ya → kode ke email lama → masuk ke data lama (tanpa akun baru); kode salah → pesan di sheet, bisa ketik ulang
- [ ] Data lama tanpa email → "Admin cabang akan menyatukan" → akun baru; Portal → Cek Duplikat menampilkan kandidat
- [ ] Biarkan data diri > 60 menit → satu alert "Waktu Pendaftaran Habis" → kembali ke layar pertama
- [ ] App: Masuk dengan email → link masuk (cek Spam) → masuk; Web: Masuk dengan email → kode 6 digit → masuk
- [ ] Portal → jemaat → Kode masuk sementara → app: Masuk dengan OTP → nomor → Kirim OTP → langsung layar kode → kode admin → masuk
- [ ] HP kecil (iPhone SE / Android kecil): layar kode daftar/login & sheet "Apakah ini Anda?" → kolom kode terlihat di atas keyboard

**Profil & keluarga**
- [ ] Edit Profil → Email → Tambah → kode email → "Terverifikasi"; Nomor WhatsApp → Tambah/Ganti → kode WhatsApp
- [ ] Beranda: hint lengkapi kontak → tutup (X) → tidak muncul lagi setelah buka ulang app
- [ ] Onboarding (masuk via magic link, belum punya nomor) → "Lewati, tambahkan nanti" → lanjut ke profil
- [ ] Keluarga → Daftarkan baru dengan nomor WhatsApp → anggota bisa masuk sendiri dengan OTP; tanpa kontak → tanggungan
- [ ] Zone Leader / Pastor zona tanpa homecell → Profil → kartu Homecell menampilkan zona yang dipimpin

**Pengumuman, notifikasi, reservasi**
- [ ] Announcement terkirim → popup sekali → detail → tidak muncul lagi setelah ditutup
- [ ] Portal → Saluran notifikasi → In-app pada Pengingat ibadah H-1 → reservasi besok → pagi berikutnya notifikasi pengingat muncul sekali
- [ ] Detail ibadah/event → hitung mundur batas reservasi berjalan; event sudah mulai → tombol daftar nonaktif
- [ ] Batalkan tiket event & reservasi CKids → kembali ke Reservasi Saya

**Tambahan 2.4.9 (akhir)**
- [ ] Menu bawah 5 tab; Event dibuka dari Beranda (6 event) & Akses Cepat; tab CKids tanpa anak → "Tambah anak"
- [ ] Pemimpin homecell / Zone Leader / Pastor zona → carousel homecell & zona di Beranda, angka ringkasan wajar
- [ ] Catatan: ketuk paragraf → edit → tutup keyboard → tampil rapi; Gambar dari kamera & galeri tampil di catatan, × menghapus; catatan lama dari 2.4.8 terbuka normal
- [ ] Android: pilih foto (Local Market / profil / catatan) → layar Atur gambar → Batal & Gunakan terlihat
- [ ] Kalender: ulang tahun anggota homecell/ministry & pertemuan homecell tampil
- [ ] Ministry di cabang yang belum dibuka → tidak ada tombol Gabung; setelah koordinator Buka pendaftaran → tombol muncul
- [ ] Event sukarela → daftar tanpa wajib bayar, tiket langsung aktif; event berbayar → unggah bukti → aktif setelah diverifikasi
