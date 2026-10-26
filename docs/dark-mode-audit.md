# Audit Dark Mode — Els App

Diperbarui otomatis dari kode (audit statis). ✅ = semua warna halaman memakai token tema
(kelas netral/tint ber-variabel, `bg-card`, `nc()` untuk hex, gradient brand). Tetap perlu dicek visual di HP.

Ringkasan: 102 halaman, 20 komponen popup/sheet, 54 elemen `<Modal>` — tidak ada sisa warna terang tertanam.

## Halaman

| Halaman | Status | Cakupan |
|---|---|---|
| `(auth)/login/email.tsx` | ✅ | kartu/latar, ikon/warna |
| `(auth)/login/index.tsx` | ✅ | kartu/latar, ikon/warna |
| `(auth)/login/otp.tsx` | ✅ | kartu/latar, ikon/warna |
| `(auth)/onboarding/index.tsx` | ✅ | kartu/latar, ikon/warna, khusus, popup |
| `(auth)/signup/data.tsx` | ✅ | kartu/latar, ikon/warna |
| `(auth)/signup/index.tsx` | ✅ | kartu/latar, ikon/warna |
| `(auth)/signup/otp.tsx` | ✅ | kartu/latar, ikon/warna |
| `(auth)/signup/success.tsx` | ✅ | kartu/latar |
| `(auth)/welcome.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `(tabs)/ckids.tsx` | ✅ | kartu/latar, ikon/warna, gradient, popup |
| `(tabs)/event.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `(tabs)/ibadah.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `(tabs)/index.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `(tabs)/persembahan.tsx` | ✅ | kartu/latar, gradient |
| `(tabs)/profile.tsx` | ✅ | kartu/latar, ikon/warna, gradient, popup |
| `area/index.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `auth/email/verify.tsx` | ✅ | kartu/latar |
| `bible/[bookId]/[bab].tsx` | ✅ | kartu/latar, ikon/warna, gradient, popup |
| `bible/[bookId]/index.tsx` | ✅ | kartu/latar, gradient |
| `bible/bookmarks.tsx` | ✅ | kartu/latar, ikon/warna |
| `bible/index.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `branch-list.tsx` | ✅ | kartu/latar, ikon/warna |
| `calendar.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `ckids/qr.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `content/bookmarks.tsx` | ✅ | kartu/latar, ikon/warna |
| `content/index.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `content/news/[id].tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `content/renungan/[id].tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `doa/[id].tsx` | ✅ | kartu/latar, ikon/warna, popup |
| `doa/assigned/[id].tsx` | ✅ | kartu/latar, ikon/warna |
| `doa/form.tsx` | ✅ | kartu/latar, ikon/warna |
| `doa/index.tsx` | ✅ | kartu/latar, ikon/warna |
| `event/[id].tsx` | ✅ | kartu/latar, ikon/warna, gradient, popup |
| `event/[id]/donate.tsx` | ✅ | kelas tema |
| `event/[id]/payment.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `event/[id]/pembayaran.tsx` | ✅ | khusus |
| `event/[id]/register.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `family/[id].tsx` | ✅ | kartu/latar, ikon/warna, gradient, popup |
| `family/add/index.tsx` | ✅ | kartu/latar, ikon/warna |
| `family/add/new.tsx` | ✅ | kartu/latar, ikon/warna, gradient, khusus, popup |
| `family/add/phone.tsx` | ✅ | kartu/latar, ikon/warna |
| `family/add/scan.tsx` | ✅ | kartu/latar, ikon/warna |
| `family/index.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `feedback/[id].tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `feedback/index.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `feedback/new.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `giving-done.tsx` | ✅ | khusus |
| `group/[id].tsx` | ✅ | kartu/latar, ikon/warna, popup |
| `group/[id]/add-member.tsx` | ✅ | kelas tema |
| `group/[id]/edit.tsx` | ✅ | kartu/latar, ikon/warna |
| `group/[id]/qr.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `group/index.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `group/new.tsx` | ✅ | kartu/latar, ikon/warna |
| `group/scan.tsx` | ✅ | kelas tema |
| `homecell/[id]/add-member.tsx` | ✅ | kartu/latar, ikon/warna, popup |
| `homecell/[id]/index.tsx` | ✅ | kartu/latar, ikon/warna, gradient, popup |
| `homecell/[id]/schedule/[scheduleId].tsx` | ✅ | kartu/latar, ikon/warna, gradient, popup |
| `homecell/[id]/schedule/new.tsx` | ✅ | kartu/latar, ikon/warna, khusus |
| `homecell/index.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `homecell/requests.tsx` | ✅ | kartu/latar, ikon/warna, popup |
| `homecell/view/[id].tsx` | ✅ | kartu/latar, ikon/warna, popup |
| `ibadah/[id].tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `jemaat/[id].tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `legal/privacy.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `legal/terms.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `market/[id].tsx` | ✅ | kartu/latar, ikon/warna |
| `market/index.tsx` | ✅ | kartu/latar, ikon/warna, gradient, popup |
| `ministry/[id].tsx` | ✅ | kartu/latar, ikon/warna, gradient, khusus, popup |
| `ministry/index.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `my-reservasi/index.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `news/[id].tsx` | ✅ | kelas tema |
| `notifications.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `payment-done.tsx` | ✅ | khusus |
| `profile/businesses/[id].tsx` | ✅ | kartu/latar, ikon/warna, gradient, popup |
| `profile/businesses/index.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `profile/businesses/new.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `profile/my-groups.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `profile/my-guests.tsx` | ✅ | kartu/latar, ikon/warna |
| `profile/my-service.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `qr-card.tsx` | ✅ | kartu/latar, gradient |
| `renungan/[id].tsx` | ✅ | kelas tema |
| `resolusi.tsx` | ✅ | kartu/latar, ikon/warna, gradient, popup |
| `scanner/event/[id].tsx` | ✅ | kelas tema |
| `scanner/ibadah/[id].tsx` | ✅ | ikon/warna, gradient |
| `scanner/index.tsx` | ✅ | kartu/latar, ikon/warna |
| `settings/about.tsx` | ✅ | kartu/latar, ikon/warna |
| `settings/appearance.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `settings/change-branch.tsx` | ✅ | kartu/latar, ikon/warna, gradient, popup |
| `settings/check-update.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `settings/delete-account.tsx` | ✅ | kartu/latar, ikon/warna |
| `settings/edit-profile.tsx` | ✅ | kartu/latar, ikon/warna, gradient, khusus, popup |
| `settings/language.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `settings/privacy.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `spiritual-journey.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `tiket.tsx` | ✅ | gradient |
| `visit/[id].tsx` | ✅ | kartu/latar, ikon/warna, gradient, popup |
| `visit/index.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `visit/scan.tsx` | ✅ | kartu/latar, ikon/warna, popup |
| `worship/album/[id].tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `worship/index.tsx` | ✅ | kartu/latar, ikon/warna, gradient |
| `worship/player.tsx` | ✅ | kartu/latar, ikon/warna, gradient, khusus, popup |
| `worship/song/[id].tsx` | ✅ | kartu/latar |

