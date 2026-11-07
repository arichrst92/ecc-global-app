# Els App v2.4.7 — Release Notes (iOS & Android)

Versi sebelumnya: **2.4.6**. Build baru lewat EAS (bukan OTA). Tidak ada modul native baru.

## Isi rilis
- **Banner "Sedang menjelajahi" cabang lain** — di Beranda tidak lagi tertutup jam / sinyal / baterai di atas layar.
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

## Syarat server
Migrasi `20261115090000_family_link_request`, `20261116090000_homecell_asisten`, `20261117090000_homecell_member_alasan_keluar` + core-api terbaru (`PATCH /admin/homecell/:id/schedule/:scheduleId`, `/admin/me/family/requests…`, link-by-* jadi permintaan, catatan SJ opsional, resolver link Google Maps tanpa koordinat, request join group/homecell hanya PIC di app).
App 2.4.6 ke bawah: menambah keluarga berakun juga menjadi permintaan — app lama menampilkan pesan "Permintaan terkirim…"; persetujuan dilakukan dari app 2.4.7.

## Google Play — "Yang baru"
**id-ID**
```
Els App 2.4.7:
• Tambah keluarga kini perlu persetujuan orangnya
• PIC homecell bisa menunjuk asisten
• Setujui / tolak permintaan keluarga di menu Keluarga
• Pencarian jemaat manual lebih mudah (keyboard tidak menutupi)
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
