# Our Family Socials - TODO List

**Last Updated:** January 26, 2026

---

## CRITICAL - Fix Now

### Subscription & Billing UX (Broken)
**Status:** Users with expired trials see broken/misleading UI
- [ ] Plan still says "Pro" after trial expires (should say "Free (view-only)")
- [ ] "Your subscription is set to end on" shows blank date
- [ ] Status shows "Canceling" instead of "Expired" for ended trials
- [ ] Users don't get clear notification that trial ended
- [ ] Correct date display: future date shown, "today" if current, "ended on [date]" if past
- [ ] Correct status labels: Active, Canceled (if user canceled), Expired (if trial ran out)
- [ ] Functionality breaks in unexpected ways after trial expires
- [ ] Graceful degradation: define exactly what free users can/cannot do

### Session/Login Persistence Issues
**Symptoms:** Users getting logged out unexpectedly, especially on mobile
- [ ] Add logging to `onAuthStateChange` to track session events
- [ ] Check if mobile Safari is clearing localStorage
- [ ] Test token refresh behavior when app is backgrounded
- [ ] Check if `getAuthHeaders()` token refresh silently fails
- [ ] Improve logout error handling (catch errors, clear state regardless)

### Stripe Checkout 500 Error (Intermittent)
**Symptoms:** `POST /api/v1/stripe/create-checkout-session` returns 500 Internal Server Error intermittently. Works on retry (e.g., 3rd click). Observed in production.
- [ ] Add error logging to `create-checkout-session` endpoint to capture root cause
- [ ] Check if Stripe API key or session creation is timing out
- [ ] Check if auth token refresh race condition causes intermittent failures
- [ ] Add retry logic on frontend for checkout session creation
- [ ] Monitor Vercel function logs for patterns

### Event Creation Issues
- [ ] Image upload failures (now has retry logic + better error messages)
- [ ] Form submission errors
- [ ] Mobile-specific issues
- [ ] Needs user testing to identify specific symptoms

---

## High Priority

### Run Feedback Table SQL (Required for feedback widget to work)
```sql
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    feedback_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    page_url VARCHAR(500),
    user_agent VARCHAR(500),
    screen_size VARCHAR(50),
    is_mobile BOOLEAN DEFAULT FALSE,
    attachment_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'new',
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);
```

### Feedback Widget Improvements
**Current state:** Floating button on desktop, purple ? in hamburger on mobile. Bug/Feature/Other categories. Rate limited (3/min). Captures context.
- [ ] Add image/screenshot attachment support (upload to Cloudinary)
- [ ] Add 30-second video attachment support
- [ ] Show users they can attach media (UI hint)
- [ ] Admin endpoint to view/manage submitted feedback
- [ ] Superuser role: ability to assign admin privileges to users
- [ ] Admin dashboard page for reviewing feedback
- [ ] Email notification to admin on new feedback
- [ ] Status tracking (user can see if feedback was addressed)
- [ ] Help/Glossary section: ? button will eventually open a sub-menu with Feedback, Glossary, etc.

### Superuser / Admin System
- [ ] Add `is_admin` or `role` field to users table
- [ ] Admin-only API endpoints (feedback review, user management)
- [ ] Admin UI (protected routes)

---

## Medium Priority

### Monitoring & Observability
**Recommendation:** Sentry (free tier: 5k errors/month, 50 session replays, 7-day retention)
- [ ] Integrate Sentry for auto-capturing errors
- [ ] Session replay to see what users experience
- Alternatives considered: LogRocket (1k sessions/mo), Datadog (overkill)

### Upload Improvements (Beyond Current Retries)
- [ ] Monitor Vercel function logs for upload failure patterns
- [ ] Track which step fails: GPS extraction, Cloudinary upload, or DB record
- [ ] Compare mobile vs desktop success rates
- [ ] Show per-image progress during multi-image upload
- [ ] Allow partial success (if 3/5 images upload, save those 3)
- [ ] Queue uploads and retry failed ones
- [ ] Detect connection quality before upload
- [ ] Compress more aggressively on mobile

