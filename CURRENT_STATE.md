# Our Family Socials - Current State Summary

**Last Updated:** November 12, 2025
**Status:** Production - Live at ourfamilysocials.com
**Purpose:** Private social network for families to share life events, photos, and memories

---

## 🚀 Quick Start for New Claude Sessions

This document provides everything you need to know to continue development without breaking existing functionality.

**Key principle:** This is a WORKING production app with real users. Always test locally, build before pushing, and implement changes incrementally.

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

**IMPORTANT:** We do NOT use local SQLite for development!

- **Production:** PostgreSQL on Supabase
- **Local SQLite:** EXISTS but only to start FastAPI server - NOT used for data
- **Schema Changes:** Provide SQL commands - user runs them in Supabase dashboard
- **No Migration Files:** User manages schema directly in Supabase

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

## 🎯 Recent Major Work (November 2025)

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

**Commits:** df531b0, 4ae3bb8, 3044d3c

**See:** DEVELOPMENT_LOG.md for detailed implementation notes

---

## ⚠️ Critical Patterns to Follow

### 1. ALWAYS Test Build Locally Before Pushing
```bash
cd frontend
npm run build
```
If build fails locally, it will fail in production. Circular dependencies cause "Cannot access 'X' before initialization" errors.

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

### 1. Don't Assume Local Database is in Sync
The local SQLite database is NOT used. All data is in Supabase production database.

### 2. Don't Use Multiple API Calls Per Page
This exhausts the connection pool. Consolidate related data.

❌ BAD:
```javascript
const event = await apiService.getEvent(id)
const images = await apiService.getEventImages(id) // Separate call!
```

✅ GOOD:
```javascript
const event = await apiService.getEvent(id) // Includes event_images
```

### 3. Don't Use Transaction Mode Pooler
We tried switching from Session to Transaction mode on Nov 11. Backend crashed with no useful logs. Stick with Session mode.

### 4. Don't Implement Features Without Testing Build
Multiple times we pushed code that built locally but broke in production due to bundling issues. ALWAYS `npm run build` first.

### 5. Don't Create Complex Hook Dependencies
Keep functions simple. Use regular functions instead of useCallback when possible.

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
3. **Test locally first** - Always `npm run build` before pushing
4. **Implement incrementally** - One feature at a time, test in production
5. **Document lessons learned** - Update DEVELOPMENT_LOG.md

### Example: Adding a New Feature
```bash
# 1. Make code changes
# 2. Test build
cd frontend && npm run build

# 3. If successful, commit
git add <files>
git commit -m "Clear description of what changed"

# 4. Push to GitHub (triggers Vercel deploy)
git push origin main

# 5. Wait 2-3 mins for Vercel deploy
# 6. Test in production
# 7. If broken, revert immediately:
git revert HEAD --no-edit
git push origin main
```

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

### Completed (November 2025)
✅ Image caption system
✅ Clickable images with lightbox
✅ Caption toggle (single control for all captions)
✅ Connection pool optimization

### Next Steps (When User Requests)
See POST_LAUNCH_TODO.md for full list:
- Stripe integration for premium subscriptions
- Profile enhancements
- Admin panel
- Performance optimizations

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

**Created:** November 12, 2025
**Author:** Claude Code
**Purpose:** Onboarding document for future Claude sessions
