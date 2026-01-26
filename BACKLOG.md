# Backlog: Suggestions & Ideas to Revisit

**Created:** January 26, 2026
**Purpose:** Temporary parking lot for ideas discussed but not yet prioritized. Come back to these once critical issues are resolved.

---

## Monitoring & Observability

### Sentry Integration (Recommended)
- **Free tier:** 5,000 errors/month, 50 session replays, 7-day retention
- Would auto-capture: upload failures, auth errors, unhandled exceptions
- Session replay would show exactly what users see when things break
- Easy React + Python integration

### LogRocket (Alternative)
- **Free tier:** 1,000 sessions/month, 30-day retention
- Session replay focused (video of user sessions)
- More sessions data, less error-focused

### Datadog (Not recommended for now)
- **Free tier:** 5 hosts, 1-day retention
- Overkill for current scale

---

## Auth & Session Improvements

### Session Persistence Investigation
- Users reportedly getting logged out unexpectedly
- Supabase client is configured correctly (autoRefreshToken, persistSession)
- Need to investigate:
  - [ ] Add logging to `onAuthStateChange` to track session events
  - [ ] Check if mobile Safari is clearing localStorage
  - [ ] Test token refresh behavior when app is backgrounded
  - [ ] Check if `getAuthHeaders()` token refresh silently fails

### Logout Error Handling
- Current: `await supabase.auth.signOut()` with no error handling
- Should: catch errors, clear state regardless, log failures
- Mobile browsers may fail signOut if offline

---

## Upload Improvements (Beyond Current Retries)

### Diagnostics
- [ ] Monitor Vercel function logs for upload patterns
- [ ] Track which step fails: GPS extraction, Cloudinary upload, or DB record save
- [ ] Compare mobile vs desktop success rates

### Progressive Upload
- [ ] Show per-image progress during multi-image upload
- [ ] Allow partial success (if 3/5 images upload, save those 3)
- [ ] Queue uploads and retry failed ones

### Offline/Poor Connection Handling
- [ ] Detect connection quality before upload
- [ ] Queue uploads for later if offline
- [ ] Compress more aggressively on mobile

---

## Feedback Widget Improvements

### Current State (Deployed)
- Floating button on desktop, hamburger menu on mobile
- Bug/Feature/Other categories
- Rate limited (3/min)
- Captures: page URL, screen size, mobile/desktop, user agent

### Future
- [ ] Screenshot/attachment support
- [ ] Admin dashboard to view feedback (currently in DB only)
- [ ] Email notification to admin on new feedback
- [ ] User gets confirmation email
- [ ] Status tracking (user can see if feedback was addressed)

---

## Subscription & Billing UX (CRITICAL - see separate investigation)

### Known Issues (Jan 26, 2026)
- Expired trial users still see "Pro" as their plan
- "Your subscription is set to end on" shows blank date
- Status shows "Canceling" instead of "Expired"
- Users don't get clear notification that trial ended
- Functionality breaks in unexpected ways after trial expires

### Needs
- [ ] Clear plan labels: "Free (view-only)" vs "Pro" vs "Family"
- [ ] Correct date display (past/present/future)
- [ ] Correct status labels (Active, Canceled, Expired)
- [ ] Trial expiration notification
- [ ] Graceful degradation (what can free users do?)

---

## Other Feature Ideas

### Staging Environment
- Set up staging branch that deploys to a separate Vercel URL
- Would prevent breaking production with untested changes

### Testing Infrastructure
- Add ESLint for code quality
- Add basic functional tests (login, create event, upload)

### Username Change
- Allow users to change username (once per month, paid users only)

### Notification System Upgrade
- Media reaction notifications
- Media comment notifications
- User preferences for each notification type
- Batching/digest options

---

## Notes

- This is a parking lot, not a priority list
- Critical issues should be in TODO.md
- Once an item is worked on, move it to TODO.md as "In Progress"
- Once completed, move to CHANGELOG.md
