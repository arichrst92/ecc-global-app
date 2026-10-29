# Els App v2.4.4 — Release Notes (iOS & Android)

Rilis produksi **iOS & Android** + Els App web. Versi sebelumnya: **2.4.3**.
Build baru lewat EAS (bukan OTA). Tidak ada modul native baru.

> Teks App Store tidak menyebut Android / Google Play. Resolusi tidak diumumkan.

## Isi rilis
- **Persetujuan data pribadi (kepatuhan UU PDP / PDPA / Privacy Act)**
  - Saat daftar akun, jemaat wajib mencentang tiga hal: setuju S&K + Kebijakan Privasi, persetujuan data sensitif (keanggotaan gereja, data anak), dan kelompok usia (18+ / 13–17 dengan izin orang tua).
  - Jemaat lama diminta setuju **satu kali** lewat layar "Persetujuan data pribadi", dan lagi setiap kali Version dokumen Indonesia di Portal → Legal diubah.
  - "Saya tidak setuju" → keluar dari akun.
  - Tercatat di server (versi dokumen, waktu, usia, platform) dan terlihat di Portal → detail jemaat.
- **Unduh data saya** — Pengaturan → Privasi → salinan data pribadi (file JSON), dibagikan lewat menu share / diunduh di web.
- **Pesan WhatsApp** — Pengaturan → Privasi: jemaat bisa mematikan pengingat ibadah/event, ucapan ulang tahun, dan info aktivitas (OTP tetap dikirim).
- **Statistik penggunaan anonim** (halaman dibuka, kecepatan app) untuk Portal → Analitik; bisa dimatikan di Profil → Pengaturan → Privasi.
- Server (sudah live): data wajah dihapus, hapus data permanen di Portal, retensi data otomatis.

## Google Play — "Yang baru"
**id-ID**
```
Els App 2.4.4:
• Persetujuan data pribadi saat daftar & untuk pengguna lama
• Unduh data saya & atur pesan WhatsApp di Privasi
• Statistik penggunaan anonim (bisa dimatikan di Privasi)
• Perbaikan & peningkatan stabilitas
```
**en-US**
```
Els App 2.4.4:
• Personal data consent at sign-up and for existing users
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
- [ ] Mode tamu → tidak ada layar persetujuan
- [ ] App bahasa English → teks persetujuan English

**Unduh data & pesan WhatsApp**
- [ ] Privasi → Unduh data saya → iOS/Android: share sheet berisi file .json; web: file terunduh; isi sesuai profil
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
