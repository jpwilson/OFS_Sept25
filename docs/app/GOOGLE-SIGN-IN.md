# Turning on "Continue with Google" (owner's checklist)

The button is already built into the new sign-in pages and switched off (`"google": false` in `frontend/app.config.json`). It needs two accounts set up that only the owner can reach: Google Cloud and the Supabase dashboard. Secrets go from Google straight into Supabase: never into chat, git, Vercel or a `.env` file.

Supabase project: `vrquvdzoelvmwsxixqkt`. Checked on 26 Nov 2026 from its public settings: email sign-in on, Google off, new sign-ups allowed, email confirmation required.

## 1. Google Cloud (about 15 minutes)

1. Open https://console.cloud.google.com → project picker (top bar) → **New project** → name it `Our Family Socials` → Create, then select it.
2. Search for **Google Auth Platform** → **Get started**:
   - App name `Our Family Socials`; User support email: your email → Next.
   - Audience: **External** → Next.
   - Contact information: your email → Next → agree → **Create**.
3. **Branding**:
   - Application home page `https://www.ourfamilysocials.com`
   - Privacy policy `https://www.ourfamilysocials.com/privacy`
   - Terms of service `https://www.ourfamilysocials.com/terms`
   - Authorized domains: `ourfamilysocials.com` and `vrquvdzoelvmwsxixqkt.supabase.co`
   - Leave the logo empty for now: adding one triggers Google's brand verification (several days). The app name shows without it.
   - Save.
4. **Data Access** → Add or remove scopes → tick `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` → Update → Save.
5. **Audience** → Publishing status says Testing → **Publish app** → Confirm. (In Testing, only listed test users can sign in.)
6. **Clients** → **Create client**:
   - Application type: **Web application**; name `Our Family Socials web`.
   - Authorized JavaScript origins: `https://www.ourfamilysocials.com`, `https://ourfamilysocials.com`, `http://localhost:3000`
   - Authorized redirect URIs: `https://vrquvdzoelvmwsxixqkt.supabase.co/auth/v1/callback` (exactly this, nothing else)
   - **Create** → copy the **Client ID** and **Client secret** (keep the window open for step 2).

## 2. Supabase dashboard (5 minutes)

1. https://supabase.com/dashboard → the Our Family Socials project → **Authentication** → **Sign In / Providers** → **Google** → turn on **Enable Sign in with Google** → paste the Client ID and Client secret → leave "Skip nonce checks" off → **Save**.
2. **Authentication** → **URL Configuration**:
   - Site URL: `https://www.ourfamilysocials.com`
   - Redirect URLs (add any that are missing): `https://www.ourfamilysocials.com/auth/callback`, `https://www.ourfamilysocials.com/reset-password`, `http://localhost:3000/**`
   - Save.
3. While there, check **Authentication** → **Emails** → **SMTP Settings** is on and uses your own sender (Resend). Supabase's built-in mailer sends only a couple of emails an hour.
4. **Do not** press "Migrate JWT secret" or rotate signing keys: the backend only understands the current secret.

## 3. Switching the button on

Tell Claude when steps 1 and 2 are done. It sets `"google": true` in `frontend/app.config.json` in a one-line pull request; when that is merged (after the new app look is live), "Continue with Google" appears first on the sign-in and sign-up pages.

## 4. Testing it (private window, then your phone)

1. `https://www.ourfamilysocials.com/login` → **Continue with Google** with a Google account never used on the site → you should land on "What should we call you?" with your name and a handle filled in → continue → "You're in".
2. Sign out, then Continue with Google again with the same account → straight to your stories, no questions.
3. Continue with Google using the Gmail address of an existing email-and-password account → you land in that same account (Supabase links them by email); its password still works afterwards.
4. At Google's screen press Cancel → you are back on the sign-in page with a short note.

Google's consent screen will say "to continue to vrquvdzoelvmwsxixqkt.supabase.co". Showing `ourfamilysocials.com` there instead needs a Supabase custom domain (a paid add-on) and one extra redirect URI; optional, later.
