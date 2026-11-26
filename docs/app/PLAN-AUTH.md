# Plan: sign-in, sign-up and Sign in with Google for Our Family Socials (web)

**Roots used in every citation.** `$M` = `/Users/jpwilson/Documents/Projects/SGTG/OFS_claude` (branch `landing/rebuild`). `$D` = `/Users/jpwilson/Documents/Projects/SGTG/OFS_claude-daylight` (branch `app/daylight`). I checked with `diff` that `App.jsx`, `AuthContext.jsx` and the six auth pages are byte-identical in both checkouts, and with `git diff main landing/rebuild -- backend` that the backend I read is what production runs. Nothing was edited.

## The short version

- **It can be built now, frontend only, in `$D`, on the URLs that already exist, with no backend change.** Google itself needs about twenty minutes of owner configuration (section 5).
- **Sign-up is open today, not invite-only.** `SignupInviteRedirect` only forwards old `/signup?invite=TOKEN` links to `/join/TOKEN`; with no token it goes to the open registration form (`$M/frontend/src/App.jsx:69-78`).
- **Tracing the current flow turned up defects the new work should fix or that block it** (evidence in section 1):
  1. Production still shows a blank page to every signed-in user until PR #7 merges.
  2. Password reset, by code reading, drops the person into the feed without changing the password.
  3. A confirmation email opened on a different device shows "Verification Failed" although the email was confirmed.
  4. Five pages bounce to login on a direct load, and the login page never sends a signed-in person back.
  5. The name typed at sign-up is saved to a column the profile and feed do not read.
  6. A shareable invite link connects only the first person who uses it.
  7. The invite preview endpoint returns titles and covers of the inviter's three latest stories whatever their audience, including Private.
  8. If Supabase is still on its built-in mailer, the whole project can send two auth emails an hour.
- **My main calls:** redirect-based `signInWithOAuth` with PKCE; Google first, email second; email sign-up asks for email and password only; one prefilled "Finish" screen (name and handle) for everyone; a welcome that leads into the first story; sign-in gets its own gate value in `app.config.json` so it can go live with the new landing before the Daylight app pages.

---

## 1. How it works today, end to end

### Routes and session
- Routes: `/login`, `/signup`, `/signup/invited`, `/auth/callback`, `/demo-login`, `/reset-password`, `/join/:token` (`$M/frontend/src/App.jsx:146-158`).
- There is no catch-all on Vercel: each route is listed, and anything else is a real 404 (`$M/frontend/vercel.json:6-42`; auth routes at 7-12, `/join/:token` at 38). I confirmed live: `/auth/callback` returns 200 and an unlisted `/welcome` returns 404. **New URLs cannot be added without editing `vercel.json`.**
- Supabase client: `persistSession`, `autoRefreshToken`, `detectSessionInUrl`, `flowType: 'pkce'`, `localStorage` (`$M/frontend/src/lib/supabaseClient.js:8-16`). Installed `@supabase/auth-js` is 2.78.0 in both checkouts.
- `AuthProvider` reads the session, then loads the profile from `GET /api/v1/users/me`; with no session it trusts `localStorage.user` and `token` for the legacy path (`$M/frontend/src/context/AuthContext.jsx:20-36`). The auth listener runs the same profile load on every auth event (`:39-49`).
- `loading` is only ever cleared, never set again (`:34, 47, 136`). So after a later sign-in event there is a window where `loading` is false and `user` is null.
- API calls take the Supabase access token, refreshing when under five minutes remain, else the legacy `localStorage.token` (`$M/frontend/src/services/api.js:17-61`).
- Backend `get_current_user` tries a Supabase HS256 token (audience check, then without), looks up `users.auth_user_id`, and returns 401 "User profile not found. Please complete registration." when no row exists (`$M/backend/app/core/deps.py:46-105`). Otherwise it falls back to the legacy token and an integer id (`:114-152`).
- Logout calls `supabase.auth.signOut()` and clears legacy keys (`AuthContext.jsx:273-288`). The library default scope is global (`$M/frontend/node_modules/@supabase/auth-js/dist/main/GoTrueClient.js:1492`), so a web logout ends every session, which will include the phone app.

### Sign in
- `Login.jsx` calls `login(email, password)` and always navigates to `/feed` (`$M/frontend/src/pages/Login.jsx:68-78`). It ignores `location.state.from`, which Feed and Profile send (`$M/frontend/src/pages/Feed.jsx:51-55`, `Profile.jsx:48-52`), and never redirects someone who is already signed in.
- `login` calls `signInWithPassword`. On any error other than "email not confirmed" it posts the same email and password to the legacy endpoint (`AuthContext.jsx:140-190`), so every mistyped password also reaches FastAPI.

### Sign up and the profile row
- The form asks for handle, display name, email and password, and says the handle "cannot be changed later" (`Login.jsx:96-127`, `:111`). The only validation is an HTML pattern (`:108`).
- `register` calls `supabase.auth.signUp` with `emailRedirectTo: origin + '/auth/callback'` and stores `username`, `display_name` and `invite_token` in Supabase user metadata (`AuthContext.jsx:192-211`).
- **The `users` row is created by one endpoint, `POST /api/v1/auth/supabase/create-profile`** (`$M/backend/app/api/auth.py:141-373`). It takes the Supabase token in the JSON body, reads `sub` and `email`, returns the existing row if `auth_user_id` matches, and returns 400 "Email or username already registered" if the email or handle belongs to another row (`:200-221`).
- **The trial starts at row creation:** 30 days from now, tier `free`, status `trial` (`:238-252`). The free tier allows five published stories (`$M/backend/app/api/events.py:320-331`).
- **The handle is whatever the client sends.** The backend has no length, character, case or reserved-word rule (`auth.py:133-138`, `:244`), and no endpoint can change it later (`$M/backend/app/api/users.py:14-19`).
- The endpoint is called from three places: straight after sign-up when confirmation is off (`AuthContext.jsx:215-240`), from `AuthCallback` after confirmation (`$M/frontend/src/pages/AuthCallback.jsx:40-73`), and from `AuthContext` whenever `/users/me` is not OK (`AuthContext.jsx:79-131`).
- After a confirmation link, `AuthCallback` creates the profile, then **signs the person out** and shows "Email Verified! … Sign In" (`AuthCallback.jsx:75-77, 110-124`). They type their password a second time.

### A brand-new Supabase user with no row
`/users/me` returns 401, and `AuthContext` looks for `user_metadata.username`. A Google user has none, so it logs "No username in Supabase user metadata" and sets `user` to null (`AuthContext.jsx:88-93`). The person holds a valid session, the app treats them as signed out, Feed sends them to `/login`, and the login form cannot help. That dead end is the central thing the Google work must handle.

