=== TEST ACCOUNT ===
Phone: +6281805807807
OTP: 123456
(The static OTP 123456 is enabled ONLY for this review phone number. Other numbers receive a real one-time code via WhatsApp.)

Alternative: tap "Continue as Guest" ("Lanjut sebagai Tamu" on Indonesian devices) on the welcome screen — no login required to browse news, devotionals, Bible, and church schedules.

=== APP OVERVIEW ===
Els App is the official mobile app for El Shaddai Creative Community (ECC), an Indonesian Christian church network with multiple locations. The app helps congregants:
- View worship service schedules (Ibadah), reserve a seat, and self check-in
- Register for church events (Bible study, retreats, workshops)
- Read daily devotionals (Renungan) and news
- Read the Bible in Indonesian (BIMK) and English (KJV)
- See their ministry service schedule (Pelayanan) and Spiritual Journey progress
- Join homecells (small groups) and community groups
- Manage family members, privacy settings, and their profile

=== COMPLIANCE NOTES ===

1. Charitable Donations (Guideline 3.2.2(iv)):
   The "Persembahan" (offering) tab is hidden from the tab bar. The "Beri" (Give) tile on the Home screen opens the church's donation page in the EXTERNAL Safari browser via Linking.openURL() (https://eccchurch.global/persembahan/...). No donation is collected inside the app: no WebView, no in-app payment, no IAP. The web page only shows the church's bank account / QRIS details.

2. Event Registration Payments (Guideline 3.1.5(b)):
   Some events (physical retreats, workshops, physical merchandise) require payment. These are PHYSICAL goods/services consumed outside the app, paid by Indonesian bank transfer:
   - Fixed-price events: bank details are shown in the app and the user uploads a payment-proof photo.
   - Pay-what-you-want events: the app opens the church's web payment page (https://eccchurch.global/bayar/event/...) in a secure browser session, showing bank details and a proof upload form, with a "Back to Els App" button.
   No digital content is sold. No StoreKit/IAP is required per 3.1.5(b).

3. Universal Links:
   https://eccchurch.global/event/*, /ibadah/*, /content/*, /renungan/*, /news/* open the app when installed (AASA at https://eccchurch.global/.well-known/apple-app-site-association). Payment pages (/event/*/pembayaran, /bayar/*) and donation pages (/persembahan/*) are EXCLUDED and always stay in the browser.

4. Location (When In Use only):
   Used only when the user (a) taps "Self Check-in" to confirm they are at the church service/event venue, or (b) searches for the nearest homecell. No background location. If the user declines, they can still check in by showing their QR code to an usher.

5. Camera:
   Used only to scan QR codes (attendance check-in, adding family/group members). The app does not take photos with the camera.

6. Photo Library:
   Used only when the user chooses to upload a profile photo, event payment proof, group cover photo, or their business photo (Local Market).

7. Encryption:
   Standard HTTPS/TLS only. ITSAppUsesNonExemptEncryption = false.

=== KEY FLOWS TO TEST ===

1. Guest Mode:
   Welcome screen → "Continue as Guest" → browse freely. Actions that need an account (event registration, reservations, family, bookmarks) show a login prompt.

2. Event Registration (logged in):
   Home → any event → "Daftar" (Register). Free events: instant confirmation. Paid events: bank details → upload payment proof → awaits admin verification.

3. Worship Service:
   Home → today's service or "Ibadah" tab → service detail → "Reservasi" (reserve seat). "Self Check-in" appears 15 minutes before the service starts (location permission is requested at that moment).

4. Bible:
   Home → "Alkitab" tile → choose BIMK or KJV from the version picker → select book/chapter → read.

5. Profile & Privacy:
   Profil tab → "Data Diri" card, "Privasi" (choose who can see personal data), "Edit Profil".
   Note: changing the phone number sends a WhatsApp code to the NEW number, so it cannot be completed with the review account — this is optional to test.

6. Delete Account:
   Profil tab → scroll to the bottom → "Hapus Akun" → confirm → account deactivated and user logged out.

=== CONTACT ===
Developer: Ari Christian (arichrst@ide.asia)
Church: El Shaddai Creative Community (Gereja El Shaddai Injil Sepenuh)
Team ID: RB94VQ27V3
Support URL: https://eccchurch.global/support
