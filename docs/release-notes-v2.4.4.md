# Els App v2.4.4 — Release Notes (iOS & Android)

Rilis produksi **iOS & Android** + Els App web. Versi sebelumnya: **2.4.3**.
Build baru lewat EAS (bukan OTA). Tidak ada modul native baru.

> Teks App Store tidak menyebut Android / Google Play. Resolusi tidak diumumkan.

## Isi rilis
- **Persetujuan data pribadi (kepatuhan UU PDP / PDPA / Privacy Act)**
  - Saat daftar akun, jemaat wajib mencentang tiga hal: setuju S&K + Kebijakan Privasi, persetujuan data sensitif (keanggotaan gereja, data anak), dan kelompok usia (18+ / 13–17 dengan izin orang tua).
  - Jemaat lama diminta setuju **satu kali** lewat layar "Persetujuan data pribadi", dan lagi setiap kali Version dokumen Indonesia di Portal → Legal diubah.
  - Bila tanggal lahir tercatat < 18 tahun (mis. data impor Shiftsoft salah), layar menampilkan tanggal lahir tersebut dengan tombol **Perbaiki tanggal lahir**; koreksi disimpan ke profil (tercatat di Audit Log) sebelum batas usia dicek.
  - "Saya tidak setuju" → keluar dari akun.
  - Tercatat di server (versi dokumen, waktu, usia, platform) dan terlihat di Portal → detail jemaat.
- **Unduh data saya** — Pengaturan → Privasi → salinan data pribadi sebagai **PDF** (format sama dengan Export PDF detail jemaat di Portal + persetujuan, pengaturan pesan, prayer request, Bible 365, hak jemaat), dibuka lewat link 10 menit.
- **Pesan WhatsApp** — Pengaturan → Privasi: jemaat bisa mematikan pengingat ibadah/event, ucapan ulang tahun, dan info aktivitas (OTP tetap dikirim).
- **Ulasan ibadah & event** — dari layar tiket: beri bintang 1–5, komentar (opsional), bisa anonim. Terbuka sejak acara dimulai sampai 14 hari setelah selesai; hasilnya tampil di Portal (detail ibadah/event, Laporan Ibadah/Event + export PDF/CSV).
- **Zona waktu jelas** — daftar ibadah, daftar event, Beranda, detail ibadah, detail event, dan tiket menampilkan jadwal dengan zona waktu cabang, mis. "26 Oktober 2029 10.00 - 12.00 Waktu Kuala Lumpur"; bila zona HP berbeda, jam setempat ikut ditampilkan ("09:00 - 11:00 di zona waktu Anda").
- **Statistik penggunaan anonim** (halaman dibuka, kecepatan app) untuk Portal → Analitik; bisa dimatikan di Profil → Pengaturan → Privasi.
- **Label jadwal lebih jelas** — detail ibadah menampilkan "Sabtu minggu kedua setiap bulan", "Setiap 2 minggu, hari …", "Sekali" (sebelumnya tampil kode mentah seperti `MONTHLY`).
- Server (sudah live): data wajah dihapus, hapus data permanen di Portal, retensi data otomatis, enkripsi Credential & backup, jadwal Bulanan minggu ke-N, menu Compliance.

## Perbandingan 2.4.3 → 2.4.4

