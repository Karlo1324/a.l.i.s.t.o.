# A.L.I.S.T.O.

**Automated Local Incident & Spatial Tracking Operations** is a community incident-reporting project for residents and barangay staff. This repository contains a React web workspace and an Expo React Native app for Android.

| App | What you can do | Where the data lives |
| --- | --- | --- |
| Resident web app | Sign in, report an incident with a location and optional photos, and track its status. | Signed-in reports are stored in Supabase; guest/demo reports stay in browser memory. |
| Staff web dashboard | Review or reject reports, dispatch responders, and track task acceptance and progress. | Staff reads and updates barangay-scoped Supabase reports when configured. |
| Resident Android app | Save and reopen a draft with a category, description, photo, and GPS coordinates or a typed landmark. | Drafts persist in SQLite on the device. |

Android report delivery to staff and the resident AI analytics assistant remain planned integrations. Web resident accounts and report submission use Supabase when configured.

## Quick start

Install Node.js 22 with npm. From the repository root, run the setup script to install dependencies for both apps. The first install needs access to the npm registry.

```sh
./setup
npm run dev
```

Open [localhost on port 8443](http://localhost:8443/). Without Supabase configuration, the resident guest flow and staff dashboard use a local demo workspace. With Supabase configured, sign in as a resident to submit reports and use the staff dashboard to review and dispatch them.

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

The web screens live in [src/resident](src/resident) and [src/admin](src/admin). The [web store](src/store.tsx) coordinates report state, while Supabase RPCs persist signed-in resident submissions and staff workflow changes. The Android [app](apps/resident-mobile/App.tsx) and [draft storage](apps/resident-mobile/drafts.ts) live together in the mobile directory.

## Supabase staff workflow

The staff report review, barangay-scoped responder directory, dispatch, explicit task acceptance, resident decision notifications, and responder role requests require the SQL migrations in `supabase/migrations` to be applied to the configured Supabase project in filename order. Migration `202611250012_admin_dispatch_acceptance.sql` adds the persisted review and dispatch actions; `202611250013_resident_report_decision_notifications.sql` adds durable in-app notifications for accepted and rejected reports; `202611250014_dispatch_priority_compatibility.sql` keeps dispatch priority independent of legacy report-priority constraints; `202611250015_responder_access_requests.sql` adds admin-reviewed responder registration; and `202611280001_resident_report_category_lookup.sql` makes mobile report category resolution tolerant of category-code naming differences and replaces opaque missing-row errors with actionable messages. Responders must have an active `OFFICIAL` profile assigned to the report's barangay. Email, SMS, and push delivery are not connected.
