# Post-Launch TODO List

**Status:** Pre-launch - Domain purchase required before launch

---

## 🚀 Pre-Launch Blockers

### 1. ✅ Fix Profile Edit Bug - COMPLETED
**Issue:** Can upload avatar/banner but profile changes (full_name, bio) don't persist

**Resolution:**
- Fixed upload response parsing (was looking for medium_url, should be url)
- Added banner_url to GET /users/{username} endpoint response
- Profile editing now fully functional:
  - ✅ Full name editing
  - ✅ Bio editing
  - ✅ Avatar upload and display
  - ✅ Banner upload and display

### 2. 🌐 Domain Purchase - REQUIRED FOR LAUNCH
**Priority:** BLOCKING LAUNCH
**Estimated Time:** 15-30 minutes

**Tasks:**
- [ ] Purchase domain from Domain.com (formerly Network Solutions)
- [ ] Configure DNS to point to Vercel:
  - Frontend: CNAME to `cname.vercel-dns.com`
  - Add domain in Vercel project settings
- [ ] Update CORS settings in backend to allow new domain
- [ ] Update environment variables:
  - `VITE_API_URL` in frontend
  - `CORS_ORIGINS` in backend
- [ ] Test SSL certificate auto-provisioning
- [ ] Verify all pages load correctly on new domain

**Suggested domains:**
- ourfamilysocials.com
- familysocials.com
- familyevents.com
- familymemories.com

---

## 📋 Post-Launch Features

### 2. Stripe Integration for Premium Subscriptions
**Priority:** HIGH
**Estimated Time:** 3-5 days

**Tasks:**
- [ ] Set up Stripe account
- [ ] Install Stripe SDK (`npm install @stripe/stripe-js stripe`)
- [ ] Create Stripe products:
  - Premium Monthly ($12/mo)
  - Premium Annual ($9/mo, billed $108/year)
  - Family Plan (TBD pricing)
- [ ] Create checkout page
- [ ] Implement webhook for subscription events
- [ ] Test with Stripe test mode
- [ ] Handle subscription status:
  - Active → Grant premium features
  - Cancelled → Downgrade to free after period ends
  - Failed payment → Send reminder email

**Backend Changes:**
- Add `stripe_customer_id` column to users table
- Add `stripe_subscription_id` column
- Add webhook endpoint: `/api/v1/webhooks/stripe`
- Add subscription management endpoints

**Frontend Changes:**
- Create `/checkout` page with Stripe Elements
- Create `/billing` page to manage subscription
- Add upgrade prompts when free users hit limits
- Show current plan on profile page

**Files to Create:**
- `backend/app/api/stripe_webhooks.py`
- `backend/app/utils/stripe_client.py`
- `frontend/src/pages/Checkout.jsx`
- `frontend/src/pages/Billing.jsx`
- `frontend/src/components/UpgradePrompt.jsx`

---

### 3. Enforce Freemium Limits
**Priority:** MEDIUM
**Estimated Time:** 1 day

**Current Limits (already implemented):**
- ✅ Free users: 5 published events max
- ✅ Backend validation in place
- ✅ Error message shows when limit reached

**Additional Limits to Implement:**
- [ ] Free users: No banner image upload (avatar only)
- [ ] Free users: Basic profile customization only
- [ ] Premium users: Unlimited events
- [ ] Premium users: Full profile customization
- [ ] Premium users: Priority support badge
- [ ] Family plan: 5 users, unlimited events

**Files to Modify:**
- `backend/app/api/users.py` - Add subscription checks
- `frontend/src/pages/EditProfile.jsx` - Show upgrade prompt for banner
- `frontend/src/pages/CreateEvent.jsx` - Better upgrade messaging

---

