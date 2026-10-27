=== TEST ACCOUNT ===
Phone: +6281805807807
OTP: 123456
(Static OTP works ONLY for this review number. Other numbers get a real WhatsApp code.)
Or tap "Continue as Guest" on the welcome screen to browse news, devotionals, Bible and schedules without login.

=== ABOUT ===
Els App is the official app of El Shaddai Creative Community (ECC), an Indonesian church network: service reservations and self check-in, events, devotionals, news, Bible, ECC's own worship songs, prayer requests, homecells/groups and family.

=== WHAT'S NEW IN 2.5.0 ===
- Bible 365: a personal plan to read the whole Bible (Genesis to Revelation) in 365 days, with daily progress, private reflection notes and an optional daily reminder.
- Share as image: verses, devotionals, news, events, ECC Worship songs and Bible 365 progress can be shared as a square image via the iOS share sheet.

=== COMPLIANCE NOTES ===
1. Donations (3.2.2(iv)): No donation is collected in the app. The Home "Beri" (Give) tile opens https://eccchurch.global/persembahan/... in external Safari via Linking.openURL(). No WebView, no in-app payment, no IAP.

2. Event payments (3.1.5(b)): Some events (retreats, workshops) are physical services paid by bank transfer: bank details in app + payment-proof upload, or https://eccchurch.global/bayar/event/... in a browser session. No digital content is sold, so IAP is not required.

3. Background audio (UIBackgroundModes: audio): used only by ECC Worship to keep playing songs when the screen is locked, with lock-screen controls. Songs are ECC's own original works; nothing is sold. No microphone access.

4. Universal Links: eccchurch.global /event/*, /ibadah/*, /content/*, /renungan/*, /news/* open the app. Payment (/event/*/pembayaran, /bayar/*) and donation (/persembahan/*) paths are EXCLUDED in the AASA and always stay in the browser.

5. Location (When In Use only): used when the user taps "Self Check-in" to confirm they are at the venue, or searches for the nearest homecell. No background location.

6. Camera: only for scanning QR codes. Photo Library: picking a photo to upload (profile, payment proof, covers), and "Save to photos" (add only) for the generated share image.

7. Calendar: "Simpan ke kalender" on a ticket opens the system "New Event" sheet; the user saves it. On iOS 17+ no calendar access is requested; on older iOS the system asks once. The app never reads the user's calendar.

8. The full-screen ticket raises screen brightness for QR scanning and restores it on exit.

9. Notifications: only LOCAL notifications for the optional Bible 365 daily reminder (time chosen by the user). Permission is requested only when the user turns the reminder on.

10. Encryption: standard HTTPS/TLS only (ITSAppUsesNonExemptEncryption = false).

=== KEY FLOWS ===
1. ECC Worship: Home → "Worship" tile → album → Play. Lock the screen to verify background playback. Switch "Vokal / Karaoke"; song menu (⋮) → Download.
2. Prayer: Home → "Doa" → "Buat Prayer Request" → choose category, write request (optionally anonymous) → Send.
3. Event: Home → any event → "Daftar" (Register). Paid: bank details → upload proof → admin verification.
4. Service: Home → "Ibadah" → service → "Reservasi". The ticket appears in the "Reservasi" tab; tap it for the full QR and "Simpan ke kalender". Swipe to self check-in from 15 minutes before start.
5. Bible 365: Home → "Alkitab" → "Bible 365" → tick the commitment → choose a reminder time (or none) → tick chapters, write a note, tap "Bagikan" to share the progress image.
6. Delete Account: Profil tab → bottom → "Hapus Akun" → confirm → account deactivated and logged out.
Worship and Prayer require login (not shown in Guest mode). The Worship tile appears once at least one song is published (songs are published for review).

=== CONTACT ===
Ari Christian (arichrst@ide.asia)
El Shaddai Creative Community
Support: https://eccchurch.global/support
