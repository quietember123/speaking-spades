# Speaking Spades v0.5 — browser + Firebase account foundation

## What works
- Existing offline Classic/Joker practice game, including bidding, scores and spade-slam audio.
- Added account UI: email/password registration, email verification link, sign-in, sign-out, password reset, editable profile username, verification status refresh.
- Without Firebase configuration, **practice remains playable** and account buttons are disabled.

## Phone-friendly setup (GitHub Pages + Firebase)
1. Create a Firebase project at https://console.firebase.google.com/ and register a **Web** app. Copy its web config values into `firebase-config.js` (public client config only).
2. Firebase Console > Authentication > Sign-in method: enable **Email/Password**. Under Authentication > Settings > Authorized domains, add `YOUR-USERNAME.github.io` (and localhost if testing locally). Firebase may require domain authorization for email actions.
3. Firebase Console > Firestore Database: create database. Open **Rules**, paste `firestore.rules`, and publish. Never use open test rules for production.
4. In GitHub, upload `index.html`, `account.js`, `firebase-config.js`, `firestore.rules`, and `assets/` to repository root (keep audio path). In Settings > Pages deploy from `main` / root.
5. Open your HTTPS GitHub Pages URL. Create an account, follow the email verification link, and press **Check verification**. Test sign-out, sign-in and password reset.
6. If using Chrome on a phone, choose **Desktop site** for difficult GitHub/Firebase console pages.

## Important limitations and security notes
- This is **not a live configured authentication service** until you create a Firebase project and enter its config. We cannot verify external service behavior without your project.
- Email verification is implemented; **phone-based 2FA/MFA is NOT implemented**. Firebase SMS multi-factor authentication requires additional Identity Platform configuration, billing and a carefully designed enrollment flow. Do not describe phone login alone as 2FA.
- Usernames are not globally unique in this version. Unique handles require a secure server-side reservation mechanism; don't claim uniqueness yet.
- Account creation may succeed even if a later profile write or verification-email send fails; retry with sign-in, and investigate Firestore rules or Firebase configuration.
- Firestore profile documents are private to their owner. Never store passwords, verification codes, or server API secrets in the repository.
- Gameplay is still **offline against bots**. Authentication does not enable multiplayer, chat, friend lists or anti-cheat.
- Email/password login and Firestore may require Firebase plan/billing configuration depending on current provider limits. Phone MFA and real-time audio can incur charges.
- Existing game engine has not been comprehensively browser-tested; this version is a development prototype, not a verified production release.
- GitHub Pages public repositories expose source files; public Firebase web configuration is normal, but keep Firebase Admin service account credentials and any private tokens off the client.