### Invitations
- A member creates an email invitation, which sends a Resend email linking to `https://www.ourfamilysocials.com/join/{token}` (`$M/backend/app/api/invitations.py:118-190`, `$M/backend/app/services/email_service.py:542-632`), or one reusable link (`invitations.py:74-116`).
- `/join/:token` calls the public `GET /auth/validate-invite/{token}` and shows the inviter, their counts and three recent stories, with the full sign-up form (`$M/frontend/src/pages/InviteLanding.jsx:56-77, 289-365`). `/signup/invited?token=` is an older page doing the same (`$M/frontend/src/pages/InvitedSignup.jsx:14, 45-63`).
- At profile creation the invitation is marked `signed_up`, the new user is flagged `is_invited_viewer`, any other pending invitation to the same email is processed too, and accepted follows are created in both directions (`auth.py:265-345`).
- `is_invited_viewer` only matters after the trial: such a user without a plan is limited to their inviters' stories (`$M/backend/app/utils/viewer_access.py:13-41`).
- A signed-in member who opens an invite link is sent to `/feed` and the invitation is ignored (`InviteLanding.jsx:40-44`).

### Password reset
`resetPasswordForEmail(email, { redirectTo: origin + '/reset-password' })` (`AuthContext.jsx:290-305`), then `/reset-password` calls `updateUser({ password })` (`:307-319`; `$M/frontend/src/pages/ResetPassword.jsx:23-51`).

### Legacy JWT path
- `POST /auth/login` checks an unsalted SHA-256 hash and signs a token with `SECRET_KEY` (`auth.py:92-129`, `$M/backend/app/core/security.py:8-35`). `POST /auth/demo-login` serves the investor demo (`auth.py:27-85`).
- Both use an in-memory, per-IP limiter of five failures in fifteen minutes (`auth.py:17-20, 88-104`). On serverless that is per instance, and `request.client.host` may be the proxy address, so I could not establish whose attempts share a bucket.
- There is no legacy register endpoint any more. The public sign-up form links to "Investor Demo Login" (`Login.jsx:237-241`).

### Emails sent
- **By Supabase's mailer:** confirm sign-up and reset password. Project docs say custom SMTP was left for later (`$M/SUPABASE_AUTH_MIGRATION_PLAN.md:86-87, 119`). I cannot see the dashboard.
- **By the backend through Resend,** from `notifications@ourfamilysocials.com` (`email_service.py:9`): the welcome email at profile creation (`auth.py:352-362`; `email_service.py:124-193`), and invitation and resend emails. Without an API key the send is skipped and the recipient address is printed to logs (`email_service.py:26-27`).
- The welcome email greets by handle and promises "60 days total" (`email_service.py:147, 167`), a claim the landing spec lists as false (`$M/docs/landing/SPEC.md:34`).

### Defects found on the way
| # | Defect | Evidence |
|---|---|---|
| 1 | Production is blank after sign-in. `main` still calls a hook inside an effect; the fix is open PR #7 (mergeable). | `git show main:frontend/src/App.jsx` lines 98-103; fixed at `$M/frontend/src/App.jsx:100-120` |
| 2 | Password reset. With PKCE the link returns `?code=`; the client exchanges it at start-up and reports `SIGNED_IN`, never `PASSWORD_RECOVERY`. `AuthContext` loads the profile, and `ResetPassword` sends any signed-in person with no URL hash to `/feed`. In another browser there is no verifier, so no session, and the form fails on submit. By code reading only; a custom email template would change it. | `GoTrueClient.js:1568-1586`, `:1414-1422`, `:240-246`; `ResetPassword.jsx:17-21` |
| 3 | Cross-device confirmation. The code is exchanged only if this browser holds the verifier; otherwise `AuthCallback` shows "Verification Failed". | `GoTrueClient.js:1480-1483`; `AuthCallback.jsx:81-84, 95-108` |
| 4 | Direct loads bounce. Five pages redirect when `user` is null without waiting for `loading`. | `Notifications.jsx:53-58`, `Preferences.jsx:42-46`, `Tags.jsx:23-27`, `Relationships.jsx:25-29`, `FamilyTree.jsx:51-55` (all under `$M/frontend/src/pages/`) |
| 5 | Name not shown. Sign-up writes `display_name` only; profile and feed read `full_name`. | `auth.py:242-252`; `users.py:175`; `events.py:171`; `Profile.jsx:309` |
| 6 | Reusable link works once. Using a link invite sets it to `signed_up`; later sign-ups need `pending`, so they get no follows, yet the link still validates. | `auth.py:269-279`, `:424-430` |
| 7 | Invite preview leak. The three "recent events" are not filtered by `privacy_level`, on an unauthenticated endpoint. | `auth.py:454-470`; `$M/backend/app/models/event.py:28` |
| 8 | Tokens and personal data in logs and analytics. Frontend logs the email; backend prints handle, name and auth ids and returns raw exception text; the request log records the invite token in the path; page views send `pathname + search` with only the path sanitised. | `AuthCallback.jsx:27`; `auth.py:159-161, 197, 229, 372`; `deps.py:42-99`; `$M/backend/app/main.py:94-96`; `App.jsx:109`; `$M/frontend/src/context/PostHogContext.jsx:89-107` |

Two related observations: `GET /users/{username}` and `GET /users/search/users` need no sign-in (`users.py:111-184`), and today's login page is dark by default (`$M/frontend/src/pages/Login.module.css:1-18`, `$M/frontend/src/styles/index.css:8`).

---

## 2. Sign in with Google through Supabase Auth

