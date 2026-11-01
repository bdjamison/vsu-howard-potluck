# Trojans Gather — VSU Howard County Holiday Potluck

A standalone Azure Static Web App for the Virginia State University Alumni Association, Howard County, Maryland Chapter.

**Event:** Sunday, December 13, 2026, 3–6 PM, home of VP LeMontre Taylor (address not published). Contact: Secretary Keisha Fitzgerald, 301-346-3987.

## Features
- Royal blue and orange mobile-first public signup.
- Seven food categories with initial targets for **40 people**: protein 40, starch 40, vegetables 32, fruit 20, sides 32, drinks 60, desserts 28.
- Guests choose their own dish and number of servings.
- Only approved servings count toward food targets; pending servings appear separately.
- Public list contains approved names/dishes/servings but never mobile numbers.
- Board-only dashboard with Pending, Approved, Declined, Revoked, All views and search.
- SMS confirmation link and copyable text; approver must check that a confirming reply was received.
- Any authorized `potluck_approver` can approve independently. Server checks role before decisions.
- Audit table records approval/decline/revoke/reopen actions.

## Deploy to Azure (new app; leave other apps untouched)
1. Create a **new private GitHub repository** named `vsu-howard-potluck` and upload the contents of this folder to its root (including `.github`).
2. In the Azure portal, create a **new Azure Static Web App** and link the GitHub repository's `main` branch. Use Free plan if appropriate. Build settings: app location `public`, API location `api`, output location empty. The included workflow also deploys via `AZURE_STATIC_WEB_APPS_API_TOKEN`; use the deployment token from this new Static Web App as that repository secret. If Azure creates its own workflow, keep only one deployment workflow.
3. Create or reuse an Azure Storage account (not tables used by the NPHC app). In the **new Static Web App → Environment variables / Application settings**, add `AZURE_STORAGE_CONNECTION_STRING` containing that Storage account's connection string. This is a server-side setting; **never commit it to GitHub**. The API creates `PotluckSignups` and `PotluckAudit` tables on first use. Restart/redeploy if required.
4. Configure the new Static Web App's **Microsoft Entra ID authentication** and invite authorized Executive Board members with the exact custom role `potluck_approver`. Verify each person has accepted the invite and can sign in with the identity provider configured for the app. The `/admin.html` route and decision endpoint require that role. **Do not use public/anonymous role invitations.**
5. Test with one non-board guest and one board member. Verify that a pending signup is invisible on the public contribution list and doesn't change confirmed totals. Have the board member text and confirm the guest, approve, then verify public totals update. Confirm a guest cannot access `/admin.html` or POST to `/api/potluck/{id}/decision`.
6. Add your own domain in Azure if desired. The host's street address is intentionally omitted from public pages.

## Important operational notes
- This starter supports **manual SMS** only; it does not automatically send texts or verify identity. Approvers are responsible for confirming replies.
- **Attendance target is initially fixed at 40.** Category targets are calculated from this estimate. RSVP counts are stored but not yet used to automatically change targets; the board should review and adjust the planning baseline as needed.
- Guests cannot currently self-edit or cancel; a board member can revoke/reopen. A self-service edit workflow is a future enhancement.
- No automatic SMS/email notifications or scheduled reminders are configured.
- Azure Static Web Apps custom role assignment and provider setup may differ by plan and identity provider; check your tenant settings before going live.
- Public signups can be spammed. The form includes a basic honeypot, but **production public deployment should add server-side rate limiting and abuse monitoring** (e.g., Front Door/WAF or equivalent) before broad distribution.
- Approval audit logging is best-effort after the update, not a transaction: for stricter audit guarantees, add a durable transactional outbox or a single-partition audit design.
- Consider a privacy/retention policy for names, phone numbers and RSVP information; restrict storage-account access.

## Run tests
`node --test api/test/*.test.js`

## Local development
Install dependencies at the root and in `api/`, configure `api/local.settings.json` with `AZURE_STORAGE_CONNECTION_STRING` (gitignored), then run `npm start`. Azure Functions Core Tools and Static Web Apps CLI are needed for local API emulation. For reliable auth testing, deploy to an Azure staging environment because local auth behavior differs.

## Architecture
`public/` HTML/CSS/JS, `api/` Azure Functions v4 (Node 20), Azure Table Storage, `.github/workflows/` GitHub Actions deployment.


## Version 1.1 update
- Required email and validated U.S. mobile number; contact data is visible only to authorized approvers.
- One attendee count, no separate child count.
- Food targets are advisory and may be exceeded.
- Public POST signup is explicitly allowed; decision POST routes require `potluck_approver`, with additional backend role enforcement.
- Uses `api/src/index.js` as Azure Functions v4 entry point.
- This package is for replacing source files in the existing GitHub repository. Do not upload the ZIP as a single file.
- The project has not been deployed to your live Azure app by this update.