## Popup / sheet (komponen)

| Komponen | Status | Cakupan |
|---|---|---|
| `components/ForceUpdateModal.tsx` | ✅ | kartu/latar, gradient, popup |
| `components/SoftUpdatePrompt.tsx` | ✅ | kartu/latar, gradient, popup |
| `components/branch/BranchSwitcherSheet.tsx` | ✅ | kartu/latar, ikon/warna, gradient, popup |
| `components/family/TipeRelasiPicker.tsx` | ✅ | kartu/latar, ikon/warna, gradient, popup |
| `components/group/GroupContent.tsx` | ✅ | kartu/latar, ikon/warna, gradient, popup |
| `components/homecell/NearestHomecellModal.tsx` | ✅ | kartu/latar, ikon/warna, gradient, popup |
| `components/homecell/ScheduleMaterials.tsx` | ✅ | kartu/latar, ikon/warna, popup |
| `components/ibadah/ReservasiModal.tsx` | ✅ | kartu/latar, ikon/warna, gradient, popup |
| `components/ibadah/SelfCheckinModal.tsx` | ✅ | kartu/latar, ikon/warna, gradient, popup |
| `components/profile/ChangePhoneModal.tsx` | ✅ | kartu/latar, ikon/warna, popup |
| `components/scanner/JemaatSearchModal.tsx` | ✅ | kartu/latar, ikon/warna, popup |
| `components/scanner/ManualInputModal.tsx` | ✅ | kartu/latar, ikon/warna, popup |
| `components/scanner/PickupInputModal.tsx` | ✅ | kartu/latar, ikon/warna, popup |
| `components/scanner/ScanResultModal.tsx` | ✅ | kartu/latar, ikon/warna, popup |
| `components/tamu/AddTamuModal.tsx` | ✅ | kartu/latar, ikon/warna, popup |
| `components/tamu/WalkInGuestModal.tsx` | ✅ | kartu/latar, ikon/warna, gradient, popup |
| `components/ui/PhoneInput.tsx` | ✅ | kartu/latar, ikon/warna, popup |
| `components/ui/Picker.tsx` | ✅ | kartu/latar, ikon/warna, popup |
| `components/ui/WebDatePickerModal.tsx` | ✅ | kartu/latar, gradient, popup |
| `components/worship/SongActionSheet.tsx` | ✅ | kartu/latar, ikon/warna, popup |

## Pengecualian (sengaja tetap)

- QR (kartu QR, tiket, group, CKids): hitam di atas putih + tepi putih (quiet zone).
- Kamera scanner: hitam. Toast info: abu tua di kedua mode.
- Mode karaoke ECC Worship: latar gelap kecokelatan (sudah gelap).
- Dialog sistem (Alert, pemilih tanggal Android): mengikuti tampilan sistem terang. Pemilih tanggal iOS ikut mode app (`themeVariant`).
- Ikon/teks putih di atas oranye, warna status (merah/hijau/kuning) shade 300–600.
