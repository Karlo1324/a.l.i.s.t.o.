# A.L.I.S.T.O. Resident for Android

From this directory, run `npm install`, then `npm run android` with an Android emulator running or a USB device connected. For Metro alone, use `npm start`. Check TypeScript with `npm run typecheck`.

To create an installable preview APK, sign in to Expo and run `npx eas-cli@latest build --platform android --profile preview` from this directory. On the first build, link the mobile app to an Expo project and configure Android signing when prompted.

Residents can save and reopen local drafts with a category, description, photo and GPS coordinates or landmark. Drafts live in the app’s SQLite database. A Supabase session and a report submission API are still needed for accounts and delivery to staff.