| Area | 2.4.3 (27 Okt 2026) | 2.4.4 (Nov 2026) |
|---|---|---|
| Persetujuan S&K & Privasi | Kalimat "dengan melanjutkan Anda menyetujui…" — tidak tercatat | Centang wajib saat daftar (S&K + Privasi, data sensitif, usia) + layar setuju ulang untuk pengguna lama; **tercatat** (versi, waktu, platform) |
| Batas usia | Belum ditanyakan | 18+ atau 13–17 dengan izin orang tua; < 13 ditolak bila tanggal lahir diketahui |
| Dokumen legal | v2.0 (ID/EN) | v3.0 untuk Indonesia, Malaysia & Australia (ID/EN/Melayu) |
| Salinan data pribadi | Lewat email ke gereja | **Unduh data saya** — PDF langsung dari Pengaturan → Privasi |
| Pesan WhatsApp | Hanya bisa diatur admin | Jemaat memilih sendiri: pengingat, ucapan ulang tahun, info aktivitas |
| Statistik penggunaan | — | Anonim (tanpa nama/no HP), bisa dimatikan |
| Ulasan ibadah & event | — | Bintang 1–5 + komentar (opsional, bisa anonim) dari tiket |
| Zona waktu jadwal | Jam dikonversi ke zona HP tanpa label | Jam resmi cabang + label zona di daftar, Beranda, detail & tiket, mis. "10.00 - 12.00 Waktu Kuala Lumpur" |
| Label jadwal ibadah | "Setiap Minggu" atau kode mentah (`MONTHLY`, `BIWEEKLY`) | "Sabtu minggu kedua setiap bulan", "Setiap 2 minggu, hari …", "Sekali" |
| Modul native baru | expo-notifications, expo-sharing, media-library, view-shot | Tidak ada (aman untuk build biasa) |
| Versi minimum server | Migrasi 2.4.3 | Migrasi s.d. `20261030230000` — wajib sudah di-deploy sebelum app 2.4.4 dipakai |

Fitur 2.4.3 (Bible 365, share gambar, homecell & tamu, laporan PDF) tetap ada di 2.4.4 tanpa perubahan perilaku.

## Google Play — "Yang baru"
**id-ID**
```
Els App 2.4.4:
• Persetujuan data pribadi saat daftar & untuk pengguna lama
• Beri ulasan ibadah & event langsung dari tiket
• Unduh data saya & atur pesan WhatsApp di Privasi
• Statistik penggunaan anonim (bisa dimatikan di Privasi)
• Perbaikan & peningkatan stabilitas
```
**en-US**
```
Els App 2.4.4:
• Personal data consent at sign-up and for existing users
• Rate services & events right from your ticket
• Download my data & choose WhatsApp messages in Privacy
• Anonymous usage statistics (can be turned off in Privacy)
• Fixes & stability improvements
```

## App Store — "What's New"
**Bahasa Indonesia**
```
Els App 2.4.4 — privasi Anda, lebih jelas.

• Persetujuan data pribadi: baca dan setujui Syarat & Ketentuan serta Kebijakan Privasi terbaru langsung di app
• Unduh salinan data Anda dan pilih pesan WhatsApp yang ingin diterima, di Pengaturan → Privasi
• Statistik penggunaan anonim untuk membantu kami memperbaiki app — tanpa nama, nomor HP, atau isi Anda, dan bisa dimatikan di Pengaturan → Privasi
• Perbaikan & peningkatan stabilitas
```
**English**
```
Els App 2.4.4 — clearer privacy.

• Personal data consent: read and agree to the latest Terms & Conditions and Privacy Policy right in the app
• Download a copy of your data and choose which WhatsApp messages you receive, in Settings → Privacy
• Anonymous usage statistics to help us improve the app — no name, phone number or content, and you can turn it off in Settings → Privacy
• Fixes & stability improvements
```

## App Review notes
`docs/app-review-notes-v2.4.4.md` (≤ 4.000 karakter).
Akun review akan melihat layar persetujuan sekali setelah login.

## App Store Connect → App Privacy
Tambahkan/pastikan: **Usage Data → Product Interaction** & **Diagnostics → Performance Data** — *Not linked to the user*, *Not used for tracking*, tujuan **Analytics / App Functionality**.
Google Play → Data safety: **App activity → Page views** & **App info and performance → Diagnostics** — dikumpulkan, tidak dibagikan, opsional (bisa dimatikan).

## Popup update (Portal → App Versions)
```
• Persetujuan data pribadi (S&K & Kebijakan Privasi terbaru)
• Unduh data saya & atur pesan WhatsApp
• Statistik penggunaan anonim — bisa dimatikan di Privasi
```

