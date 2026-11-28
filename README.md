# A.L.I.S.T.O.

Automated Local Incident & Spatial Tracking Operations connects residents with barangay staff. Residents can submit geotagged reports and track them by reference number. Staff can verify reports, assign responders, monitor incidents on a map, and publish broadcasts to signed-in residents.

## Run the web app locally

1. Install Node.js 22 with npm. Open a terminal in the repository root, beside this README.
2. Install dependencies. The setup script installs both the web app and the native Android app.

   ```sh
   ./setup
   ```

   For a web-only checkout, use `npm ci` in the repository root.
3. Create or edit `.env.local` in the repository root. Use the project URL and **publishable key** (or legacy anon key) from your team's Supabase project. Both values are included in the client bundle, so use only a public client key.

   ```dotenv
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_CLIENT_KEY
   ```

4. Start the development server. Restart it after changing environment variables.

   ```sh
   npm run dev
   ```

5. Open the URL printed by Vite, normally [localhost:8443](http://localhost:8443/). Choose **Resident App** or **Official Dashboard**. The [standalone resident app](http://localhost:8443/resident/) opens directly without the desktop phone preview. For GPS, allow browser location access and use localhost or HTTPS.

## Connect a Supabase database

For an existing deployment, ask the project owner which migrations have already been applied. **For a new Supabase project, obtain the original A.L.I.S.T.O. database schema and reference data first.** The migrations in this checkout extend existing tables such as `profiles`, `barangays`, `damage_categories`, and `damage_reports`. A blank project cannot be initialized from these files alone.

- On the intended project, open **SQL Editor** and run pending schema migrations individually in filename order. Review errors before continuing. The report migration configures the private `incident-evidence` bucket and upload policies. The category lookup migration improves submission errors for missing category or evidence records. [Migration directory](supabase/migrations)
- Two files are deployment-specific data changes. Review them separately with your database administrator. One assigns **all active admin and official profiles** to Binaton. The other grants admin access to a **specific email address** and requires its confirmed, active profile. On another deployment, apply only the assignments intended for that project. [Binaton assignment](supabase/migrations/202611250007_assign_staff_to_binaton.sql) · [Named administrator assignment](supabase/migrations/202611250010_assign_karlofamoso4_admin.sql)
- Register and confirm a resident account to test submission. Assign the resident a reporting barangay. For staff testing, use a confirmed account with an active staff profile. An existing administrator can assign roles in **Users & Roles** and approve responder access requests. Use matching barangay assignments to test report delivery and dispatch.

## Try the monitoring map with sample incidents

Sign in to the staff dashboard, open the monitoring map, and select **Map filters → Preview sample incidents**. Use **Test place** to switch between **Barangay Binaton** and **Digos City (city center)**. Select **Last 30 days** and **Include resolved incidents** to see all six examples. Turn off the preview to return to workspace reports. Sample incidents are generated locally.

## Run the native Android app

The resident app on the web includes an Android-style desktop preview. To install the native app on an emulator or phone, follow the [Android setup instructions](apps/resident-mobile/README.md). Signed-in submissions use Supabase, while guest drafts are saved on the device.

## Machine-learning implementation guide

The [ML guide](ML_GUIDE.md) covers duplicate detection, location validation, incident clustering, official broadcast drafting, and photo assistance. These features are designed as reviewable suggestions for officials rather than automatic decisions.

## Verify the installation

Run these commands from the repository root after setup.

```sh
npm test
npx tsc --noEmit
npm run build
npm --prefix apps/resident-mobile run typecheck
```

The web build writes to `dist/`. Run `npm run preview` to inspect the built app. To check the connected workflow, submit a test report in your test Supabase project, copy its tracking number, and find it in the staff verification queue for the same barangay.
