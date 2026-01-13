# Our Family Socials - Current State Summary

**Last Updated:** January 13, 2026
**Status:** Production - Live at ourfamilysocials.com
**Purpose:** Private social network for families to share life events, photos, and memories

**⚠️ IMPORTANT:** This document should be updated whenever significant changes are made to the codebase.

---

## 🚀 Quick Start for New Claude Sessions

This document provides everything you need to know to continue development without breaking existing functionality.

**Key principle:** This is a WORKING production app with real users. Test frontend builds before pushing, and implement changes incrementally.

---

## 📋 What This App Is

**Our Family Socials** is a private social network for families to share:
- Life events (birthdays, vacations, milestones)
- Photos with captions
- Rich text stories
- Location-based journey maps
- Comments and likes
- Follow relationships

**Business Model:** Freemium
- Free: 5 events max
- Premium: Unlimited events ($9/mo annual, $12/mo monthly)

---

## 🏗️ Architecture & Tech Stack

### Deployment
- **Frontend:** React + Vite → Vercel (auto-deploy from GitHub main branch)
- **Backend:** FastAPI (Python) → Vercel Serverless Functions
- **Database:** PostgreSQL on Supabase (Session pooler, port 5432)
- **Auth:** Supabase Auth
- **File Storage:** Supabase Storage
- **Domain:** ourfamilysocials.com

### Frontend Stack
- React 18
- React Router for navigation
- CSS Modules for styling
- Tiptap for rich text editing
- Leaflet for maps
- yet-another-react-lightbox for image galleries
- Supabase client for auth

### Backend Stack
- FastAPI (Python)
- SQLAlchemy ORM
- Pydantic for validation
- PostgreSQL database
- JWT for API authentication

---

## 🗄️ Database Setup (CRITICAL)

**IMPORTANT:** The ONLY source of truth is the Supabase PostgreSQL database!

- **Production Database:** PostgreSQL on Supabase - THIS IS THE REAL DATABASE
- **Local SQLite:** Not used at all (may exist as legacy artifact)
- **Migrations:** Use **Alembic** in `backend/alembic/` - properly configured as of Jan 2026
- **Schema Changes:** Use Alembic migrations (see below)

### How to Make Database Changes (Alembic)

```bash
cd backend

# 1. First, update the SQLAlchemy model (e.g., app/models/user.py)
#    Add the new column/table to the model class

# 2. Generate migration from model changes
.venv/bin/alembic revision --autogenerate -m "description_of_change"

# 3. Review the generated file in alembic/versions/
#    - Remove cosmetic changes (TEXT vs String type differences, index naming)
#    - Keep only your actual schema changes

# 4. Apply migration to production database
.venv/bin/alembic upgrade head

# 5. Commit both the model changes AND the migration file
```

**Example:** Adding a column to users table:
```python
# 1. In app/models/user.py, add:
theme_preference = Column(String(10), default='dark')

# 2. Then run: alembic revision --autogenerate -m "add_theme_preference"
# 3. Review and clean up the generated migration
# 4. Run: alembic upgrade head
```

**IMPORTANT:** Always update BOTH the SQLAlchemy model AND create an Alembic migration. They must stay in sync.

### Connection Pool Details
- Using **Session mode** pooler (port 5432)
- Limit: 3-5 simultaneous connections on free tier
- **Do NOT switch to Transaction mode** - it crashed the backend (tried Nov 11, reverted)
- API calls consolidated to minimize connections (Nov 11 fix)

**See:** DATABASE_NOTES.md for full details

---

## 📁 Key File Locations

```
OFS_claude/
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Route pages (EventDetail, Profile, etc.)
│   │   ├── context/         # AuthContext, etc.
│   │   ├── services/        # API client (api.js)
│   │   └── extensions/      # Tiptap editor extensions
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── api/            # API endpoints (events.py, users.py, etc.)
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── core/           # Config, database, deps
│   │   └── utils/          # Utilities
│   ├── main.py
│   └── requirements.txt
└── *.md                    # Documentation
```

---

## 🎯 Recent Major Work (November 2025 - January 2026)