## Portal → App Versions (setelah 2.4.4 LIVE)
| Field | iOS | Android |
|---|---|---|
| Latest version | 2.4.4 | 2.4.4 |
| Min supported version | tetap (2.4.2) | tetap |

> Jemaat yang belum update tidak akan melihat layar persetujuan. Bila ingin semua jemaat setuju lebih cepat, naikkan **Min supported version ke 2.4.4** kira-kira 2 minggu setelah LIVE.

## Smoke test WAJIB sebelum submit (TestFlight + internal testing)
**Persetujuan**
- [ ] Daftar akun baru → tombol Daftar menolak bila centang belum lengkap → lengkapi → masuk Beranda **tanpa** layar persetujuan
- [ ] Portal → detail jemaat baru → badge "Setuju S&K (tanggal)"
- [ ] Login akun lama → layar "Persetujuan data pribadi" muncul → ketuk link S&K / Kebijakan Privasi → dokumen terbuka → kembali → layar persetujuan muncul lagi
- [ ] Setuju & Lanjutkan → masuk app; tutup & buka lagi → tidak muncul lagi
- [ ] "Saya tidak setuju" → Keluar → kembali ke Welcome
- [ ] Profil dengan tanggal lahir < 18 th + pilih "18 tahun ke atas" → pesan error izin orang tua
- [ ] Profil dengan tanggal lahir salah (mis. 2015) → kotak "Tanggal lahir Anda" → Perbaiki (mis. 2005) → pilihan usia jadi 18+ → Setuju berhasil → profil menampilkan tanggal baru
- [ ] Mode tamu → tidak ada layar persetujuan
- [ ] App bahasa English → teks persetujuan English

**Ulasan**
- [ ] Tiket ibadah/event yang belum mulai → teks "Ulasan bisa diberikan setelah acara dimulai"
- [ ] Setelah jam mulai → pilih bintang, tulis komentar, anonim → Kirim → tampil "Ulasan Anda" → Ubah ulasan
- [ ] Tiket keluarga/tamu (geser) → tidak ada kartu ulasan
- [ ] Portal → detail ibadah/event → Ulasan Jemaat; Laporan Ibadah/Event → kartu ulasan & PDF

**Unduh data & pesan WhatsApp**
- [ ] Privasi → Unduh data saya → browser terbuka → print view PDF (Simpan sebagai PDF); isi sesuai profil; kontak keluarga tidak tampil
- [ ] Ketuk 4x dalam 1 jam → pesan batas tercapai
- [ ] Privasi → Pesan WhatsApp → matikan "Ucapan ulang tahun" → buka lagi, tetap mati

**Analitik**
- [ ] Buka beberapa halaman → Portal → Analitik → halaman muncul (≤ 1–2 menit)
- [ ] Pengaturan → Privasi → matikan statistik → halaman baru tidak lagi tercatat

**Regresi cepat**
- [ ] Login OTP & tautan email, reservasi + tiket, Bible 365, share gambar, homecell & mode tamu

## Urutan rilis
1. Server — **sudah** (migrasi `20261029180000_consent_purge_face` sudah jalan).
2. Deploy Els App web (`./scripts/deploy-web.sh`) → cek layar persetujuan di web.
3. Build production iOS & Android → TestFlight / internal testing → smoke test.
4. Submit ke App Store & Google Play (teks di atas, App Review notes, App Privacy / Data safety).
5. Setelah LIVE: Portal → App Versions; pantau jumlah persetujuan:
   `psql "$DBURL" -c "SELECT count(DISTINCT jemaat_id) FROM user_consent;"`

## Perintah (di Mac)
```bash
cd ~/Projects/ecc-mobile-app/app
git pull
./scripts/deploy-web.sh                                   # Els App web
eas build -p all --profile production                     # build number naik otomatis
eas submit -p ios --latest && eas submit -p android --latest
```
