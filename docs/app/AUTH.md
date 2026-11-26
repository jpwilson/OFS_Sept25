# Sign-in and sign-up, with Google: decisions (26 November 2026)

The owner: "I think what we need is a login and a signup that's interesting and exciting and works on web, mobile web, and iOS, and we should signup with Google."

Two planners traced today's flow and planned this independently and agreed on every main point. `docs/app/PLAN-AUTH.md` is the detailed reference (today's flow with `file:line`, the Supabase facts and what was verified, the safety table, the states). **This file is the decisions; where it differs, this file wins.**

## Decisions

1. **Frontend only, in this checkout, as a new `auth` package** (`frontend/src/daylight/auth/**`), arriving through new seams on routes that already exist. No backend change, no change to `App.jsx`, `vercel.json` or `src/lib/supabaseClient.js`. The classic build stays byte-identical.
2. **Six new seams**: `./pages/Login`, `./pages/AuthCallback`, `./pages/ResetPassword`, `./pages/InviteLanding`, `./pages/InvitedSignup`, `./pages/DemoLogin`. The callback seam renders the Daylight page when the look is Daylight **or** a pending-flow marker is set, so someone who started in the new look always returns to a page that understands Google.
3. **Google through Supabase**: `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: origin + '/auth/callback', queryParams: { prompt: 'select_account' } } })`. The client exchanges the code itself on load; the callback page must **not** call `exchangeCodeForSession` (a second exchange fails). It awaits `supabase.auth.initialize()`, then `getSession()`, reads any `error`/`error_code` in the URL itself, and cleans the URL. `redirectTo` never carries a query string; the return path travels in browser storage.
4. **A Supabase user is not a member until a `users` row exists.** After any sign-in: `GET /users/me`; on 401 "User profile not found", show the **first-run step** (name and handle, both pre-filled, handle checked live against `GET /users/{username}`, 404 means free; lowercase letters, digits, underscore, 3 to 20), then `POST /auth/supabase/create-profile` and `PUT /users/me/profile {full_name}` so the chosen name shows everywhere. Re-check on failure; never create twice. The handle is asked, not assigned: it is permanent.
5. **Order on the card:** Continue with Google (first, Google's standard mark, unmodified), a divider, email, password with a real show button, one solid button, then "Forgot your password?" and the switch between Log in and Start free. The card is a list of providers so "Continue with Apple" can be added when the iPhone app ships. The investor demo link leaves the consumer page (`/demo-login` still works by address).
6. **Sign-up asks as little as possible:** Google is one tap and the first-run screen; email is two fields, the inbox, and the first-run screen. Photo, bio, notification choices and who to follow come later.
7. **Return paths** go through one `safeNext()`: same-origin relative paths only (one leading `/`, not `//` or `/\`), at most 512 characters, never an auth route. A signed-in person who lands on the sign-in page is sent on. Pages wait for the session check before bouncing anyone.
8. **Password reset** is one page with four states (ask, check your inbox, choose a new password, done). It shows the new-password form whenever a session exists and never auto-redirects a signed-in person (today's page does, which is why reset fails). It keys off the route, not an auth event.
9. **Sign-out is local** (`scope: 'local'`): logging out on the laptop leaves the phone signed in.
10. **Never log** tokens, the `code`, `token_hash`, passwords, invite tokens or email addresses. Log error codes only.
11. **The look: "the door".** Each auth screen is a small stage from the landing page: a flat wash wall, a deeper floor, one sticker word in the headline, a ghost word behind, the family standing on the same floor as the white keylined card that holds the controls. The form paints first; the art is decorative. Voice per `docs/landing/ROUND4.md` section 1; every number through `fact()`.

| Screen | Route | Wash, ghost word | Headline [sticker] and sub | People (art manifest ids) |
|---|---|---|---|---|
| Log in | `/login` | tide, "hello" | Welcome [back]. · Your family's stories are right where you left them. | `g-family-hero`; `p-ruth-wave`, `p-joe-wave` on iPad and desktop |
| Start free | `/login?signup=true` | sun, "yours" | Come on [in]. · trial facts from `facts.js` | `p-maya-tada`, `g-kids-biscuit`, `prop-balloons` |
| Check your inbox | same route, state | sun | Check your [inbox]. · We sent a link to {email}. Open it to finish. | `p-joe-phone` |
| Forgot / new password | `/reset-password` | azure, "back" | Let's get you back [in]. / Choose a new [password]. | `p-ruth-tablet` |
| Returning from Google or a link | `/auth/callback` | wash of the screen they left | Opening the [door]. | the family, mid-pop |
| First run | callback or login, state | fizz, "you" | What should we [call] you? | `p-ivy-cheer`, `p-leo-cheer`, `p-biscuit` |
| Welcome | same, state | sun, "welcome" | You're in, [first name]. | `g-family-hero`, grandparents, `prop-confetti` |
| Invitation | `/join/:token`, `/signup/invited` | lime, "join" | {Ruth} saved you a [seat]. | the inviter's real avatar and story covers; props only, no cut-out family beside real people |

12. **After the first sign-in**: two large cards, "Make your first story" (to the creation flow) and "Invite your family" (their link); for someone who arrived by invitation, "Read {inviter}'s latest story" comes first. A quiet "Look around first".
13. **Four viewports, each designed**: phone 390x844 first (all controls visible without scrolling, nothing fixed to the bottom so the keyboard cannot cover a button, 16px inputs), iPad portrait 820x1180, iPad landscape 1180x820, desktop 1440x900 (a poster, not a split-screen form). Reduced motion swaps instantly.
14. **States, all designed** (PLAN-AUTH section 4 has the list and wording): checking for a session, busy, wrong email or password, email not confirmed (with "Send the link again" and a 60-second countdown), rate limited, offline, Google closed or refused, Google blocked in an in-app browser, handle taken (with a suggestion), email link opened on another device, account paused, invitation used, already signed in on an invitation.

## Shared files this job may edit (and only for this)

`frontend/scripts/daylight/vite-seam.mjs` (the six seams; the stub auth server must read request bodies and answer HTML and redirects), `frontend/scripts/daylight/capture.mjs` (add 820x1180 and 1180x820 and an auth scene), `frontend/src/daylight/seam/*` (the six seam files; a layout effect that remembers the last in-app path), `dev/sampleApi.js` and `dev/only.js` (the `auth` package; the stub sign-in: a plainly labelled sample account chooser standing in for Google with personas member, new person, cancel and error; a stub inbox page for confirmation and reset links), `shell/Shell.jsx` (local sign-out; hide the install banner on auth routes).

## What only the owner can do (the code is built and proven against the stub without it)

1. Merge PR #7 (the blank page after sign-in).
2. Google Cloud Console: a project, the consent screen (External, published), scopes `openid`, `userinfo.email`, `userinfo.profile`, and one OAuth client of type Web application whose redirect URI is the callback URL shown on Supabase's Google provider page.
3. Supabase dashboard: enable Google and paste the client ID and secret there (never into chat, git or Vercel); set the Site URL and add the redirect URLs (PLAN-AUTH section 2).
4. Tell us, with no secrets: is Confirm email on, is custom SMTP set, are the email templates the defaults.
5. Do not rotate the project's JWT signing keys: the backend verifies the legacy secret only.

## Not in this job

Apple sign-in (with the iPhone app). Backend hardening (username validation on the server, an invitation-accept endpoint, CORS for previews): proposed separately. The privacy fix to the invitation preview and the classic password-reset fix are being made as their own small pull requests against `main`.
