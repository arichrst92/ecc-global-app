=== TEST ACCOUNT ===
Phone: +6281805807807
OTP: 123456
(Static OTP works ONLY for this review number. Other numbers get a real WhatsApp code.)
Or tap "Continue as Guest" to browse without login.

=== ABOUT ===
Official app of El Shaddai Creative Community (ECC), an Indonesian church network: service reservations, check-in, events, devotionals, news, Bible, worship songs, prayer, homecells and family.

=== WHAT'S NEW IN 2.4.4 ===
- Consent screen: at sign-up, and once for existing users, the user ticks agreement to the Terms & Privacy Policy, explicit consent for sensitive data (church membership) and an age group (18+, or 13-17 with parent/guardian permission). Under-13s cannot create accounts. "I don't agree" signs the user out.
- Privacy settings: "Download my data" (JSON copy via the share sheet) and on/off switches for non-essential WhatsApp messages.
- Anonymous usage statistics (screens opened, app speed) to improve the app; can be turned off in Profil > Pengaturan > Privasi.

=== COMPLIANCE NOTES ===
1. Donations (3.2.2(iv)): No donation is collected in the app. The Home "Beri" (Give) tile opens https://eccchurch.global/persembahan/... in external Safari via Linking.openURL(). No WebView, no in-app payment, no IAP.

2. Event payments (3.1.5(b)): Some events (retreats, workshops) are physical services paid by bank transfer (proof upload) or in the browser. No digital content is sold.

3. Background audio (UIBackgroundModes: audio): used only by ECC Worship to keep playing songs when the screen is locked, with lock-screen controls. ECC's own songs; nothing sold.

4. Universal Links: eccchurch.global /event/*, /ibadah/*, /content/*, /renungan/*, /news/* open the app. Payment (/event/*/pembayaran, /bayar/*) and donation (/persembahan/*) paths are EXCLUDED in the AASA and always stay in the browser.

5. Location (When In Use only): used when the user taps "Self Check-in" to confirm they are at the venue, or searches for the nearest homecell. No background location.

6. Camera: only for scanning QR codes. Photo Library: picking a photo to upload (profile, payment proof, covers), and "Save to photos" (add only) for the generated share image.

7. Calendar: "Simpan ke kalender" opens the system "New Event" sheet. iOS 17+ requests no access; older iOS asks once. The calendar is never read.

8. Notifications: only LOCAL notifications for the optional Bible 365 daily reminder (time chosen by the user). Permission is requested only when the user turns the reminder on.

9. Encryption: standard HTTPS/TLS only (ITSAppUsesNonExemptEncryption = false).

10. Analytics: first-party and anonymous (random per-install ID, not linked to the account), no third-party SDK, no advertising, no cross-app tracking, so no ATT prompt. Opt-out in Privacy settings.

=== KEY FLOWS ===
0. Consent: the review account is asked once after login; tick both boxes, choose an age group, "Setuju & Lanjutkan".
1. ECC Worship: Home → "Worship" → album → Play; lock the screen to verify background playback.
2. Prayer: Home → "Doa" → "Buat Prayer Request" → choose category, write request (optionally anonymous) → Send.
3. Event: Home → any event → "Daftar" (Register). Paid: bank details → upload proof → admin verification.
4. Service: Home → "Ibadah" → service → "Reservasi". The ticket appears in the "Reservasi" tab; tap it for the full QR and "Simpan ke kalender". Swipe to self check-in from 15 minutes before start.
5. Bible 365: Home → "Alkitab" → "Bible 365" → tick the commitment → choose a reminder time (or none) → tick chapters, write a note, tap "Bagikan" to share the progress image.
6. Delete Account: Profil tab → bottom → "Hapus Akun" → confirm → account deactivated and logged out.
Worship and Prayer require login. The Worship tile appears once a song is published (published for review).

=== CONTACT ===
Ari Christian (arichrst@ide.asia)
El Shaddai Creative Community
Support: https://eccchurch.global/support