### Alembic Migrations Setup (January 2026)
**Purpose:** Proper database migration management
- Alembic initialized in `backend/alembic/`
- All 22 SQLAlchemy models imported and tracked
- Baseline migration stamped
- Models synced with production database
- **Key Files:** `backend/alembic/env.py`, `backend/alembic/versions/`

### Light Mode Improvements (January 2026)
**Purpose:** Fix light mode theme issues
- Added purple-tinted light mode palette (not plain white/grey)
- Fixed ViewToggle, CalendarView, FamilyTreeGraph components
- Replaced hardcoded dark colors with CSS variables
- **Key Files:** `frontend/src/styles/index.css`, various `.module.css` files

### Quick Add Feature (January 2026)
**Purpose:** Rapid event creation from the feed
- Floating "+" button in header that expands on hover
- Shows "Quick Add" tooltip
- Direct link to CreateEvent page
- **Key Files:** `frontend/src/components/Header.jsx`

### Feed Sort & Mute Users (January 2026)
**Features:**
- Sort direction toggle (most recent first / oldest first)
- User muting to hide content from specific users
- **Key Files:** `frontend/src/pages/Feed.jsx`, `backend/app/models/user_mute.py`

### URL-Friendly Slugs (December 2025 - January 2026)
**Purpose:** SEO-friendly event URLs
- Events now have slugs like `/events/my-vacation-2025` instead of just `/events/123`
- Auto-generated from event title
- **Key Files:** `backend/app/utils/slug.py`, `backend/app/models/event.py`

### Share Link Management (December 2025)
**Features:**
- Copy share link to clipboard
- Extend expiration (add days)
- Disable/enable share links
- Show share date and expiration
- **Key Files:** `frontend/src/pages/Profile.jsx`, `backend/app/api/share_links.py`

### Family Tree Visualization (November-December 2025)
**Features:**
- Interactive family tree graph using family-chart library
- Based on tag profile relationships
- D3 zoom/pan support
- **Key Files:** `frontend/src/pages/FamilyTree.jsx`, `frontend/src/utils/familyTreeTransform.js`

### Relationships System (November-December 2025)
**Features:**
- Tag profiles (group profiles for non-users like "Grandma", "Uncle Bob")
- Multiple relationships per tag profile with approval workflow
- Relationship types configurable
- **Key Files:** `backend/app/api/tag_profiles.py`, `backend/app/api/relationships.py`

### Order By Toggle (November-December 2025)
**Features:**
- Toggle between "Event Date" and "Upload Date" sorting
- Slider-style UI in filter row
- **Key Files:** `frontend/src/components/EventFilters.jsx`

### Image Caption System (Nov 8-12, 2025)
**Problem:** Users couldn't add captions to images or click images to view full-screen

**Solution Implemented:**
1. **Database:** `event_images` table stores images with captions
2. **Backend:** Consolidated event_images into main event API response (reduced DB connections)
3. **Frontend:**
   - Images clickable (opens lightbox)
   - Captions display below images (toggleable)
   - Single "💬 Show/Hide Captions" toggle controls all captions
   - User preference saved to localStorage

**Key Files:**
- `backend/app/models/event_image.py` - EventImage model
- `backend/app/api/events.py` - Event API with event_images included
- `frontend/src/pages/EventDetail.jsx` - Caption display and image click handling
- `frontend/src/components/ImageGallery.jsx` - Lightbox with Captions plugin

**See:** DEVELOPMENT_LOG.md for detailed implementation notes

---

## ⚠️ Critical Patterns to Follow

### 1. ALWAYS Test Frontend Build Before Pushing
**What this means:** Run the Vite build command to check for bundling errors BEFORE pushing to GitHub.

```bash
cd frontend
npm run build
```

**Why:** If the build fails locally, it will fail in Vercel production too. This catches:
- Circular dependencies ("Cannot access 'X' before initialization")
- Import errors
- Duplicate props (e.g., two `styles=` attributes)
- TypeScript errors (if using TS)

**You are NOT running the full app locally** - just checking that the frontend code bundles correctly.

### 2. Avoid Circular Dependencies
❌ **BAD:**
```javascript
const handleClick = useCallback(() => {
  // uses allImages
}, [allImages])

const allImages = useMemo(() => {
  // uses eventImages
}, [eventImages, handleClick]) // ← Circular!
```

