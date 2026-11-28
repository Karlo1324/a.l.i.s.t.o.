# A.L.I.S.T.O. Resident for Android

This Expo project uses React Native views for the resident app. Run commands here, inside `apps/resident-mobile`.

```sh
npm ci
npm run typecheck
npx eas-cli@latest build --platform android --profile preview
```

The preview profile generates an installable APK and supplies the public Supabase configuration. For a local development build, set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in .env.local and run `npm run android` with an Android device or emulator attached. The Android Keystore session module requires a native build.

Sign in with a resident account, open **Add an incident**, and complete category, details, photos, location and review. Successful submission shows the reference from Supabase. Refresh the official verification queue and match that reference. Guest drafts remain on the device.
