=== TEST ACCOUNT ===
Phone: +6281805807807
OTP: 123456
(Static OTP works ONLY for this review number. Other numbers get a real WhatsApp code.)
Or tap "Continue as Guest" on the welcome screen to browse news, devotionals, Bible and schedules without login.

=== ABOUT ===
Els App is the official app of El Shaddai Creative Community (ECC), an Indonesian church network. Members view service schedules, reserve seats and self check-in, register for events, read devotionals, news and the Bible, see their ministry schedule and Spiritual Journey, join homecells/groups, and manage family and privacy.

=== COMPLIANCE NOTES ===
1. Donations (3.2.2(iv)): No donation is collected in the app. The Home "Beri" (Give) tile opens https://eccchurch.global/persembahan/... in external Safari via Linking.openURL(). No WebView, no in-app payment, no IAP. The page only shows the church's bank transfer details.

2. Event payments (3.1.5(b)): Some events (retreats, workshops, physical merchandise) are physical services consumed outside the app, paid by bank transfer.
- Fixed-price events: bank details shown in app; user uploads a payment-proof photo.
- Pay-what-you-want events: app opens https://eccchurch.global/bayar/event/... in a secure browser session with bank details, proof upload and a "Back to Els App" button.
No digital content is sold, so IAP is not required.

3. Universal Links: eccchurch.global /event/*, /ibadah/*, /content/*, /renungan/*, /news/* open the app. Payment (/event/*/pembayaran, /bayar/*) and donation (/persembahan/*) paths are EXCLUDED in the AASA and always stay in the browser.

4. Location (When In Use only): used when the user taps "Self Check-in" to confirm they are at the venue, or searches for the nearest homecell. No background location. Without it, users can still check in by showing their QR code to an usher.

5. Camera: only for scanning QR codes (check-in, adding family/group members). The app does not take photos.

6. Photo Library: only when the user uploads a profile photo, event payment proof, group cover, or business photo (Local Market).

7. Encryption: standard HTTPS/TLS only (ITSAppUsesNonExemptEncryption = false).

=== KEY FLOWS ===
1. Guest: Welcome → "Continue as Guest". Account-only actions (registration, reservations, family) show a login prompt.
2. Event: Home → any event → "Daftar" (Register). Free: instant confirmation. Paid: bank details → upload proof → admin verification.
3. Service: "Ibadah" tab → service → "Reservasi". "Self Check-in" appears 15 minutes before start (location asked at that moment).
4. Bible: Home → "Alkitab" tile → pick BIMK or KJV → book/chapter.
5. Profile: Profil tab → Data Diri, Privasi (who can see personal data), Edit Profil. Changing phone number sends a WhatsApp code to the NEW number, so it cannot be completed with the review account (optional).
6. Delete Account: Profil tab → bottom → "Hapus Akun" → confirm → account deactivated and logged out.

=== CONTACT ===
Ari Christian (arichrst@ide.asia)
El Shaddai Creative Community
Support: https://eccchurch.global/support
