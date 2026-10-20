=== TEST ACCOUNT ===
Phone: +6281805807807
OTP: 123456
(Static OTP works ONLY for this review number. Other numbers get a real WhatsApp code.)
Or tap "Continue as Guest" on the welcome screen to browse news, devotionals, Bible and schedules without login.

=== ABOUT ===
Els App is the official app of El Shaddai Creative Community (ECC), an Indonesian church network. Members view service schedules, reserve seats and self check-in, register for events, read devotionals, news and the Bible, listen to the church's own worship songs, send prayer requests, see their ministry schedule and Spiritual Journey, join homecells/groups, and manage family and privacy.

=== WHAT'S NEW IN 2.4.0 ===
- ECC Worship: albums/singles of ECC's original songs with lyrics, karaoke (instrumental) mode and offline downloads.
- Prayer ("Doa"): members send prayer requests to the church team and are notified when prayed for.
- Redesigned Home quick access.

=== COMPLIANCE NOTES ===
1. Donations (3.2.2(iv)): No donation is collected in the app. The Home "Beri" (Give) tile opens https://eccchurch.global/persembahan/... in external Safari via Linking.openURL(). No WebView, no in-app payment, no IAP. The page only shows the church's bank transfer details.

2. Event payments (3.1.5(b)): Some events (retreats, workshops, physical merchandise) are physical services consumed outside the app, paid by bank transfer. Fixed-price events: bank details in app, user uploads a payment-proof photo. Pay-what-you-want events: app opens https://eccchurch.global/bayar/event/... in a secure browser session with bank details, proof upload and a "Back to Els App" button. No digital content is sold, so IAP is not required.

3. Background audio (UIBackgroundModes: audio): used only by ECC Worship to keep playing songs when the screen is locked, with lock-screen controls. All songs are original works owned by ECC; the app does not sell music. Streaming requires login; downloads stay inside the app. No microphone access is requested.

4. Universal Links: eccchurch.global /event/*, /ibadah/*, /content/*, /renungan/*, /news/* open the app. Payment (/event/*/pembayaran, /bayar/*) and donation (/persembahan/*) paths are EXCLUDED in the AASA and always stay in the browser.

5. Location (When In Use only): used when the user taps "Self Check-in" to confirm they are at the venue, or searches for the nearest homecell. No background location.

6. Camera: only for scanning QR codes. Photo Library: only when uploading a profile photo, payment proof, group cover or business photo.

7. Encryption: standard HTTPS/TLS only (ITSAppUsesNonExemptEncryption = false).

=== KEY FLOWS ===
1. ECC Worship: Home → "Worship" tile → album → Play. Lock the screen to verify background playback. In the player, switch "Vokal / Karaoke" and open lyrics. Song menu (⋮) → Download.
2. Prayer: Home → "Doa" → "Buat Prayer Request" → choose category, write request (optionally anonymous) → Send.
3. Event: Home → any event → "Daftar" (Register). Paid: bank details → upload proof → admin verification.
4. Service: "Ibadah" tab → service → "Reservasi". "Self Check-in" appears 15 minutes before start.
5. Bible: Home → "Alkitab" → pick BIMK or KJV → book/chapter.
6. Delete Account: Profil tab → bottom → "Hapus Akun" → confirm → account deactivated and logged out.
Worship and Prayer require login (not shown in Guest mode). The Worship tile appears once at least one song is published (songs are published for review).

=== CONTACT ===
Ari Christian (arichrst@ide.asia)
El Shaddai Creative Community
Support: https://eccchurch.global/support
