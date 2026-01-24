# Our Family Socials - TODO List

**Last Updated:** January 24, 2026

---

## In Progress / High Priority

### Session/Login Persistence Issues
**Symptoms:** Users getting logged out unexpectedly, especially on mobile
**To Investigate:**
- [ ] Check Supabase token refresh behavior
- [ ] Test if `onAuthStateChange` is firing correctly
- [ ] Check if mobile browsers are clearing localStorage/session
- [ ] Add logging to track when sessions expire vs get refreshed

### Event Creation Issues
**Symptoms:** TBD - need user to describe specific problems
**To Investigate:**
- [ ] Image upload failures (now has retry logic + better error messages)
- [ ] Form submission errors
- [ ] Mobile-specific issues

---

## Pending Actions

### Run Feedback Table SQL (Required)
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

### Consider Adding Sentry (Free Tier)
- 5,000 errors/month
- 7-day retention
- Session replay (50/month)
- Would help diagnose upload and auth issues

---

## Planned Features

### Notification System Upgrade
**Current State:**
- Event comments trigger email notifications
- New followers trigger notifications
- New events from followed users trigger notifications

**Missing:**
- [ ] Media reaction notifications (when someone reacts to your photo/video)
- [ ] Media comment notifications (when someone comments on your photo/video)
- [ ] Add user preferences: `notify_media_reaction`, `notify_media_comment`
- [ ] Consider batching/digest for high-volume engagement
- [ ] Decision needed: individual vs daily digest vs comments-only

### Staging Environment
- [ ] Set up staging environment for testing before production

### Testing Infrastructure
- [ ] Add linting
- [ ] Add functional tests

### Username Change Feature
- [ ] Allow users to change username
- [ ] Limit: once per month
- [ ] Paying users only

---

## Completed (January 2026)

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
