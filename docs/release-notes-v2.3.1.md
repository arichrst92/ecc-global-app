# Els App v2.3.1 — Release Notes (Android)

Rilis produksi **Android**. Versi sebelumnya: v2.3.0.

## Google Play — "Yang baru" (maks. 500 karakter)

**Bahasa Indonesia (id-ID)**

```
Pembaruan Els App 2.3.1:
• Data Diri di Profil: lengkapi pekerjaan & status pernikahan
• Ganti nomor HP sendiri dengan verifikasi WhatsApp ke nomor baru
• Profil sesama jemaat tampil baru: Spiritual Journey, homecell, pelayanan & keluarga
• Tombol kembali ke aplikasi dari halaman persembahan
• Katalog hadiah CKids kini tampil di semua HP Android
• Tanggal lahir & pernikahan tersimpan sesuai tanggal yang dipilih
• Perbaikan privasi & berbagai perbaikan lainnya
```

**English (en-US)**

```
Els App 2.3.1 update:
• Personal Data in Profile: add your occupation & marital status
• Change your own phone number with WhatsApp verification to the new number
• Redesigned member profiles: Spiritual Journey, homecell, ministry & family
• Back-to-app button from the giving page
• CKids gift catalog now shows on all Android phones
• Birth & wedding dates are saved exactly as selected
• Privacy improvements & other fixes
```

## Portal → App Versions (setelah 2.3.1 LIVE di Google Play)

| Field | Android |
|---|---|
| Latest version | 2.3.1 |
| Min supported version | 2.2.6 (tidak wajib update) |
| Download URL | https://play.google.com/store/apps/details?id=idea.eccchurch.global |
| Release notes | teks "Yang baru" Bahasa Indonesia di atas |

Pengguna v2.3.0 akan mendapat popup "Versi baru tersedia" setelah row ini dipublish.

## Smoke test (build Android)

- Profil → kartu Data Diri tampil + label "Terlihat oleh"
- Edit Profil: isi pekerjaan, status & tanggal pernikahan → simpan → tampil di Data Diri
- Edit Profil → Ganti nomor HP → kode WhatsApp ke nomor baru → berhasil, login ulang pakai nomor baru
- Buka profil jemaat lain (dari homecell / keluarga): grouping, Spiritual Journey, homecell
- Beranda → Beri → browser dalam app → tombol "Kembali ke Els App" / X
- Tab CKids → katalog hadiah 2 kolom tampil, ketuk → detail & stok
- Edit Profil: pilih tanggal lahir & tanggal pernikahan → simpan → tanggal yang tampil sama (tidak mundur 1 hari)
- Tambah anggota keluarga: tanggal lahir tersimpan sesuai pilihan
- Profil jemaat lain & detail homecell: tanggal pernikahan, jadwal pertemuan, "anggota sejak" tampil benar
- Popup versi baru (setelah row App Versions dipublish)