### Notification System Upgrade
**Current:** Event comments, new followers, new events from followed users trigger email notifications
- [ ] Media reaction notifications (when someone reacts to your photo/video)
- [ ] Media comment notifications (when someone comments on your photo/video)
- [ ] Add user preferences: `notify_media_reaction`, `notify_media_comment`
- [ ] Consider batching/digest for high-volume engagement
- [ ] Decision needed: individual vs daily digest vs comments-only

---

## Low Priority / Future

### Staging Environment
- [ ] Set up staging branch deploying to separate Vercel URL
- [ ] Prevent breaking production with untested changes

### Testing Infrastructure
- [ ] Add ESLint for code quality
- [ ] Add basic functional tests (login, create event, upload)

### Username Change Feature
- [ ] Allow users to change username
- [ ] Limit: once per month
- [ ] Paying users only

---

## Completed (February 2026)

- [x] **PWA Implementation** - manifest, service worker, platform-aware install prompts (iOS/Android/Desktop) (Feb 11)
- [x] **SEO Meta Tags** - OG tags, Twitter cards, JSON-LD, robots.txt, sitemap.xml, AI crawler directives (Feb 11)
- [x] **Landing Page Social Proof project** - Added to admin dashboard as experimentation project (Feb 11)
- [x] **Liquid Glass UI** - Applied glassmorphism to header nav, view toggle, category chips, filters, modal toggle (Feb 11)
- [x] **Split Create/AI Button** - Desktop hover-expands, mobile side-by-side Create + AI Create (Feb 11)
- [x] **AI Create default mode** - Modal defaults to AI Create, renamed from AI Assist (Feb 11)
- [x] **Category pluralization** - Display names pluralized (Birthdays, Vacations, etc.) while keeping DB values (Feb 11)
- [x] **Blog page & FAQ route** - What's New blog page, in-app FAQ route (Feb 11)
- [x] **Help menu** - ? button opens 3-option popup (Send Feedback, What's New, FAQ) (Feb 11)
- [x] **AI caption-image mismatch fix** - Position-based matching instead of URL-based (Feb 11)
- [x] **Category Clear All bug fix** - Functional state updates to avoid stale closures (Feb 11)

## Completed (January 2026)

- [x] **Feedback ? button in hamburger menu** - purple circle, centered under Profile (Jan 26)
- [x] **Feedback widget** - floating button for bug reports/feature requests (Jan 24)
- [x] **Error logging endpoint** - client errors logged to Vercel (Jan 24)
- [x] **Upload retry logic** - 2-3 retries with exponential backoff (Jan 24)
- [x] **Upload timeout protection** - prevents infinite hangs (Jan 24)
- [x] **GPS extraction timeout** - 5s max, skip for large files (Jan 24)
- [x] **Mobile-aware error messages** - WiFi hints for mobile users (Jan 24)
- [x] Mobile image comments UX improvements (bottom sheet, close button, visible engagement)
- [x] Mobile filter layout reorganization (stacked date toggle, bottom sheet, right-aligned toggle)
- [x] Category filter ribbon with icons and scroll arrows
- [x] Multi-category support (events can have 2 categories)
- [x] Event tags bug fix (was using slug instead of numeric ID)
- [x] Unified pricing pages (logged-in and logged-out)
- [x] Free tier messaging update ("View-only - cannot create events")
- [x] Ad blocker troubleshooting note on billing page
- [x] Image commenting UI in lightbox
- [x] Multiple reaction types for images/videos (10 emojis)
- [x] Inline image overlays showing reaction/comment counts
- [x] Video caption fix in event view
- [x] Reaction picker portal fix for lightbox

---

## Notes

- Reactions and comments work for both images AND videos
- All database changes should use Alembic migrations
- Always run `npm run build` before pushing
- Single TODO.md for all tracking (no separate backlog files)
