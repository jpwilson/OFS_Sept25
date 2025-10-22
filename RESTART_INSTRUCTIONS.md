# ⚠️ CRITICAL: Instructions After Mac Restart

## 🐛 KNOWN ISSUE - MUST FIX FIRST

**Problem**: Database has 20+ events, ALL owned by Sarah Wilson (@sarahw)
**Cause**: Event creation API doesn't respect authorization token - creates all events under logged-in user
**Impact**:
- Michael Chen profile shows 0 events (should show 3)
- Emma Rodriguez profile shows 0 events (should show 3)
- Sarah Wilson profile shows 20+ events (should show 3)

---

## 🚀 STEPS AFTER RESTART

### 1. Start Backend
```bash
cd /Users/jpwilson/Documents/Projects/SGTG/OFS_claude/backend
source venv/bin/activate
python -m uvicorn app.main:app --reload --port 8000
```

### 2. Start Frontend
```bash
cd /Users/jpwilson/Documents/Projects/SGTG/OFS_claude/frontend
npm run dev
```

### 3. Fix Backend Event Creation API (CRITICAL!)

The issue is in `/backend/app/routers/events.py` - the create event endpoint is using the logged-in user's ID instead of respecting who should own the event.

**File to check**: `backend/app/routers/events.py`
**Look for**: `@router.post("/events")`
**Problem**: Likely using `current_user.id` for all events instead of request payload

**Quick Fix Option**:
1. Delete the database file completely
2. Restart backend (will recreate empty DB)
3. Run seed script again

**Database Location**: Check `backend/app/core/database.py` for DB file path

### 4. Alternative: Manual Database Deletion

```bash
cd /Users/jpwilson/Documents/Projects/SGTG/OFS_claude/backend
# Find and delete the SQLite database file
find . -name "*.db" -type f
# Then delete it:
rm ofs.db  # (or whatever it's named)
```

Then restart backend and re-run `reset_and_seed.py`

---

## 📊 WHAT WE ACCOMPLISHED (Before Restart)

### ✅ Phase 1: Map Clustering - COMPLETE
- Installed clustering libraries
- Smart clustering with number badges
- 3 size tiers with different colors
- Zoom-based clustering
- Pulse animations
- Spiderfy effect

### ✅ Phase 2: Enhanced Data - COMPLETE
- Created seed script with 9 events
- 3 events per user
- Geographic diversity for clustering

### ✅ Additional Fixes - COMPLETE
- Event timeline now clickable (links to detail)
- Added zoom button (📍) on timeline items
- Map bounded (no more world repeating)
- Max bounds set to prevent panning beyond Earth

### ❌ Still Broken
- Event attribution (all events owned by Sarah)
- User profiles (Michael and Emma show 0 events)

---

## 📋 NEXT PHASES (Queued for Implementation)

### Phase 3: Follow System
**Files to Create**:
- `backend/app/models/follow.py` - Follow relationship model
- `backend/app/routers/follows.py` - Follow API endpoints
- `frontend/src/components/FollowButton.jsx` - UI component
- `frontend/src/pages/Followers.jsx` - Followers list page

**API Endpoints**:
- POST `/api/v1/users/{username}/follow`
- GET `/api/v1/users/me/followers`
- GET `/api/v1/users/me/following`
- PUT `/api/v1/follow-requests/{id}/accept`
- DELETE `/api/v1/users/{username}/unfollow`

### Phase 4: Privacy & Permissions
**Files to Create**:
- `backend/app/models/circle.py` - Privacy circles
- `backend/app/models/circle_member.py` - Circle membership
- Update `backend/app/models/event.py` - Add visibility field
- `frontend/src/pages/Settings.jsx` - Settings page
- Privacy controls in event creation

**Event Visibility Options**:
- Public (anyone can see)
- Network (followers only)
- Circles (specific groups)
- Private (owner only)

---

## 🗂️ Key Files & Locations

### Backend
- **Models**: `/backend/app/models/`
- **API Routes**: `/backend/app/routers/`
- **Database**: `/backend/app/core/database.py`
- **Main App**: `/backend/app/main.py`

### Frontend
- **Pages**: `/frontend/src/pages/`
- **Components**: `/frontend/src/components/`
- **Mock Data**: `/frontend/src/data/mockEvents.js`
- **Map Component**: `/frontend/src/pages/Map.jsx`

### Scripts
- **Seed Data**: `/backend/seed_data.py` (BROKEN - don't use)
- **Reset & Seed**: `/backend/reset_and_seed.py` (BROKEN - attribution issue)
- **Fix Script**: TBD - need to create proper one

---

## 🔑 Login Credentials (Demo)

All passwords: `password123`

- **Sarah Wilson**
  - Email: sarah@example.com
  - Username: @sarahw

- **Michael Chen**
  - Email: michael@example.com
  - Username: @michaelc

- **Emma Rodriguez**
  - Email: emma@example.com
  - Username: @emmar

---

## ✅ Quick Verification Checklist

After fixing the database issue, verify:

- [ ] Backend running on http://localhost:8000
- [ ] Frontend running on http://localhost:3000
- [ ] API docs accessible at http://localhost:8000/docs
- [ ] Sarah Wilson profile shows 3 events
- [ ] Michael Chen profile shows 3 events
- [ ] Emma Rodriguez profile shows 3 events
- [ ] Map shows 9 total events with clustering
- [ ] Event timeline clickable
- [ ] Map doesn't repeat world
- [ ] Zoom to location button works

---

## 📞 Additional Resources

- **Project Status**: See `PROJECT_STATUS.md` for complete feature list
- **Context**: See `../context.md` for original project vision
- **API Documentation**: http://localhost:8000/docs (when backend running)

---

## 🎯 Priority Tasks (In Order)

1. **FIX EVENT ATTRIBUTION** ← Start here!
2. Verify all 3 users have correct events
3. Test map clustering with 9 events
4. Begin Phase 3: Follow System
5. Implement Phase 4: Privacy/Permissions

Good luck! 🚀
