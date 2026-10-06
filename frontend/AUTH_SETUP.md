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
