# A.L.I.S.T.O.

**Automated Local Incident & Spatial Tracking Operations** is a community incident-reporting project for residents and barangay staff. This repository contains a React web workspace and an Expo React Native app for Android.

| App | What you can do | Where the data lives |
| --- | --- | --- |
| Resident web app | Enter as a guest, report an incident with a location and optional photos, and track its status. | Reports stay in browser memory until the page reloads. |
| Staff web dashboard | Review reports in the same workspace, update their status, and view counts by category and status. | The dashboard reads the current web workspace. |
| Resident Android app | Save and reopen a draft with a category, description, photo, and GPS coordinates or a typed landmark. | Drafts persist in SQLite on the device. |

Resident web registration uses Supabase email and password. To enable it in development, configure email signups and the Auth site URL, and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (publishable key) before restarting Vite. After the team’s initial schema is installed, review the [resident profile trigger](supabase/migrations/202611240001_resident_signup.sql) and apply it once. If a signup trigger already creates profiles, reconcile the two before applying. Test one signup and confirm that the Auth user ID matches an ACTIVE RESIDENT profile. Phone is optional contact information. Web sign-in, Android delivery to staff, and the resident AI analytics assistant are pending.

## Staff access

Apply the [staff access migration](supabase/migrations/202611240002_staff_access.sql) after the profile schema. Provision staff roles through a trusted administrator. Both staff entry points require a Supabase password sign-in and an active staff profile. The database identifies the caller using the authenticated user ID. The dashboard locks when the session expires and rechecks staff access periodically and when the window regains focus.

Staff screens currently operate on local workspace data. When connecting shared reports, enforce role and assignment checks on every backend operation and restrict direct table access with database permissions and RLS.

## Quick start

Install Node.js 22 with npm. From the repository root, run the setup script to install dependencies for both apps. The first install needs access to the npm registry.

```sh
./setup
npm run dev
```

Open [localhost on port 8443](http://localhost:8443/). To try the workflow, choose **Resident App**, continue as a guest, and add an incident. Then open the [staff dashboard](http://localhost:8443/#admin) in the **same tab** and sign in with an active staff account to review it. Refreshing or opening a second tab starts a new workspace.

## Run the Android app

For a local Android build, configure the Android SDK and Java development kit, then start an emulator or connect an Android phone with USB debugging enabled. After running the root setup script, run these commands from the repository root.

```sh
cd apps/resident-mobile
npm run android
```

To check persistence, save a draft, close the app, and reopen it on the same device. For a shareable APK, follow the preview build instructions in the [mobile README](apps/resident-mobile/README.md).

## Development commands

| Directory | Command | Purpose |
| --- | --- | --- |
| Repository root | `npm test` | Run the web workspace and server-render checks. |
| Repository root | `npm run build` | Generate the production web bundle in `dist/`. |
| Repository root | `npm run preview` | Serve the built web bundle locally. |
| `apps/resident-mobile/` | `npm start` | Start the Expo development server. |
| `apps/resident-mobile/` | `npm run typecheck` | Check the mobile TypeScript source after installing dependencies. |

The web screens live in [src/resident](src/resident) and [src/admin](src/admin). The [web store](src/store.tsx) handles in-memory reports and status updates. The Android [app](apps/resident-mobile/App.tsx) and [draft storage](apps/resident-mobile/drafts.ts) live together in the mobile directory.