✅ **GOOD:**
```javascript
function handleClick(imageUrl) {
  // Simple function, no hooks
}

const allImages = useMemo(() => {
  // ...
}, [eventImages]) // No handleClick dependency
```

### 3. Event Delegation for Dynamic Content
When adding click handlers to rich HTML content (from Tiptap editor):

```javascript
useEffect(() => {
  const handleClick = (e) => {
    if (e.target.tagName === 'IMG') {
      handleImageClick(e.target.src)
    }
  }

  const content = contentRef.current
  content.addEventListener('click', handleClick)

  return () => content.removeEventListener('click', handleClick)
}, [event]) // Only depend on event, not on handlers
```

### 4. State Management for External Control
When a child component needs to be controlled by parent:

```javascript
// Parent controls lightbox
<ImageGallery
  lightboxOpen={lightboxState.open}
  lightboxIndex={lightboxState.index}
  onLightboxChange={setLightboxState}
/>

// Child accepts external control
const actualOpen = lightboxOpen !== undefined ? lightboxOpen : open
```

### 5. Database Connection Pool Management
- **Problem:** Each API endpoint creates DB connections
- **Solution:** Consolidate related data into single API calls
- **Example:** Include event_images in event response instead of separate call

---

## 🚫 Common Pitfalls (DON'T DO THESE)

### 1. Use Alembic for Database Changes
**Use the Alembic migrations in `/backend/alembic/`** for all database changes. The legacy `/backend/migrations/` folder contains old SQL files that are no longer used.

When making database changes:
1. Update the SQLAlchemy model first
2. Generate migration: `alembic revision --autogenerate -m "description"`
3. Review and clean up the generated migration file
4. Apply: `alembic upgrade head`
5. Commit both model and migration file

### 2. Don't Use Multiple API Calls Per Page
This exhausts the connection pool (max 3-5 connections). Consolidate related data.

❌ BAD:
```javascript
const event = await apiService.getEvent(id)
const images = await apiService.getEventImages(id) // Separate call!
```

✅ GOOD:
```javascript
const event = await apiService.getEvent(id) // Already includes event_images
```

### 3. Don't Switch to Transaction Mode Pooler
We tried this on Nov 11. Backend crashed with "Python process exited" and no useful logs. Stick with Session mode (port 5432).

### 4. Don't Push Without Testing Frontend Build
Run `npm run build` in the frontend directory BEFORE pushing. This catches bundling errors that will break production.

### 5. Don't Create Complex Hook Dependencies
Keep functions simple. Use regular functions instead of useCallback when possible to avoid circular dependencies.

---

## 📊 Data Flow Examples

### Event with Images
1. User creates event with images in Tiptap editor
2. Images uploaded to Supabase Storage
3. Image URLs + captions saved to `event_images` table
4. Event detail page loads event (includes event_images in response)
5. EventDetail renders images with captions
6. User clicks image → lightbox opens via external state control

### Authentication Flow
1. User logs in via Supabase Auth
2. Backend receives Supabase JWT
3. Backend validates JWT and gets user from database
4. API returns JWT for subsequent requests
5. Frontend stores JWT in localStorage
6. AuthContext provides user data to app

---

## 🔧 How to Implement New Features

1. **Read DEVELOPMENT_LOG.md** - See what we tried and what worked/failed
2. **Check commit history** - Recent patterns and approaches
3. **Test frontend build** - Run `npm run build` to catch bundling errors
4. **Implement incrementally** - One feature at a time, test in production after each
5. **Document lessons learned** - Update DEVELOPMENT_LOG.md and CURRENT_STATE.md

### Example: Adding a New Feature
```bash
# 1. Make code changes in your editor

# 2. Test that frontend builds without errors
cd frontend
npm run build
# ↑ This just checks for build errors, doesn't run the app

# 3. If build successful, commit
cd ..
git add <files>
git commit -m "Clear description of what changed"

# 4. Push to GitHub (triggers Vercel auto-deploy)
git push origin main

# 5. Wait 2-3 minutes for Vercel to deploy

# 6. Test in production at ourfamilysocials.com
# Hard refresh browser (Cmd+Shift+R) to clear cache

# 7. If broken, revert immediately:
git revert HEAD --no-edit
git push origin main
# ↑ This creates a new commit that undoes the last one
```

