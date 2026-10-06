# SIFT account setup

The loading screen opens account access. Email login, account creation, and Google OAuth use Supabase Auth. The explicit interactive demo is available without credentials and never represents a signed-in account.

## Connect Supabase

1. Create a Supabase project and enable the Email provider in Authentication.
2. Set `AUTH_MODE=supabase`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SECRET_KEY` in the root backend environment. Set database and production settings using [DEPLOYMENT.md](../DEPLOYMENT.md).
3. The browser reads only the public URL and public key from `/api/config`. Keep the service-role key and provider secrets on the backend.
4. In Authentication → URL Configuration, set the deployed frontend Site URL and allow its origin/path as a redirect URL. For development, allow `http://127.0.0.1:5173/` and `http://localhost:5173/`.
5. Set `VITE_API_URL` only if the API is served from a different origin. Restart the backend and frontend.

With email confirmation enabled, account creation shows a confirmation message until the user confirms their email. A confirmed session opens workspace selection. Existing users log in with their email and password.

## Enable Google

1. Create a Google Cloud OAuth client for a web application and configure its consent screen.
2. Add the Supabase callback shown in Authentication → Providers → Google as an authorized redirect URI. It normally has the form `https://PROJECT.supabase.co/auth/v1/callback`.
3. Add your frontend origins as authorized JavaScript origins where required by your Google client configuration.
4. Enable Google in Supabase and enter the Google client ID and secret there. Never put the Google secret in frontend environment variables.
5. Allow the frontend return URLs in Supabase URL Configuration. Test both Google sign-up and returning-user sign-in with a real test account.

The Google button calls `signInWithOAuth({ provider: "google" })`. Supabase returns the session to the application, which opens the Recruiter / Hackathon organizer choice. Missing providers or invalid credentials produce a visible error rather than a simulated login.

Official setup references: [Google sign-in](https://supabase.com/docs/guides/auth/social-login/auth-google), [email and password auth](https://supabase.com/docs/guides/auth/passwords), and [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## Try the complete frontend now

Run `npm run dev -w frontend` and open `http://127.0.0.1:5173/`. After the loading screen, choose **Explore the interactive demo**, select a workspace type, and continue. Add submissions yourself or choose **Try four sample submissions**. Process the batch, review a dossier, and record an advance or award decision with a note. Demo decisions are saved in your browser session. Uploaded entries stay unscored; only the four sample fixtures have illustrative scores.

## Bring your data

- Add entries using the built-in form, or upload a `.csv`, `.json`, or `.tsv` file (up to 5 MB and 20 submissions per evaluation).
- Export Google Forms or Microsoft Forms responses as CSV, then upload that file. This flow imports exports; it does not connect to a forms account automatically.
- Required fields: `candidateName` (or a mapped name column) and `repositories`. Optional fields: `githubUsername` and, for hackathons, `team`.
- Repositories may use `owner/project` or `https://github.com/owner/project`. Recruiting accepts up to five repositories per person, separated by newlines, commas, or semicolons; hackathons accept exactly one per submission.
- JSON accepts an array of objects or an object containing `candidates`, `submissions`, or `responses`. Repository and team values can be arrays. CSV values containing commas or newlines must be quoted. A downloadable CSV template is provided in the upload panel.
- Review the detected columns and row validation before adding a file. Duplicate entries and invalid repositories are rejected. Imported scores and decisions are never accepted as assessment evidence.

Example JSON:

```json
[
  {
    "candidateName": "Example Candidate",
    "repositories": ["owner/project"],
    "githubUsername": "github-handle",
    "team": ["Team member"]
  }
]
```

## Connect live evaluation

A real session loads organization memberships from the API. Choose a workspace with admin or reviewer access; a newly registered user can create an organization. The selected workspace type sets the evaluation workflow, rather than granting backend permissions. Viewers cannot submit or record decisions.

Submitting creates a cohort and queues each repository audit with a stable idempotency key. The frontend monitors actual agent stages and fetches assessments, prior decisions, and calibrated cohort ranks. It processes submissions sequentially to respect organization audit limits. Failed entries can be retried. A browser refresh reconnects to the saved audit IDs; live assessment data is always fetched again from the API.

Scores do not automatically select anyone. Open **Review**, choose an advance / decline or award / no-award decision, and add at least 10 characters of rationale. Live decisions are saved through the authenticated organization API. Export CSV downloads the displayed assessment data and decisions; **Full evidence workspace** opens the existing detailed forensic dashboard with dossier export.

Actual audits require the backend, database, and evaluation provider configuration in [DEPLOYMENT.md](../DEPLOYMENT.md). Google OAuth cannot be verified end to end until your Supabase project and Google provider are configured.
