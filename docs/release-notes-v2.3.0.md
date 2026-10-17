# Els App v2.3.0 — Release Notes

Rilis produksi Android & iOS. Versi terakhir di store: **v2.2.6** (2026-09-06).
Mencakup semua perubahan v2.2.7, v2.2.8 (tidak pernah dipublish) dan pembaruan hingga 17 Oktober 2026.

---

## 1. Teks untuk store

### Google Play — "Yang baru" (maks. 500 karakter)

**Bahasa Indonesia (id-ID)**

```
Versi besar baru!
• Self check-in ibadah & event, sekalian untuk keluarga
• Reservasi ibadah & ajak teman langsung dari aplikasi
• Spiritual Journey: lihat langkah pertumbuhan rohani Anda
• Jadwal Pelayanan Saya, Tamu Saya, dan atur Privasi data
• Homecell & Group: materi, pengumuman, voting, QR group
• Pilih versi Alkitab, okupansi kursi ibadah, nomor HP internasional
• Pemberitahuan saat ada versi baru + banyak perbaikan
```

**English (en-US)**

```
A big new update!
• Self check-in for services & events, including your family
• Reserve services & bring friends right from the app
• Spiritual Journey: see your next steps of spiritual growth
• My Service Schedule, My Guests, and Privacy settings
• Homecell & Groups: materials, announcements, polls, group QR
• Choose your Bible version, seat occupancy, international phones
• New-version notice + many fixes
```

### App Store — "What's New"

**Bahasa Indonesia**

```
Els App 2.3.0 — pembaruan besar untuk jemaat ECC.

IBADAH & EVENT
• Self check-in ibadah dan event langsung dari HP, sekalian untuk keluarga — lengkap dengan hitung mundur
• Reservasi ibadah hingga 30 hari ke depan, bisa dibatalkan sampai ibadah dimulai
• Ajak teman (tamu) cukup dengan nama dan nomor HP
• Okupansi kursi ibadah tampil di detail ibadah & ibadah hari ini
• Jam ibadah & event tampil sesuai zona waktu HP Anda

PERTUMBUHAN & PELAYANAN
• Spiritual Journey: tahap yang sudah dicapai, langkah berikutnya, dan kelas yang bisa diikuti
• Jadwal Pelayanan Saya: semua tugas di ibadah & event, ketuk untuk membuka detailnya
• Tamu Saya: teman yang Anda ajak, status tindak lanjut, dan kapan terakhir hadir
• Bergabung ke pelayanan (ministry) dengan persetujuan leader

HOMECELL & GROUP
• Menu Homecell untuk semua jemaat: cari homecell terdekat & ajukan bergabung
• Materi pertemuan, pengumuman, voting, dan file — khusus anggota
• Tampilan baru Group Saya & Jelajahi Group, plus scan QR group

PROFIL & LAINNYA
• Atur Privasi: siapa yang boleh melihat nomor HP, alamat, dan data pribadi Anda
• Pilih versi Alkitab langsung di halaman Alkitab
• Sertifikat jemaat, Kirim Kritik & Saran, dan Share Els App
• Nomor HP internasional dengan pilihan kode negara
• CKids: usia anak tampil, kode jemput di Reservasi Saya, katalog hadiah 2 kolom
• Pemberitahuan otomatis saat versi baru tersedia

PERBAIKAN
• Reservasi Saya lebih lengkap (anak, keluarga, tab Riwayat)
• Pembayaran event kembali ke aplikasi dengan lancar
• Tampilan rapi di layar penuh (Android 15) dan berbagai perbaikan lainnya
```

**English**

```
Els App 2.3.0 — a big update for the ECC community.

SERVICES & EVENTS
• Self check-in for services and events from your phone, including your family — with a countdown
• Reserve services up to 30 days ahead; cancel any time before the service starts
• Bring friends (guests) with just a name and phone number
• Seat occupancy shown on service details and today's service
• Service & event times shown in your phone's time zone

GROWTH & SERVING
• Spiritual Journey: completed steps, your next step, and classes to join
• My Service Schedule: all your duties at services & events, tap to open details
• My Guests: friends you invited, follow-up status, and their last visit
• Join a ministry with leader approval

HOMECELL & GROUPS
• Homecell menu for everyone: find a nearby homecell & request to join
• Meeting materials, announcements, polls, and files — members only
• Redesigned My Groups & Explore Groups, plus group QR scanning

PROFILE & MORE
• Privacy settings: choose who can see your phone, address, and personal data
• Pick your Bible version right on the Bible page
• Member certificates, Feedback, and Share Els App
• International phone numbers with country code picker
• CKids: child's age, pickup code in My Reservations, 2-column gift catalog
• Automatic notice when a new version is available

FIXES
• My Reservations now complete (children, family, History tab)
• Event payment returns to the app smoothly
• Edge-to-edge layout fixes (Android 15) and many other improvements
```

---

## 2. Isian portal → App Versions (setelah kedua store LIVE)

| Field | Android | iOS |
|---|---|---|
| Latest version | 2.3.0 | 2.3.0 |
| Min supported version | 2.2.6 (biarkan — update tidak wajib) | 2.2.6 |
| Download URL | https://play.google.com/store/apps/details?id=idea.eccchurch.global | https://apps.apple.com/id/app/els-app/id6804400672 |
| Release notes | teks "Yang baru" Bahasa Indonesia di atas | sama |

Publish **hanya setelah** versi 2.3.0 benar-benar tersedia di store, supaya tombol Update tidak mengarah ke versi lama.
Catatan: popup "Versi baru tersedia" baru muncul di app versi 2.3.0 ke atas; pengguna v2.2.6 melihatnya lewat menu *Cek Update Aplikasi*.

---

## 3. Smoke test sebelum submit (build preview / internal)

- Login OTP (nomor +62 dan nomor luar negeri)
- Beranda: ibadah hari ini, countdown & self check-in, okupansi kursi, widget Pelayanan Saya → buka ibadah/event
- Reservasi dari detail ibadah → muncul di Reservasi Saya → batalkan
- Self check-in (di dalam & luar radius → arahan ke usher)
- Scanner: scan QR + input manual cari nama/no HP
- Profil: Jadwal Pelayanan Saya, Tamu Saya, Privasi, Spiritual Journey, Sertifikat, Kritik & Saran
- Group: Group Saya, Jelajahi Group, scan QR group public & private
- Homecell: cari terdekat, request join, materi & pengumuman
- CKids: usia anak, katalog 2 kolom → detail hadiah, kode jemput
- Alkitab: ganti versi (TB / KJV)
- Pembayaran event → kembali ke aplikasi
- Cek Update Aplikasi