**Note:** We test in production because there's no local dev environment with the Supabase database.

---

## 📚 Where to Find More Info

### For New Features
- **POST_LAUNCH_TODO.md** - Planned features and priorities
- **BUGS_AND_RECOMMENDATIONS.md** - Known issues and enhancements

### For Deployment
- **DEPLOYMENT_GUIDE.md** - How to deploy to Vercel + Supabase
- **DATABASE_NOTES.md** - Database setup and connection pooling

### For Recent Work
- **DEVELOPMENT_LOG.md** - Detailed log of Nov 11-12 image caption work
- **Git commits** - `git log --oneline -20` for recent changes

### For Testing
- **TESTING_CHECKLIST.md** - Manual testing checklist
- **TESTING_REPORT.md** - Automated test results (Oct 24)

### For Auth Issues
- **AUTH_DEBUG_TRACKING.md** - Auth migration debugging notes
- **POST_MORTEM_AUTH_MIGRATION.md** - Lessons from auth migration

---

## 🎯 Current Priorities

### Completed (November 2025 - January 2026)
✅ Image caption system with lightbox
✅ Clickable images with lightbox
✅ Caption toggle (single control for all captions)
✅ Connection pool optimization
✅ URL-friendly slugs for events
✅ Share link management (copy, extend, disable)
✅ Family tree visualization
✅ Tag profiles and relationships system
✅ Feed sort direction toggle
✅ User muting
✅ Quick Add button for rapid event creation
✅ Order By toggle (event date vs upload date)
✅ Follow status UI improvements
✅ Stripe subscription integration (trial, monthly, annual)
✅ Email notifications system

### Potential Next Steps
- Admin panel for content moderation
- Mobile app (React Native)
- Performance optimizations
- Additional social features based on user feedback

---

## 💡 Development Philosophy

1. **Working is better than perfect** - Ship features incrementally
2. **Test in production after every change** - Don't batch changes
3. **Revert quickly if broken** - Don't try to fix forward
4. **Document lessons learned** - Help future Claude instances
5. **Ask user for clarification** - Don't assume requirements

---

## 🆘 If Things Break

### Site is down / black screen
1. Check Vercel deployment logs
2. Look for "Cannot access X before initialization" errors (circular deps)
3. Revert last commit: `git revert HEAD --no-edit && git push origin main`

### Database connection errors
1. Check if making too many API calls per page
2. Consolidate related data into single endpoint
3. See DATABASE_NOTES.md for connection pool details

### Build failures
1. Look for circular dependencies
2. Check for duplicate props (e.g., two `styles=` attributes)
3. Verify imports are correct

### Auth issues
1. Check Supabase Auth dashboard
2. Verify JWT is in localStorage
3. Check CORS settings in backend

---

## 📝 Notes for New Claude Sessions

When you start working on this project:

1. **Read this file first** - Understand current state
2. **Check DEVELOPMENT_LOG.md** - See recent work and patterns
3. **Review recent commits** - `git log --oneline -10`
4. **Ask user what they want** - Don't assume
5. **Test incrementally** - Build, commit, push, test, repeat

**Remember:** This is a production app with real users. Be careful, test thoroughly, and revert quickly if something breaks.

---

## 🔄 Updating This Document

**This document should be updated when:**
- Major features are added/changed
- Architecture changes (new services, database changes, etc.)
- New patterns are established
- Critical bugs are discovered and fixed
- Deployment process changes

**How to update:**
1. Edit CURRENT_STATE.md with new information
2. Update the "Last Updated" date at the top
3. Commit with message like: "Update CURRENT_STATE.md - [what changed]"

**Don't worry about:**
- Minor bug fixes
- Small UI tweaks
- Code refactoring that doesn't change behavior

The goal is to keep this accurate enough to be useful, not to document every single change.

---

**Created:** November 12, 2025
**Last Major Update:** November 12, 2025
**Author:** Claude Code
**Purpose:** Onboarding document for future Claude sessions

**Next Claude:** Start here, then read DEVELOPMENT_LOG.md for recent detailed work.
