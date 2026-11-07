# Els App v2.4.7 — Release Notes (iOS & Android)

Versi sebelumnya: **2.4.6**. Build baru lewat EAS (bukan OTA). Tidak ada modul native baru.

## Isi rilis
- **Tambah keluarga harus disetujui** — menambah jemaat yang sudah punya akun (scan QR, input kode, Cari jemaat, no HP) kini mengirim **permintaan**; orangnya (atau **wali utamanya** bila ia tanggungan tanpa HP) menyetujui / menolak di menu **Keluarga** dan mendapat notifikasi. Pemohon melihat daftar **Menunggu persetujuan** (bisa dibatalkan) dan notifikasi hasilnya. "Daftarkan Baru" (balita / lansia tanpa HP) tetap langsung. Hasil Cari jemaat menandai orang yang permintaannya masih menunggu.
- **Pencarian jemaat (input manual) layar penuh** — kolom cari di atas, keyboard tidak menutupi, hasil bisa digulir & diketuk (tambah anggota homecell, kehadiran homecell, scanner ibadah/event, group, keluarga, visit).
- **Spiritual Journey** — catatan pengajuan update tahap kini opsional.
- **Lokasi homecell** — petunjuk kolom: link Google Maps apa pun (tautan Bagikan, nama tempat, alamat) atau koordinat.
- **Group** — permintaan bergabung hanya tampil untuk PIC group.

## Syarat server
Migrasi `20261115090000_family_link_request` + core-api terbaru (`/admin/me/family/requests…`, link-by-* jadi permintaan, catatan SJ opsional, resolver link Google Maps tanpa koordinat, request join group/homecell hanya PIC di app).
App 2.4.6 ke bawah: menambah keluarga berakun juga menjadi permintaan — app lama menampilkan pesan "Permintaan terkirim…"; persetujuan dilakukan dari app 2.4.7.

## Google Play — "Yang baru"
**id-ID**
```
Els App 2.4.7:
• Tambah keluarga kini perlu persetujuan orangnya
• Setujui / tolak permintaan keluarga di menu Keluarga
• Pencarian jemaat manual lebih mudah (keyboard tidak menutupi)
• Catatan pengajuan Spiritual Journey opsional
• Perbaikan kecil
```
**en-US**
```
Els App 2.4.7:
• Adding family now requires their approval
• Approve / decline family requests in the Family menu
• Easier manual member search (keyboard no longer covers it)
• Spiritual Journey request notes are optional
• Minor fixes
```

## App Store — "What's New" (en)
```
Els App 2.4.7:
• Adding family now requires their approval
• Approve / decline family requests in the Family menu
• Easier manual member search (keyboard no longer covers it)
• Spiritual Journey request notes are optional
• Minor fixes
```

## Smoke test
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