### 4. GPS Extraction from Uploaded Images
**Priority:** MEDIUM (VERIFY IT'S WORKING)
**Estimated Time:** Testing + minor fixes (30 min)
**Status:** ✅ FULLY IMPLEMENTED - Was broken by 413 error + serialization bug, now fixed

**Implementation Details:**
- ✅ Backend extracts GPS from image EXIF metadata (upload.py)
- ✅ Backend returns GPS data: `{ metadata: { gps: { latitude, longitude }, date_taken: "..." } }`
- ✅ Frontend receives and stores GPS data (RichTextEditor.jsx:92-102)
- ✅ GPS data collected in `gpsLocations` state (CreateEvent.jsx:53)
- ✅ GPS data sent to backend on event creation (CreateEvent.jsx:148)
- ✅ Backend saves GPS locations to event_locations table (events.py:200-229)
  - location_type: 'exif' (distinguishes from 'manual' and 'inline_marker')
  - Includes timestamp from EXIF data
  - Auto-named: "Photo location 1", "Photo location 2", etc.
- ✅ Detail view loads locations (events.py:305)
- ✅ Locations properly serialized (events.py:16-36)

**What Was Broken:**
1. 413 error prevented events from loading (FIXED ✅)
2. Location serialization was broken (FIXED ✅)

**To Test:**
1. Go to Create Event
2. Check "This event has multiple locations"
3. Enable GPS extraction in modal
4. Upload photo with GPS data (e.g., iPhone photo with location services on)
5. Publish event
6. Check event detail page - GPS location should appear on map
7. Check database: `SELECT * FROM event_locations WHERE location_type = 'exif';`

**If Still Not Working:**
- Check browser console for GPS extraction logs
- Check Vercel backend logs for "DEBUG: Saving X GPS-extracted locations"
- Verify image actually has GPS data (many screenshots/edited images don't)

---

### 5. Super Users / Admin Panel
**Priority:** LOW
**Estimated Time:** 3-4 days

**Admin Features Needed:**
- [ ] View all users
- [ ] View all events
- [ ] Delete spam/abusive content
- [ ] Ban users
- [ ] View subscription statistics
- [ ] View revenue metrics (if Stripe integrated)

**Implementation:**
- Add `is_admin` column to users table
- Create `/admin` route (protected)
- Create admin dashboard
- Add admin-only API endpoints

**Files to Create:**
- `backend/app/api/admin.py`
- `frontend/src/pages/Admin.jsx`
- `frontend/src/pages/AdminUsers.jsx`
- `frontend/src/pages/AdminEvents.jsx`
- `frontend/src/components/AdminStats.jsx`

**Who should be admin:**
- Your account (jpwilson)
- Manually set via SQL: `UPDATE users SET is_admin = true WHERE email = 'your@email.com';`

---

### 6. TypeScript Migration
**Priority:** LOW
**Estimated Time:** 2-3 weeks

**Recommendation:** Don't do this until app is stable and revenue-generating

**Why wait:**
- 2-3 weeks is a lot of time
- App is finally working, don't break it
- Focus on features that generate revenue (Stripe)
- TypeScript doesn't make money, features do

**Alternative (Recommended):**
- Write ALL new code in TypeScript (.tsx files)
- Keep existing code as JavaScript
- Gradually convert when you touch old files
- This gives you TypeScript benefits without the migration cost

**If you do migrate:**
- See POST_MORTEM_AUTH_MIGRATION.md for approach
- Do it gradually (file by file)
- Start with services (api.ts, supabaseClient.ts)
- Then components (bottom-up)
- Enable strict mode last

---

## 🎯 Recommended Priority Order

**Before Launch:**
1. ✅ Fix auth (DONE!)
2. ✅ Fix profile edit bug (DONE!)
3. 🌐 Purchase domain (BLOCKING - Do this first!)
4. 🚀 Configure DNS and deploy to custom domain
5. 🧪 Test all features on production domain

**After Launch (First Week):**
1. Monitor for bugs and user issues
2. Fix any critical issues users report
3. Collect user feedback
4. Ensure billing/subscriptions work smoothly

**After Launch (First Month):**
1. **Stripe integration** (HIGH - Start making money! 💰)
2. **Better freemium limits** (MEDIUM - Drive upgrades)
3. **GPS extraction from images** (MEDIUM - Cool feature, user delight)
4. **Super admin panel** (LOW - Only when you need to moderate)

**Later (Month 2+):**
1. TypeScript migration (if still needed)
2. Advanced features based on user feedback
3. Mobile app (React Native?)

---

## 📊 Success Metrics to Track

**User Metrics:**
- Sign ups per day
- Active users (DAU/MAU)
- Events created per user
- Conversion rate (free → premium)

**Revenue Metrics:**
- Monthly Recurring Revenue (MRR)
- Customer Lifetime Value (LTV)
- Churn rate

**Technical Metrics:**
- API response times
- Error rates
- Uptime (goal: 99.9%)

---

## 🔧 Current Tech Stack

**Frontend:**
- React 18
- Vite
- React Router
- CSS Modules
- Supabase Client (for auth)

**Backend:**
- FastAPI (Python)
- PostgreSQL (Supabase)
- SQLAlchemy ORM
- Pydantic (validation)

**Infrastructure:**
- Frontend: Vercel
- Backend: Vercel Serverless
- Database: Supabase PostgreSQL
- Auth: Supabase Auth
- File Storage: Supabase Storage (planned)

**Costs (Current):**
- Vercel: Free tier
- Supabase: Free tier
- **Total: $0/month**

**Costs (After Stripe):**
- Vercel: Free tier (probably)
- Supabase: Free tier (until you hit limits)
- Stripe: 2.9% + $0.30 per transaction
- **Total: Transaction fees only**

---

**Created:** 2025-11-04
**Last Updated:** 2025-11-04 8:30 PM CST