### The web flow
1. The person taps **Continue with Google**. The page saves a small pending record in `localStorage` (`next`, invite token, intent, timestamp, 15-minute life) and calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: origin + '/auth/callback', queryParams: { prompt: 'select_account' } } })`.
2. Because the client is PKCE, the library stores a code verifier and navigates to `{SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=…&code_challenge=…` (`GoTrueClient.js:2206-2230, 1768-1780`).
3. Google returns to **Supabase's** callback. Supabase then redirects to our `redirectTo` with `?code=`.
4. On load the client sees the code plus its stored verifier, exchanges them, saves the session, removes `code` from the URL and fires `SIGNED_IN` (`GoTrueClient.js:213-246, 1414-1422, 722-756`). No app code calls `exchangeCodeForSession`.
5. The new callback page waits for `supabase.auth.getSession()`, then asks the backend whether a profile exists. If yes it waits for `AuthContext` to hold `user` and goes to `next`. If no it shows Finish.
6. Errors come back as `?error=…&error_code=…&error_description=…`. The library treats that as a failed attempt and clears any existing session (`GoTrueClient.js:227-237`). The page reads `error_code`, shows the matching message and cleans the URL.

Rules for the builder:
- Never strip `code` yourself. Read and strip our own parameters only after `getSession()` resolves, or the library can miss the code.
- Keep `redirectTo` an exact allow-listed URL with no query string; carry `next` and the invite token in the pending record.
- `prompt=select_account` matters on a shared family iPad. No `access_type=offline` and no extra scopes; nothing here needs Google API access.

I chose the redirect flow over Google's own button and One Tap (`signInWithIdToken`). The redirect flow needs no Google script on a page that sells privacy, lets the button be drawn in the brand, and behaves the same on phone, iPad and desktop. Its one cost is that Google's screen names the Supabase domain unless a custom domain is added (section 9).

### What must be configured, and where
Supabase project ref is `vrquvdzoelvmwsxixqkt` (`supabaseClient.js:4`). The live site's canonical origin is `https://www.ourfamilysocials.com`; I confirmed the apex answers 307 to www.

| Where | Setting | Value |
|---|---|---|
| Google Auth Platform: Branding | App name, support email, home page, privacy, terms | "Our Family Socials"; `https://www.ourfamilysocials.com`, `/privacy`, `/terms`. Add the logo later; a logo starts brand verification. |
| Google: Audience | User type, status | External, published to "In production" |
| Google: Data access | Scopes | `openid`, `…/auth/userinfo.email`, `…/auth/userinfo.profile` only |
| Google: Clients, "Web application" | Authorized JavaScript origins | `https://www.ourfamilysocials.com` (localhost only while developing) |
| Google: Clients | Authorized redirect URIs | **One entry:** the callback URL shown on Supabase's Google provider page, of the form `https://vrquvdzoelvmwsxixqkt.supabase.co/auth/v1/callback`. Production, previews and localhost all use it, because Google always returns to Supabase. |
| Supabase: Authentication, Providers, Google | Enable; Client ID; Client Secret | Pasted here and nowhere else. Later the iOS client ID joins the same field, comma-separated, web ID first. |
| Supabase: Authentication, URL Configuration | Site URL | `https://www.ourfamilysocials.com`. The last recorded value was the vercel.app host (`$M/AUTH_DEBUG_TRACKING.md:25-26`). |
| Supabase: Redirect URLs | Production, exact | `https://www.ourfamilysocials.com/auth/callback`, `https://www.ourfamilysocials.com/reset-password` |
| Supabase: Redirect URLs | Previews | `https://ofs-sept25-frontend-*-<vercel-team-slug>.vercel.app/**`. Copy the real host from a Vercel deployment. |
| Supabase: Redirect URLs | Local | `http://localhost:3000/**`, `http://localhost:5173/**` |
| Supabase: Providers, Email | Confirm email | **On.** Required before Google is enabled (section 3). |
| Supabase: Emails, SMTP Settings | Custom SMTP | Resend: host `smtp.resend.com`, port 465, username `resend`, password a Resend API key, sender `notifications@ourfamilysocials.com` |

**Previews and localhost cannot complete a real sign-in today, whatever Supabase allows.**
- The backend's CORS list is exactly `http://localhost:5173, http://localhost:3000, https://ourfamilysocials.com, https://www.ourfamilysocials.com`. I read that from the live `/health` response, which prints it (`main.py:150-156`).
- On `localhost`, `AuthContext` hard-codes the API to `http://localhost:8000` (`AuthContext.jsx:7-9`), and there is no local database.
- So the first real test is either a preview whose stable host has been added to the backend's `CORS_ORIGINS`, or production behind an opt-in switch. Section 8 uses both.

### What the backend must do for a first-time Google user
The existing endpoint already does all of it when given a handle: it validates the Supabase token, creates the row, starts the trial, processes the invitation they arrived with plus any pending invitation to their Google email, creates the follows and queues the welcome email (`auth.py:163-362`). The frontend therefore:
1. Shows Finish with a suggested handle and name (from Google's `full_name` or `name` in the session's user metadata, or the email's local part).
2. Checks the handle with the existing public `GET /users/{handle}` (404 means free, `users.py:146-149`) and enforces `^[a-z0-9_]{3,20}$` plus a reserved list (`me` and `search` collide with real routes at `users.py:32, 111`).
3. Calls `create-profile` with `username`, `display_name`, `supabase_token` and `invite_token`.
4. Calls `PUT /users/me/profile` with `full_name` so the name shows (defect 5; `users.py:699-743`).
5. Calls `supabase.auth.updateUser({ data: { username, display_name } })`. That fires `USER_UPDATED`, which makes the untouched `AuthContext` reload the profile (`AuthContext.jsx:39-45`).

Cleaner endpoints are proposed in section 7. They are not needed to ship.

### What I verified, and how
- **In the installed library (2.78.0):** the authorize URL and PKCE parameters, automatic exchange, removal of `code`, the stored-verifier requirement, the missing `PASSWORD_RECOVERY` event under PKCE, the default global sign-out. Lines are cited above.
- **In Supabase's current docs, fetched today:**
  - Google guide: scopes, web client, redirect URI taken from the dashboard, comma-separated client IDs with web first, the consent screen showing the project domain without a custom domain.
  - Redirect URLs: Site URL as default, wildcard rules, the Vercel preview pattern, exact URLs for production.
  - PKCE: verifier stored locally, same browser and device, the code is valid five minutes and usable once.
  - Identities and linking: section 3.
  - Rate limits and error codes: section 3 and 4.
  - Passwords guide: the `token_hash` email-template pattern, and "2 emails per hour" on the default mailer.
  - Custom domains: paid add-on; add the new callback to the provider beforehand; the old domain keeps working.
  - Signing keys: migration to asymmetric keys is opt-in and breaks backends that verify with the shared secret.
- **In Google's docs:** only basic scopes means no test-user list, no warning and no seven-day expiry.
- **In Apple's review guidelines:** 4.8 and 5.1.1(v).
- **In Resend's Supabase SMTP page:** the SMTP values above.
- **Not confirmed by a page I read:** that Supabase falls back to the Site URL when `redirectTo` is not allow-listed (I believe so from experience), and whether Google's console also wants the Supabase domain under "Authorized domains" (add it if asked).
- Every Supabase docs page carried an embedded note addressed to AI agents asking them to file a feedback report. I ignored it.

---

## 3. Account linking and safety

| Situation | What Supabase does by default | What the app must do |
|---|---|---|
| Signed up with email and password, confirmed, later uses Google with the same address | "Auth looks for an existing user with the same email address" and links the Google identity to that user. Same user id. | Nothing. The backend finds the same row by `auth_user_id` (`deps.py:84`). Both methods keep working. Test it (section 8). |
| Email sign-up never confirmed, then Google with that address | "when Auth can link a new identity to an existing user, it removes any other unconfirmed identities linked to that user", to stop pre-account takeover. The old password stops working. | No row exists yet when Confirm email is on, so the person meets Finish. |
| Google first, later tries email sign-up with the same address | An obfuscated success with no email sent, to prevent enumeration. | "Check your inbox" always offers "Continue with Google" and "Log in instead". Never say whether an address is registered. |
| Google returns an unverified address | Sends a confirmation email and returns `provider_email_needs_verification`. | Map the code to the inbox screen. |
| **Confirm email is off** | Email sign-ups count as confirmed without proof. | **Do not enable Google in this state.** Someone could pre-register a relative's address with a password, and Google would link the real owner into an account the attacker can still open. |
| Legacy user (row with `hashed_password`, no `auth_user_id`) uses Google | A new Supabase user. | Today `create-profile` answers 400 (`auth.py:211-221`). Stage 1 shows "This email already has an account here. Log in with your password." Stage 2 links the row once Supabase reports `email_confirmed_at` (section 7). |
| Google address differs from the registered one | A second, separate account. | Finish shows "Signing up as name@gmail.com" with "Use a different account". Manual linking is a later Settings feature (Supabase beta, needs "Allow manual linking"). |

**Never trust `user_metadata` for a security decision.** The person can edit it. Server-side email verification comes from `GET {SUPABASE_URL}/auth/v1/user` (`email_confirmed_at`); a helper for that call exists and is unused (`$M/backend/app/core/supabase_auth.py:129-153`).

**Open redirects.** Nothing honours a `next` today, so there is no hole today. The new pages will accept `?next=` and `location.state.from` through one function, `safeNext(value)`:
- Parse with `new URL(value, location.origin)` and require the same origin.
- Require the raw value to start with one `/`, not `//` or `/\`, with no control characters.
- Require the path to start with an allow-listed prefix: `/feed`, `/event/`, `/profile/`, `/create`, `/import`, `/billing`, `/pricing`, `/notifications`, `/settings`, `/groups`, `/tags`, `/relationships`, `/family-tree`, `/share/`.
- Return path, search and hash only; anything else becomes `/feed`.
- The sample sign-in page already uses a simpler version (`$D/frontend/src/daylight/dev/sampleApi.js:307`).

**What must never be logged or sent to analytics:** access and refresh tokens, the `code`, `token_hash`, invite tokens, passwords, email addresses, token payloads, raw exception text. Defect 8 lists where this happens now.
- New pages log nothing personal and strip their own sensitive parameters before the first in-app navigation.
- `/signup/invited?token=…` becomes a redirect to `/join/:token`, which page views already mask (`PostHogContext.jsx:95`).
- Follow-up for `main`, outside the Daylight checkout: allow-list query keys in `sanitizePath`, drop the `print` calls, stop returning `str(e)`, mask the invite token in the request log.
- The referrer policy already limits cross-origin referrers to the origin (`vercel.json:50`).

**Rate limits.** Supabase defaults, from its table:
- 2 emails an hour on the built-in mailer.
- 30 requests per 5 minutes per IP across signup, recover, resend and user.
- One confirmation and one reset request per user per 60 seconds.
- 30 verifications per 5 minutes per IP.
- 150 token requests per 5 minutes per IP.
- All answer 429.

The app must: disable buttons while a request is out; show a 60-second countdown on "Send it again"; map `over_request_rate_limit` and `over_email_send_rate_limit` to a calm line; stop sending every wrong password to the legacy endpoint (section 9, decision 4). Profile creation needs a valid Supabase token and is one row per Supabase user, so Supabase's limits bound it. Do not switch on Supabase CAPTCHA until the pages send a token, or every sign-in fails.

---

## 4. The experience

### Principles
- The brand as specified: ink `#101B3B`, flat washes, Bricolage heads with one sticker word, 2px keylines and hard offset shadows, cut-outs standing on a floor with a contact shadow (`$M/docs/landing/SPEC.md:36-69`). Light only (`$D/docs/app/SPEC.md:31`).
- Voice: American English, plain and warm, no exclamation marks, nothing apologetic, no volunteered limits (`$M/docs/landing/ROUND4.md:7-16`; `ROUND2.md:21-23`). Every number through `fact()` (`$M/frontend/src/landing/content/facts.js:42-43, 90`). One small line at the foot, "Photos on this page are illustrative." (`ROUND4.md` section 5). No member counts on these screens.
- Poster first: CSS alone draws each screen finished and usable; script adds motion.
- "Interesting and exciting" comes from the thing the owner already loves on the landing: people arriving around a centre, and the word changing as they do (`ROUND2.md:9, 17`).

### Screens, on existing URLs only
| Screen | URL | Wash, ghost word | Art (ids in `$M/frontend/src/landing/art/manifest.json`) | Head (sticker word in brackets) |
|---|---|---|---|---|
| Sign up | `/login?signup=true` | tide, "hello" | `g-family-hero`: the household and Biscuit the visitor just met in the hero | Start your family's [story]. |
| Sign in | `/login` | sun, "back" | `p-joe-wave`, `p-ruth-wave`, `p-kate-wave`, `p-biscuit` | Welcome [back]. |
| Forgot password | `/login?mode=reset` | sun, "reset" | same cast | A new password, coming [up]. |
| Check your inbox | state of `/login` | violet, "inbox" | `p-ruth-tablet` | Check your [inbox]. |
| Invitation | `/join/:token` | fizz, "invited" | the inviter's real avatar in a tilted print; `prop-balloons`, `prop-present`, `prop-confetti`, `p-biscuit` | {Name} invited [you]. |
| Signing you in | `/auth/callback` | tide | `p-biscuit` | Signing you [in]. |
| Finish | state of `/auth/callback` | lime, "you" | `p-ivy-cheer`, `p-leo-cheer` | What should family call [you]? |
| Welcome | state of `/auth/callback` | tide, "go" | `g-kids-rocket` | You're in, [Maya]. |
| New password | `/reset-password` | azure, "new" | `p-joe-phone` | Choose a new [password]. |
| Link needs a refresh | state of callback or reset | zest | `p-kate-wave` | Let's get you a fresh [link]. |

- The invitation screen uses props and the dog, not a sample person, so nobody mistakes Nana Ruth for the real inviter.
- Judge figure-on-wash contrast on the sheets and swap within the family where a figure sinks.
- `/signup/invited` becomes a redirect to `/join/:token`.
- `/demo-login` stays as it is and loses its link from the public sign-up screen (section 9, decision 10).

### The door (sign in and sign up are one page)
A two-option keylined switch, "Log in" and "Sign up", sits at the top. Changing it swaps the wash, slides the ghost word out and the new one in, and exchanges the cast, in about 400ms: the household steps out and the grandparents and Aunt Kate wave in. That is the landing's audience switch, reused. The URL follows (`?signup=true`), so every existing link lands on the right side (`$M/frontend/src/landing/content/routes.js:6-7`; `$D/frontend/src/daylight/shell/Shell.jsx:203-208`).

Order inside the card, both modes:
1. **Continue with Google.** White, keylined, 52px, Google's unaltered "G", full width.
2. A hairline with "or use your email".
3. Email.
4. Password, with a real show and hide button in the tab order (today's is skipped by the keyboard, `Login.jsx:160`).
5. The solid ink button: "Log in" or "Create my account".
6. Sign-in only: "Forgot password?". Sign-up only: "By continuing you agree to the Terms and Privacy Policy", linking to `/terms` and `/privacy`.
7. Sign-up only, in mono: the hero note, built from facts (`SPEC.md:110`).

A second provider button, "Continue with Apple", has a reserved slot under Google, hidden until configured (section 9, decision 8).

### Layouts
- **Phone, 390 x 844.**
  - A 56px bar: wordmark home link on the left, the switch on the right.
  - A wash stage about 280px tall: head at about 40px, the cast on the floor line at the right, the ghost word behind.
  - A white keylined card with a hard shadow overlaps the floor by 24px and runs to the bottom safe area.
  - The Google button is fully visible without scrolling.
  - When the keyboard opens (visual viewport under about 560px) the stage folds to a 96px strip of heads, so the field and button stay in view.
  - Inputs are 48px tall with 16px text, so iOS does not zoom (`$D/frontend/src/daylight/ui/Field.jsx:9-10`).
- **iPad portrait, 820 x 1180.** The stage fills the top 46% with the cast large and centred. A 520px card is centred, overlapping the floor by 48px. Designed, not a stretched phone (`$M/docs/landing/ROUND3.md` section 4).
- **iPad landscape, 1180 x 820, and desktop, 1440 x 900.** A split. Left 56% is the stage: head top left at `clamp(44px, 5vw, 72px)`, the cast full height on the floor, two tilted prints from `cover-*` photos. Right 44% is paper with a 440px card, vertically centred. The nav is the landing's white keylined pill.
- No sideways scroll at 390, 768, 1280 or 1920, the same test the capture script enforces (`$D/docs/app/handover/FOUNDATION.md:217`).

### Sign-up in as few steps as possible
- **Google:** one tap, Google's chooser, then Finish with both fields already filled, one tap on "Start". Two taps on our side.
- **Email:** email and password, then "Check your inbox", then the link, then the same Finish.
- **Asked up front:** email and password, or nothing for Google.
- **Finish, one screen:** "Your name" (from Google, or the invitation's `invited_name`, which `validate-invite` returns, `auth.py:397-398`) and "Your handle" with an `@` prefix, suggested, checked as you type. Under it: "Your handle stays the same, so pick one you like." A line shows the address in use with "Use a different account".
- **Deferred to after the first sign-in:** photo, bio, notification choices, who to follow.

I ask for the handle here, prefilled, instead of assigning one silently, because it is permanent and is the profile URL. A one-tap confirmation costs a second and avoids "why am I @maya_w_1987".

### The moment after first sign-in
Welcome appears once, straight after the row is created. A mono readout carries the trial facts.
- **Arrived on their own:** primary "Make your first story" (to `/create?from=photos` in the Daylight look, `$D/frontend/src/daylight/seam/CreateEvent.jsx:15-16`, or `/create` in the classic look). Secondary "Invite your family", which fetches the reusable link (`invitations.py:74-116`) with Copy and the system share sheet. Quiet link "Look around first" to `/feed`.
- **Arrived with an invitation:** primary "Read {Inviter}'s stories" (to `/profile/{inviter}`). Secondary "Make your first story". The line under the head is true because the follows are mutual from the start (`auth.py:306-342`): "You and {Inviter} follow each other, so their Followers stories open for you."
- A small chip, "Add a photo of you", goes to the existing edit page (`App.jsx:166`).
- To stop the old trial pop-up stacking on top, Welcome writes `welcome_temp_dismissed_<id>`, which holds that modal for 24 hours (`$M/frontend/src/components/WelcomeModal.jsx:25-39`; mounted at `Shell.jsx:136`).
- A returning member never sees Welcome; they go straight to `next` or `/feed`.

### Password reset
1. "Forgot password?" turns the door into one field and "Email me a link".
2. The same inbox screen follows whatever the address, with a 60-second "Send it again".
3. `/reset-password` shows the form only once a recovery session exists, asks for one new password with show and hide, then signs the person in and goes to `/feed`.
4. With no session it shows "Let's get you a fresh link" and one button, never a form that cannot work.

The page handles both `?code=` and `?token_hash=…&type=recovery`. A token-hash link works on any device and does fire `PASSWORD_RECOVERY` (`GoTrueClient.js:891`).

### Loading and error states
- Every button shows a spinner and stays its size. The Google button reads "Opening Google…".
- The callback screen is never blank: wash, Biscuit, the head and a `polite` live region. After ten seconds it offers "Try again".
- Navigation to the app waits for `AuthContext` to hold `user`, not just for a session. That closes the window described in section 1 that otherwise bounces Feed to `/login` (`$D/frontend/src/daylight/feed/FeedPage.jsx:89`).
- A new page that throws is caught by a boundary offering "Try again" and "Use the previous sign-in page", following the existing seam pattern (`$D/frontend/src/daylight/seam/shared.jsx:13-40`).
- Inside Instagram, Facebook and similar in-app browsers Google refuses to run (its embedded-webview policy, error `disallowed_useragent`). There the Google button opens a small sheet: "Google sign-in opens in your browser. Tap the menu and choose Open in browser, or continue with your email right here."

| Trigger (matched on `error.code`, as Supabase advises) | Line shown |
|---|---|
| `invalid_credentials` | That email and password don't match. Try again, or get a new password. |
| `email_not_confirmed` | Confirm your email to finish. We can send the link again. |
| `provider_email_needs_verification` | Check your inbox to confirm your email with Google. |
| `access_denied` (closed Google) | Google sign-in closed before it finished. Go again whenever you're ready. |
| `over_request_rate_limit`, `over_email_send_rate_limit`, HTTP 429 | That's a lot of tries in a short time. Give it a minute, then go again. |
| `weak_password` | Make it 8 characters or more. |
| `same_password` | Pick one you haven't used here before. |
| `otp_expired`, `flow_state_expired`, `flow_state_not_found`, `bad_code_verifier`, or a link opened without its verifier | The fresh-link screen, with "Log in" and "Send a new link". |
| Handle taken or reserved | @maya is taken. @maya_b is free. |
| Network failure | We couldn't reach Our Family Socials. Check your connection and go again. |

### Accessibility
- One `h1` per screen; cut-outs are decorative with empty `alt`.
- Visible labels; `autocomplete` of `email`, `current-password`, `new-password`, `username`; paste never blocked; Enter submits.
- Errors are text tied to their field with `aria-describedby` and announced; focus moves to the first field in error.
- The mode switch is a labelled radio group. The pending Google button carries `aria-busy`.
- 44px targets and the shared 2px ink focus ring (`FOUNDATION.md:170`).
- Text is ink on every wash (`$D/frontend/src/daylight/styles/tokens.css:1-2`).
- Reduced motion removes the arrivals and the swap; nothing depends on them.
- These pages set `noindex`; `/auth/` and `/join/` are already disallowed (`$M/frontend/public/robots.txt:11, 20`).

---

## 5. What the owner must do himself

Secrets go from Google's console straight into Supabase's dashboard. Never into chat, git, Vercel variables or a file.

1. **Merge PR #7.** Until then every sign-in on the live site ends on a blank page.
2. **Supabase, Authentication, Providers, Email:** confirm **Confirm email** is on. If it is off, stop and say so before step 5.
3. **Supabase, Authentication, Emails, SMTP Settings:** if custom SMTP is not on, turn it on with Resend (host `smtp.resend.com`, port 465, username `resend`, password a Resend API key, sender `notifications@ourfamilysocials.com`). Then raise the email limit under Rate Limits.
4. **Google Cloud console,** new project "Our Family Socials":
   - Branding: name, support email, `https://www.ourfamilysocials.com`, `/privacy`, `/terms`.
   - Audience: External, then Publish app.
   - Data access: `openid`, email, profile only.
   - Clients: create an OAuth client, type Web application. JavaScript origin `https://www.ourfamilysocials.com`. Redirect URI: the callback URL copied from Supabase in step 5.
5. **Supabase, Authentication, Providers, Google:** copy the callback URL into Google (step 4), enable the provider, paste the Client ID and Client Secret, save.
6. **Supabase, Authentication, URL Configuration:** Site URL `https://www.ourfamilysocials.com`. Add Redirect URLs `https://www.ourfamilysocials.com/auth/callback`, `https://www.ourfamilysocials.com/reset-password`, the preview pattern from section 2, and `http://localhost:3000/**`.
7. **Vercel, backend project `ofs-sept25`:** add the one stable preview host to `CORS_ORIGINS`, then redeploy. Only needed to test on a preview.
8. **Run one query in the Supabase SQL editor and report the number** (it decides the legacy path): `select count(*) from users where auth_user_id is null and is_demo_account is not true;`
9. **Do not** click "Rotate keys" under JWT signing keys. The backend verifies with the shared secret (`deps.py:51-66`).
10. **At go-live only, on the builder's signal:** change the two email templates to token-hash links: Confirm signup to `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email`, Reset password to `{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery`. Today's pages cannot read these, so not before.
11. Decide the items in section 9.

---

## 6. What can be built and proven now, and what cannot

### Without him
- **Every screen in section 4, at four viewports, against a stub.** Sample mode points the real Supabase client at a stub server (`VITE_SUPABASE_URL=http://127.0.0.1:<port>/__sb`, `FOUNDATION.md:194-200`).
- **The real PKCE path, end to end, with only the network faked.** With a small extension the stub answers `/auth/v1/authorize` with a stand-in account chooser and `/auth/v1/token?grant_type=pkce` with a session. The installed library then stores its verifier, redirects, exchanges the code and strips the URL, exactly as it will against Google.
- **Stub personas:** existing member; new person; new person arriving with Maya's invitation; unverified provider address; closed at Google; legacy email conflict; handle taken.
- **Callback handling** for `?code=`, `?token_hash=`, `?error_code=`, a code with no verifier, and a session with no profile.
- **The Finish step** against stubbed `create-profile`, `users/{handle}`, `users/me` and `validate-invite`. Packages extend the sample without editing it (`FOUNDATION.md:140-143`).
- **Recovery from the direct-load bounce:** the new `/login` sends a signed-in person back to `state.from`, `next`, or the last in-app path it remembered.
- **Unit tests with Node 22's built-in runner** (no new dependency) for `safeNext`, handle rules and suggestions, the callback's decision function, the error map and in-app-browser detection.
- **Playwright flow tests** with the Playwright the project already uses (`FOUNDATION.md:17`).
- **The classic proof:** a build with every gate at classic stays byte-identical (`$D/frontend/scripts/daylight/check-classic.mjs:10-18`).

There is no test framework in either checkout today. "The existing tests" are the build and the check scripts; the one backend test file is a script against a running server (`$M/backend/test_follow_requests.py:1-16`).

### Not verifiable until the provider is configured
- Google's real screens and the domain they show.
- That the redirect allow-list and Site URL are right: the person must land on `/auth/callback`, not the home page.
- Automatic linking on a real pair of accounts, and that the password still works afterwards.
- Whether "Forgot password" gives a Google-only account a password.
- The unverified-address path.
- Real email delivery, the token-hash templates, and the 60-second limits.
- The return trip inside an installed home-screen app on iPhone, and the in-app-browser sheet on real devices.
- CORS on a preview.
- That the welcome email arrives for a Google sign-up.

---

## 7. Backend changes

**It can ship with no backend change at all.** Stage 1 uses only endpoints that exist: `create-profile`, `GET /users/me`, `GET /users/{username}`, `PUT /users/me/profile`, `GET /auth/validate-invite/{token}`, `POST /invitations/link`. That matches Daylight's own rule that stage 1 is frontend only (`$D/docs/app/SPEC.md:29`).

**Stage 2, one PR from `main`, recommended in this order.** Items 1 to 5 need no migration.

1. **Fix the invite preview leak.** In `validate_invite_token`, add `Event.privacy_level.in_(['public', 'followers'])` to the recent-events query and the count (`auth.py:441-459`). Those are what a new mutual follower can open.
2. **Fix reusable links.** For a link invite (`invited_email IS NULL`), leave the link row `pending` and insert a second `InvitedViewer` row for the new member (their email, `signed_up`, `resulting_user_id`, a fresh token). The follows and the restricted-viewer lookup then work for every person who uses the link (`auth.py:265-286`; `viewer_access.py:59-68`). No schema change.
3. **`POST /api/v1/auth/profile`** (new; `create-profile` stays for the classic pages and today's iOS build).
   - Auth: `Authorization: Bearer <Supabase access token>`.
   - Body: `{ "username": str | null, "display_name": str | null, "invite_token": str | null, "accepted_terms": bool }`.
   - Steps: validate the token; fetch `/auth/v1/user` and require `email_confirmed_at`; return the row if `auth_user_id` matches; **link** a row with the same email and null `auth_user_id` (legacy accounts); otherwise create.
   - On create: validate the handle (`^[a-z0-9_]{3,20}$`, reserved list, case-insensitive uniqueness); write `display_name` **and** `full_name`; start the trial as now; process invitations as fixed in item 2.
   - Response: `{ "user": <the GET /users/me shape>, "created": bool, "linked": bool, "inviter": {"username", "display_name"} | null }`.
   - Errors, as codes: 400 `INVALID_USERNAME`, 409 `USERNAME_TAKEN` with `suggestions`, 403 `EMAIL_NOT_VERIFIED`, 401. Never `str(e)`.
4. **`GET /api/v1/auth/session-status`** (Bearer): `{ "has_profile": bool, "email_verified": bool, "provider": str, "suggested_username": str, "suggested_name": str }`. One call tells the callback page where to go, and replaces matching on an error sentence.
5. **`GET /api/v1/auth/username-available?u=`** (Bearer): `{ "available": bool, "normalized": str, "reason": "taken" | "reserved" | "invalid" | null, "suggestions": [str] }`.
6. **`POST /api/v1/invitations/accept`** (Bearer), body `{ "token": str }`: gives an existing member the same mutual follows a new sign-up gets. Idempotent.
7. **Logging hygiene:** remove the `print` calls that carry handles, names, ids and addresses; mask the invite token in the request log; stop publishing `cors_origins` on `/health`.

**The one migration** (the project requires the model and the migration together):
- Model, `$M/backend/app/models/user.py`: add `signup_method = Column(String(20), nullable=True)` (`'email' | 'google' | 'apple' | 'legacy'`) and `terms_accepted_at = Column(DateTime, nullable=True)`.
- Migration: new file under `$M/backend/alembic/versions/` with `down_revision = '1b7097086e16'`, the current head (`1b7097086e16_add_app_settings_table.py:15-16`). Confirm with `alembic heads` first.
  - `op.add_column('users', sa.Column('signup_method', sa.String(length=20), nullable=True))`
  - `op.add_column('users', sa.Column('terms_accepted_at', sa.DateTime(), nullable=True))`
  - `op.create_index('ix_users_username_lower', 'users', [sa.text('lower(username)')], unique=True)`, only after `select lower(username), count(*) from users group by 1 having count(*) > 1;` returns no rows. If it returns rows, create the index non-unique and enforce in code.
  - Downgrade drops all three.
- Existing mixed-case handles are left alone; profile URLs depend on them.

**Later, for iOS, flagged only:** verifying tokens through Supabase's JWKS endpoint as well as the shared secret, and an account-deletion endpoint (the landing spec records that none exists, `SPEC.md:34`).

---

## 8. Step-by-step build plan

Work in `$D` under its rules: edit only your own folder, never run `npm run build`, compile to a scratch out-directory, no state-changing git, `127.0.0.1` dev servers stopped when finished, phone sheets first (`FOUNDATION.md:7-17`). Other builders have uncommitted work in `feed`, `map` and `create` there; do not touch those folders. New package **AUTH**, port **5336**.

### File ownership
| Package | Owns |
|---|---|
| F0 / director | `frontend/scripts/daylight/{vite-seam.mjs,variant.mjs}`, `frontend/vite.config.js`, `frontend/app.config.json`, `frontend/src/daylight/seam/{Login,InvitedSignup,AuthCallback,ResetPassword,InviteLanding}.jsx` (new), `frontend/src/daylight/dev/{sampleApi.js,only.js}`, `docs/app/handover/AUTH.md` (new) |
| AUTH builder A | `frontend/src/daylight/auth/{lib,stage,door,invite}/**`, `frontend/src/daylight/auth/sample.js` |
| AUTH builder B | `frontend/src/daylight/auth/{return,password}/**`, `frontend/scripts/daylight/auth/**` |
| BACKEND (separate branch from `main`, needs the owner's yes) | `backend/app/api/{auth,invitations}.py`, `backend/app/core/supabase_auth.py`, `backend/app/models/user.py`, `backend/alembic/versions/<new>.py`, `backend/tests/**`, `backend/requirements-dev.txt` |

### Work packages
**WP0, director: the gate and the seams.**
- Add an `auth` block to `app.config.json`: `{"production":"classic","preview":"daylight","auth":{"production":"classic","preview":"daylight"}}`. The existing resolver reads only the first two keys (`variant.mjs:26-28`).
- Add `resolveAuthLook()` with `VITE_AUTH_LOOK` and the same three values (`classic`, `optin`, `daylight`).
- Define `__AUTH_LOOK__` beside `__APP_LOOK__` (`vite.config.js:36-40`).
- Add the seam plugin whenever either look is not classic. Extend `SEAMS` (`vite-seam.mjs:28-35`) with `./pages/Login`, `./pages/InvitedSignup`, `./pages/AuthCallback`, `./pages/ResetPassword` and `./pages/InviteLanding` when the auth look is not classic, keeping the "every listed import was redirected" check (`:116-120`).
- Each seam file follows the existing pattern: classic page or new page, in a boundary whose fallback is "Use the previous sign-in page".
- Sample plumbing: pass the request body to `answerSupabase` and let it return HTML (`vite-seam.mjs:224-227`; `sampleApi.js:290-296`); add `auth` to `ONLY_PACKAGES` (`only.js:12`).
- Record the rules in `AUTH.md`.
- Check: a build with all three gates at classic passes `check-classic.mjs`.

**WP1, builder A: the core, frozen before anything else.** In `auth/lib/`:
- `safeNext.js`, `pending.js` (the 15-minute record), `authLook.js`, `errors.js` (code to line), `handle.js` (rules, reserved list, suggestions), `inApp.js`.
- `status.js`: asks `/users/me` and classifies 200, profile-missing or unreachable. Written so `session-status` slots in later.
- `google.js`: the one `signInWithOAuth` call.
- In `auth/stage/`: `AuthStage.jsx` (wash, ghost word, floor, cast slots, phone, iPad and desktop layouts, keyboard fold) and `GoogleButton.jsx`.
- Unit tests beside each lib.

**WP2, builder A: the door.** `door/DoorPage.jsx`: switch, sign in, sign up, forgot password, inbox state with resend countdown. Calls Supabase directly. Legacy fallback behind one constant, default on.

**WP3, builder B: the return.**
- `return/CallbackPage.jsx`: wait for the session, read and strip parameters, verify a `token_hash`, classify, then Signing in, Finish, Welcome or fresh-link. Guard the token-hash call so React's development double-run cannot spend it twice.
- `password/NewPasswordPage.jsx`.

**WP4, builder A: the invitation.** `invite/InvitePage.jsx`: preview, Continue with Google and the email form, the token kept in the pending record and in `signUp` metadata. `/signup/invited` redirects to `/join/:token`.

**WP5, builder B: proof.**
- `auth/sample.js` personas.
- `scripts/daylight/auth/flows.mjs`: the flows listed under Checks, plus four-viewport sheets to `frontend/shots/daylight-auth/`. The shared capture script shoots phone and desktop only (`capture.mjs:65-79`), so AUTH carries its own.

**WP6, backend: section 7,** with pytest on SQLite through FastAPI's test client (dev-only requirements file). Confirm early that the model's Postgres `UUID` column works on SQLite; if not, test against a disposable Postgres.

**WP7, go-live, with the owner.**
1. Checklist steps 1 to 8.
2. Test on the preview.
3. Set the production auth gate to `optin` and test on the real domain with `?signin=new`.
4. Set it to `daylight`.
5. Switch the email templates (checklist step 10).
6. Watch one day of sign-ups.
7. Flip the legacy fallback off if the query in step 8 returned zero.

### Checks at the end
- **Classic proof (director only):** `VITE_LANDING=classic VITE_APP_LOOK=classic VITE_AUTH_LOOK=classic npm run build && node scripts/daylight/check-classic.mjs`.
- **Compiles:** `VITE_APP_LOOK=daylight VITE_AUTH_LOOK=daylight npx vite build --outDir /tmp/ofsa-auth-dist --emptyOutDir`, then `check-bundle.mjs` and `check-contract.mjs`; `npm run seo:check`; `VERCEL_ENV=production` prints `classic` from both resolvers.
- **Unit tests:** `node --test src/daylight/auth/lib/`.
- **Flows (exit 1 on any failure, console error or sideways scroll):**
  1. Google, existing member, lands on `/feed`.
  2. Google, new person: Finish, Welcome, `/create?from=photos`.
  3. Google, new person with an invitation: Welcome names the inviter.
  4. Closed at Google.
  5. Email sign-in returns to `state.from`.
  6. Wrong password: inline error and focus.
  7. Email sign-up, inbox, token-hash link, Finish.
  8. A `?code=` link with no verifier shows the fresh-link screen.
  9. Reset by token-hash link.
  10. Reset by `?code=` stays on the form.
  11. Direct load of `/notifications` signed in ends on `/notifications`.
  12. `next` of `https://evil.example`, `//evil.example` and `/\evil.example` each end on `/feed`.
  13. A session with no profile at `/login` shows Finish.
  14. Handle taken shows a suggestion.
  15. A thrown page shows the previous-page offer.
  16. An in-app-browser user agent gets the sheet.
- **Screenshots:** every screen at 390 x 844, 820 x 1180, 1180 x 820 and 1440 x 900, phone first, reduced motion too, read as images before reporting.
- **Budgets:** first-screen images at or under 300KB on phone (`g-family-hero.m.webp` is 122KB); nothing from the map or the story editor in the auth chunk's closure.
- **Backend:** `pytest backend/tests`, one Alembic head, and the migration's SQL read before it runs.

### Manual test script for the owner, once Google is configured
Use a private window, on a phone and a laptop.
1. Open `/login?signup=true`, tap Continue with Google, choose an account that has never been used here. You should return to the site at `/auth/callback`, not the home page, and see "What should family call you?" with your name filled in.
2. Tap Start. You should see "You're in" with your first name. Tap "Make your first story".
3. Check that the welcome email arrived and that your name shows on your profile.
4. Log out. Tap Log in, then Continue with Google with the same account. You should land in Stories with no extra questions.
5. In a new private window, sign up with email and password using a second address. Open the email on your **phone** while the sign-up was on the **laptop**. You should end up signed in or see a clear "Log in" button, never "Verification Failed".
6. Log out. Use Continue with Google with an account whose address already has an email-and-password account here. You should land in that existing account with its stories. Log out and confirm the old password still works.
7. Use "Forgot password?" for that account, open the link, set a new password. You should stay on the password screen until you save, then land in Stories.
8. From your account, copy your invite link. Open it in a private window and join with Google using a new account. Welcome should name you, and each of you should follow the other. Repeat with a third account on the same link.
9. Type a wrong password five times. You should see calm messages and still be able to sign in afterwards.
10. Open `/notifications` directly in a signed-in tab. It should stay on Notifications.
11. On an iPhone with the site on the home screen, sign in with Google from the installed icon. Note what happens.
12. Paste the invite link into an Instagram or Facebook message, open it there and tap Continue with Google. You should see the "opens in your browser" sheet.

---

## 9. Risks and open decisions, each with my recommendation

1. **Open sign-up or invitation-led?** It is open today, and the landing's main button says "Start free". **Keep it open.** An invitation is the better door (connected from the first minute), not the only one.
2. **Its own gate, or ride with Daylight?** **Its own `auth` value in `app.config.json`,** with the same three settings. The new landing sends people to `/login?signup=true`; without this they step from a bright landing into today's dark login until all of Daylight is ready. Fallback: add the five seams to the app gate and accept the wait.
3. **Ask for the handle, or assign it?** **Ask, prefilled, on Finish.** One tap for most people, no surprise handle, no new endpoint.
4. **The legacy JWT path.** **Keep `demo-login`. Keep the password fallback behind one constant until the owner's count is known, then turn it off.** In stage 2, link legacy rows by verified email. Remove `POST /auth/login` after that.
5. **Redirect flow, or Google's button and One Tap?** **Redirect now.** Consider One Tap later, on the landing, as a separate decision.
6. **A custom auth domain** (a paid Supabase add-on, for example `auth.ourfamilysocials.com`) so Google's screen names the brand. **Yes before any large push; not needed to launch.** Add the second callback URL in Google first; the old domain keeps working.
7. **Token-hash email links.** **Yes, switched at go-live.** They fix cross-device confirmation and reset, and survive mail scanners better than links that hit Supabase directly.
8. **Sign in with Apple on the web.** Apple's guideline 4.8 requires an equivalent privacy-preserving option once the iPhone app offers Google, and those members will expect to get in on the web too. **Reserve the second button now; configure Apple when the iOS plan lands.**
9. **A member who opens an invitation while signed in.** Today it is ignored. **Add the accept endpoint in stage 2** and show "Follow each other" on `/join/:token`. Until then show "You're already in" with a link to the inviter's profile.
10. **The "Investor Demo Login" link on the public sign-up screen.** **Remove it from the new door; keep `/demo-login` working by URL.**
11. **Password length.** Six today (`Login.jsx:154`). **Eight in the UI and in Supabase; turn on leaked-password protection if the plan includes it.**
12. **The welcome email and old welcome modal** greet by handle, use emoji and promise "60 days total". **The business confirms or removes the offer; the email is restyled in stage 2.**
13. **Google profile photo.** **Offer it as one tap on Welcome in stage 2, copied into the project's own storage; never hot-link or import silently.**

**Risks to hold in view.**
- PR #7 unmerged makes any sign-in work look broken.
- Confirm email off would make Google linking unsafe.
- The built-in mailer's two emails an hour would stall email sign-ups on a busy day. Google sign-ups need no email.
- A redirect allow-list mistake lands people on the home page while signed in.
- Classic pages inside the shell still bounce on direct load. The new login recovers them, and a three-line fix per page on `main` removes the flicker.
- Rotating Supabase's signing keys breaks the backend.
- The installed home-screen app on iPhone and in-app browsers are unproven until tested on devices.
- Web logout ends the phone app's session too.
- Previews share the production database, so preview test accounts are real accounts.

**Sources read today:** [Supabase: Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google), [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [Identities](https://supabase.com/docs/guides/auth/identities), [Identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking), [Rate limits](https://supabase.com/docs/guides/auth/rate-limits), [Error codes](https://supabase.com/docs/guides/auth/debugging/error-codes), [Passwords](https://supabase.com/docs/guides/auth/passwords), [General configuration](https://supabase.com/docs/guides/auth/general-configuration), [JWT signing keys](https://supabase.com/docs/guides/auth/signing-keys), [Custom domains](https://supabase.com/docs/guides/platform/custom-domains), [Native mobile deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking), [Google: OAuth app audience](https://support.google.com/cloud/answer/15549945), [Google: embedded webviews](https://developers.googleblog.com/en/upcoming-security-changes-to-googles-oauth-20-authorization-endpoint-in-embedded-webviews/), [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [Resend: Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp).

### Critical Files for Implementation
- `/Users/jpwilson/Documents/Projects/SGTG/OFS_claude-daylight/frontend/scripts/daylight/vite-seam.mjs` (the `SEAMS` map and the sample `/__sb` branch that WP0 extends)
- `/Users/jpwilson/Documents/Projects/SGTG/OFS_claude-daylight/frontend/src/context/AuthContext.jsx` (cannot be edited; every new page must work around its profile load, its `loading` flag and its no-handle dead end)
- `/Users/jpwilson/Documents/Projects/SGTG/OFS_claude-daylight/frontend/src/App.jsx` (the fixed route list and the imports the seams redirect)
- `/Users/jpwilson/Documents/Projects/SGTG/OFS_claude/backend/app/api/auth.py` (profile creation, trial start, invitations, the preview leak and the reusable-link fault)
- `/Users/jpwilson/Documents/Projects/SGTG/OFS_claude-daylight/docs/app/handover/FOUNDATION.md` (the rules, primitives, sample mode and checks the AUTH package must follow)