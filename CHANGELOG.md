# Changelog & Project History

This document captures the evolution of Our Family Socials from initial concept to production.

---

## Timeline Overview

| Period | Phase | Key Milestone |
|--------|-------|---------------|
| Sep 2025 | Foundation | Project setup, React + FastAPI, SQLite |
| Oct 2025 | Core Features | Events, profiles, maps, authentication |
| Oct 2025 | Migration | PostgreSQL on Supabase, Vercel deployment |
| Nov 2025 | Auth Migration | Supabase Auth integration (major refactor) |
| Nov 2025 | Launch | Production at ourfamilysocials.com |
| Nov-Dec 2025 | Post-Launch | Subscriptions, sharing, privacy |
| Dec 2025-Jan 2026 | Enhancement | Family tree, slugs, UX improvements |

---

## January 2026

### Feedback & Error Tracking (Jan 24)
- **Feedback Widget**: Floating "?" button on all pages for bug reports, feature requests
- **Error Logging**: Client-side errors logged to Vercel for debugging
- **Rate Limiting**: 3 submissions per minute per IP to prevent abuse

### Upload Reliability Improvements (Jan 24)
- **Retry Logic**: 2 retries on mobile, 3 on desktop with exponential backoff
- **Timeout Protection**: 90s mobile, 60s desktop (prevents infinite hangs)
- **GPS Extraction Timeout**: 5s max, skipped for files >30MB
- **Mobile-Aware Errors**: Specific hints like "try switching to WiFi"
- **Error Logging**: Failed uploads logged for debugging

### Mobile UX Improvements
- Image gallery: Comments panel as bottom sheet (Post button always visible)
- Image gallery: Persistent close button when zoomed
- Image gallery: More visible engagement buttons with pulse animation
- Feed filters: Reorganized mobile layout with stacked date toggle
- Feed filters: Show/Hide Filters button in header row
- Feed filters: "All" moved into Users dropdown on mobile
- All mobile changes scoped to 480px breakpoint

### Category System
- Category filter ribbon with icons (Peloton-style design)
- Multi-category support (events can have up to 2 categories)
- Scroll arrows for category ribbon on desktop
- Visual chip design with hover animations

### Quick Add Feature
- Floating "+" button in header for rapid event creation
- Hover expansion with tooltip
- Positioned in header navigation area

### Feed Enhancements
- Sort direction toggle (most recent first / oldest first)
- User muting functionality
- Improved filter layout

### Share Link Management
- Copy link to clipboard
- Extend expiration (add days via popup)
- Enable/disable links
- Show creation date and expiration

### UX Polish
- Centered Quick Add button icon
- Follow button improvements
- Suppressed expected 403 errors in console

---

## December 2025

### URL-Friendly Slugs
Added SEO-friendly event URLs:
- `/events/my-vacation-2025` instead of `/events/123`
- Auto-generated from event title
- Fallback to numeric ID if slug unavailable

### Family Tree Visualization
- Interactive graph using `family-chart` library
- Based on tag profile relationships
- D3 zoom/pan support
- Dark theme styling

### Relationships System
- Tag profiles for non-users (e.g., "Grandma", "Uncle Bob")
- Multiple relationships per tag profile
- Approval workflow for relationship requests
- Relationship types (parent, sibling, spouse, etc.)

### Share Links Enhancement
- Expiration date display
- Share date tracking
- Management UI in profile

---

## November 2025

### Image Caption System (Nov 8-12)
**Problem:** Users couldn't add captions or click images for full-screen view

**Solution:**
1. `event_images` table stores images with captions
2. Consolidated into main event API response (reduced DB connections)
3. Clickable images open lightbox
4. Single toggle controls all captions
5. User preference persisted to localStorage

**Key Learning:** Avoid circular dependencies in React hooks - they break Vite bundling.

### Connection Pool Crisis (Nov 10-11)
**Problem:** `MaxClientsInSessionMode` errors crashing the site

**Cause:** Each page made multiple API calls, exhausting Supabase's 5-connection limit

**Failed Attempt:** Switched to Transaction pooler mode - backend crashed with no useful logs

**Solution:** Consolidated related data into single API responses. Example: include `event_images` in event response instead of separate call.

### Supabase Auth Migration (Nov 1-4)
**Major refactor:** Migrated from custom JWT auth to Supabase Auth

**What Changed:**
- Authentication handled by Supabase
- Backend validates Supabase JWTs
- Users table linked via `auth_user_id` (Supabase UUID)
- Password reset via Supabase
- Email verification via Supabase

**Challenges:**
- Existing users needed migration
- Token validation logic completely rewritten
- CORS issues with Supabase endpoints

**Post-Mortem:** See `POST_MORTEM_AUTH_MIGRATION.md` for detailed lessons.

### Production Launch
- Domain: ourfamilysocials.com
- SSL auto-provisioned by Vercel
- CORS configured for production domain
- Real users onboarded

---

## October 2025

### Vercel + Supabase Migration (Oct 27)
**From:** Local SQLite + manual deployment
**To:** PostgreSQL on Supabase + Vercel auto-deploy

**Key Decisions:**
1. **Supabase over self-hosted PostgreSQL** - Free tier, managed service, built-in auth
2. **Session pooler over Transaction** - More compatible with SQLAlchemy
3. **Vercel for both frontend and backend** - Simpler deployment, single platform
4. **No local database** - Test in production (Supabase free tier limits)

