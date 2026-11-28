# A.L.I.S.T.O. Resident for Android

This directory contains the Expo React Native app. To use the browser app or prepare the Supabase database, see the [project setup guide](../../README.md).

## Local development

1. Install Node.js 22, a JDK, and the Android SDK with Android Studio. Start an Android emulator or attach a phone with USB debugging enabled. Run `adb devices` to check that it appears as a connected device.
2. From the repository root, run `./setup`, then `cd apps/resident-mobile`. If you are already in this directory and only need Android dependencies, run `npm ci`.
3. Create or edit `.env.local` **in this directory** using the same Supabase project as the staff web dashboard.

   ```dotenv
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_CLIENT_KEY
   ```

4. Type-check, build, and launch the app.

   ```sh
   npm run typecheck
   npm run android
   ```

   The Android Keystore session module requires a native build. For later JavaScript-only changes, run `npm start` and reopen the installed development app.

## Build a shareable APK

From this directory, review the Supabase URL and public key under `build.preview.env` in [eas.json](eas.json). That profile supplies the backend configuration for the cloud build. Sign in to an Expo account with project access, then run:

```sh
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
```

Download the resulting APK from the build link and install it on the test device.

## Check report delivery

Sign in with a confirmed resident account assigned to a reporting barangay. Open **Add an incident**, enter its details and location, and submit. Match the returned tracking number against the report in the staff verification queue. To check offline draft storage, save a guest draft and reopen the app on the same device.
