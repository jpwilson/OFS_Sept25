# Our Family Socials - Project Status
**Last Updated**: 2025-10-17
**Status**: Phase 1 & 2 Complete, Phase 3 & 4 Pending

---

## ✅ COMPLETED FEATURES

### Phase 1: Map Clustering
- ✅ Installed `leaflet.markercluster` and `react-leaflet-markercluster`
- ✅ Smart clustering based on zoom level
- ✅ Number badges on clusters (shows count)
- ✅ Three size tiers: small (<10), medium (10-99), large (100+)
- ✅ Different colors for cluster sizes (purple → pink for large)
- ✅ Pulse animation on clusters
- ✅ Spiderfy effect when clusters are clicked
- ✅ Clusters break apart as you zoom in
- ✅ Individual markers visible at zoom level 15+

### Phase 2: Enhanced Test Data
- ✅ Updated `seed_data.py` with 9 events (3 per user)
- ✅ Each user has multiple events for testing
- ✅ Events spread across globe for clustering demo

### Additional Fixes
- ✅ Event timeline now clickable (links to event detail)
- ✅ Added zoom button on timeline thumbnails (📍)
- ✅ Map bounded to prevent world repetition
- ✅ Set `maxBounds`, `maxBoundsViscosity`, and `minZoom`
- ✅ Event routing fixed (IDs match between feed and detail)
- ✅ All mock data coherent and matches database

---

## 🐛 CURRENT ISSUES (CRITICAL - FIX BEFORE RESTART)

### Issue #1: All Events Owned by Sarah Wilson
**Problem**: Database has 20 events, ALL attributed to @sarahw
- Seed script ran multiple times
- Authentication tokens weren't properly passed
- Michael Chen and Emma Rodriguez have 0 events each

**Root Cause**: In `seed_data.py`, the user authentication context wasn't switching properly when creating events for different users.

**Fix Required**:
1. Delete all existing events
2. Fix seed script authentication
3. Re-run with proper user tokens

### Issue #2: Profile Pages Show No Events
**Problem**: Michael Chen's profile shows "0 events" even though events exist
**Cause**: All events belong to Sarah, so filtering by username shows nothing

**Fix**: Same as Issue #1 - need to properly attribute events to correct users

---

## 📋 NEXT PHASES (NOT YET STARTED)

### Phase 3: Follow System

#### Database Models Needed
Create new model: `app/models/follow.py`
```python
class Follow(Base):
    __tablename__ = "follows"

    id = Column(Integer, primary_key=True)
    follower_id = Column(Integer, ForeignKey("users.id"))
    following_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String)  # 'pending', 'accepted', 'declined'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
```

#### API Endpoints Needed
- `POST /api/v1/users/{username}/follow` - Request to follow
- `GET /api/v1/users/me/followers` - List followers
- `GET /api/v1/users/me/following` - List following
- `GET /api/v1/users/me/follow-requests` - Pending requests
- `PUT /api/v1/follow-requests/{id}/accept` - Accept request
- `PUT /api/v1/follow-requests/{id}/decline` - Decline request
- `DELETE /api/v1/users/{username}/unfollow` - Unfollow
- `DELETE /api/v1/users/{username}/remove-follower` - Remove follower

#### Frontend Components Needed
- Follow button on profile pages
- Follower/Following lists page
- Follow request notifications
- Follow status indicators

### Phase 4: Privacy & Permissions

#### Database Models Needed
1. **Circles** (`app/models/circle.py`)
```python
class Circle(Base):
    __tablename__ = "circles"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)  # "Close Family", "Friends", etc.
    created_at = Column(DateTime)
```

2. **Circle Members** (`app/models/circle_member.py`)
```python
class CircleMember(Base):
    __tablename__ = "circle_members"

    circle_id = Column(Integer, ForeignKey("circles.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
```

3. **Event Permissions** (add to Event model)
```python
visibility = Column(String)  # 'public', 'network', 'circles', 'private'
circle_id = Column(Integer, ForeignKey("circles.id"), nullable=True)
```