### Core Features Complete
- Event CRUD with rich text editor
- User profiles with avatars
- Follow/follower system
- Comments and likes
- Map view with marker clustering
- Image upload to Supabase Storage

### Testing Phase (Oct 24)
- Comprehensive testing checklist created
- Automated tests where possible
- Manual testing for UI flows
- Bug tracking in `BUGS_AND_RECOMMENDATIONS.md`

---

## September 2025

### Project Inception
**Vision:** Magazine-style social network for families

**Initial Tech Stack:**
- React + Vite (frontend)
- FastAPI + SQLAlchemy (backend)
- SQLite (development database)
- Local file storage for images

### Design Decisions
**Why FastAPI?**
- Modern Python, async support
- Auto-generated API docs
- Pydantic validation
- Easy to deploy as serverless

**Why React + Vite?**
- Fast development experience
- Large ecosystem
- CSS Modules for styling
- Easy Vercel deployment

**Why Magazine-Style Layout?**
- Differentiator from Instagram's grid
- Better for storytelling
- Inline images with narrative text
- Rich, immersive experience

---

## Architecture Evolution

### Phase 1: Local Development (Sep 2025)
```
Frontend (localhost:3000) → Backend (localhost:8000) → SQLite
```

### Phase 2: Cloud Migration (Oct 2025)
```
Vercel Frontend → Vercel Backend (Serverless) → Supabase PostgreSQL
```

### Phase 3: Full Production (Nov 2025)
```
Vercel CDN
├── React SPA (static assets)
└── FastAPI (serverless functions)
    ├── Supabase PostgreSQL (data)
    ├── Supabase Auth (authentication)
    ├── Supabase Storage → Cloudinary (media)
    ├── Stripe (payments)
    └── Resend (email)
```

---

## Key Technical Decisions

### 1. No Local Development Database
**Decision:** Test directly in production

**Rationale:**
- Supabase free tier has 5 connection limit
- Setting up local PostgreSQL adds complexity
- Vercel deploys in ~2 minutes
- Fast feedback loop anyway

**Trade-off:** Risk of breaking production, mitigated by:
- Running `npm run build` before pushing
- Quick revert process (`git revert HEAD --no-edit && git push`)

### 2. Session Pooler Only
**Decision:** Use Supabase Session pooler (port 5432), never Transaction

**Rationale:** Transaction pooler caused backend crashes with no useful error messages. Debugging was impossible.

**Trade-off:** Fewer concurrent connections, mitigated by consolidating API calls.

### 3. Cloudinary for Media
**Decision:** Moved from Supabase Storage to Cloudinary for images

**Rationale:**
- Better CDN performance
- Built-in image transformations
- Video processing support
- More generous free tier

### 4. Stripe for Payments
**Decision:** Stripe over alternatives (Paddle, Lemon Squeezy)

**Rationale:**
- Industry standard
- Excellent documentation
- React components available
- Webhook support

---

## Lessons Learned

### React/Vite
1. **Circular dependencies break builds** - Keep hooks simple, avoid complex dependency chains
2. **Run `npm run build` locally** - Catches bundling errors before production
3. **Event delegation for dynamic content** - Use `addEventListener` on container, not individual elements

### Database
1. **Consolidate API calls** - Fewer connections = fewer problems
2. **Include related data in responses** - Don't make separate calls for event_images
3. **Session mode only** - Transaction mode is unreliable with SQLAlchemy

### Deployment
1. **Test in production** - With proper safety nets (revert process)
2. **Auto-deploy is fast** - 2-3 minutes from push to live
3. **Hard refresh after deploy** - Cmd+Shift+R to clear cache

### Authentication
1. **Use managed auth** - Supabase Auth handles edge cases you won't think of
2. **JWT validation is tricky** - Let the library do it
3. **CORS is always harder than expected** - Test thoroughly

---

## Files Archived

The following historical documents are preserved for reference but are largely superseded by this changelog:

| File | Content | Status |
|------|---------|--------|
| `AUTH_DEBUG_TRACKING.md` | Auth migration debugging notes | Historical |
| `POST_MORTEM_AUTH_MIGRATION.md` | Auth migration lessons | Historical |
| `SUPABASE_AUTH_MIGRATION_PLAN.md` | Migration planning | Historical |
| `SUPABASE_MIGRATION_READY.md` | Migration checklist | Historical |
| `PROJECT_STATUS.md` | Oct 2025 status | Superseded |
| `STATUS.md` | Early MVP status | Superseded |
| `steps.md` | Implementation steps | Superseded |
| `TESTING_REPORT.md` | Oct 2025 test results | Historical |
| `TESTING_SUMMARY.md` | Test summary | Historical |
| `TESTING_CHECKLIST.md` | Manual testing guide | Still useful |
| `BUGS_AND_RECOMMENDATIONS.md` | Bug tracking | Partially current |

---

## Contributing to History

When making significant changes:

1. Add entry to this changelog with date and description
2. Update `CURRENT_STATE.md` if patterns or architecture change
3. Document any post-mortems for failures
4. Note key decisions and their rationale

The goal is to help future developers (including AI assistants) understand not just what the code does, but why it was built this way.