#### API Endpoints Needed
- `POST /api/v1/circles` - Create circle
- `GET /api/v1/circles` - List user's circles
- `PUT /api/v1/circles/{id}` - Update circle
- `POST /api/v1/circles/{id}/members` - Add members
- `DELETE /api/v1/circles/{id}/members/{user_id}` - Remove member
- `PUT /api/v1/events/{id}/permissions` - Set event visibility
- `PUT /api/v1/users/me/settings/default-visibility` - Default setting

#### Frontend Components Needed
- Settings page (`/settings`)
- Privacy controls in event create/edit
- Circle management UI
- Visibility indicators on events
- Blocked users list

---

## 🔧 IMMEDIATE ACTION ITEMS (BEFORE RESTART)

1. **Create Database Reset Script** (`reset_and_seed.py`)
2. **Fix Seed Script** - Ensure proper user attribution
3. **Create This Status Document** ✅
4. **Document How to Resume Work**

---

## 🚀 HOW TO RESUME AFTER RESTART

### Step 1: Start Backend
```bash
cd /Users/jpwilson/Documents/Projects/SGTG/OFS_claude/backend
source venv/bin/activate
python -m uvicorn app.main:app --reload --port 8000
```

### Step 2: Start Frontend
```bash
cd /Users/jpwilson/Documents/Projects/SGTG/OFS_claude/frontend
npm run dev
```

### Step 3: Reset Database (CRITICAL)
```bash
cd /Users/jpwilson/Documents/Projects/SGTG/OFS_claude/backend
source venv/bin/activate
python reset_and_seed.py
```

### Step 4: Verify
- Visit http://localhost:3000
- Check Michael Chen's profile - should have 3 events
- Check Emma Rodriguez's profile - should have 3 events
- Check Sarah Wilson's profile - should have 3 events (not 20!)

### Step 5: Continue with Phase 3
- Implement Follow system database models
- Build Follow API endpoints
- Add Follow UI to profiles

---

## 📊 CURRENT STATE

### Users
- ✅ Sarah Wilson (@sarahw) - email: sarah@example.com, pw: password123
- ✅ Michael Chen (@michaelc) - email: michael@example.com, pw: password123
- ✅ Emma Rodriguez (@emmar) - email: emma@example.com, pw: password123

### Events (AFTER FIX SCRIPT RUNS)
**Sarah Wilson (3 events):**
1. Africa Adventure 2025 - South Africa
2. Japanese Cherry Blossom Journey - Tokyo & Kyoto
3. Grandma's 90th Birthday Celebration - Boston

**Michael Chen (3 events):**
1. Kitchen Renovation Complete - Portland, OR
2. Baby's First Year - Portland, OR
3. Cross-Country Road Trip - USA Coast to Coast

**Emma Rodriguez (3 events):**
1. Emma & James Wedding - Napa Valley, CA
2. Iceland Northern Lights Adventure - Reykjavik
3. Backyard Garden Transformation - San Diego, CA

### Technology Stack
- **Frontend**: React + Vite, React Router, Leaflet Maps
- **Backend**: FastAPI + Python, SQLAlchemy ORM
- **Database**: PostgreSQL (via SQLAlchemy)
- **Map Libraries**: Leaflet, react-leaflet, leaflet.markercluster

### File Locations
- Backend: `/Users/jpwilson/Documents/Projects/SGTG/OFS_claude/backend`
- Frontend: `/Users/jpwilson/Documents/Projects/SGTG/OFS_claude/frontend`
- Database Models: `/backend/app/models/`
- API Routes: `/backend/app/routers/`
- React Components: `/frontend/src/components/`
- React Pages: `/frontend/src/pages/`

---

## 📝 NOTES
- Backend runs on port 8000
- Frontend runs on port 3000
- API docs available at http://localhost:8000/docs
- All passwords are `password123` (demo only!)
- Map clustering works best with 50+ events spread globally
