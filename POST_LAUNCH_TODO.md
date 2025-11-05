# Post-Launch TODO List

**Status:** Pre-launch - Complete these after fixing profile edit bug

---

## 🚀 Pre-Launch Blockers

### 1. Fix Profile Edit Bug ⚠️ IN PROGRESS
**Issue:** Can upload avatar/banner but profile changes (full_name, bio) don't persist

**Status:** Debugging with comprehensive logging
- Added frontend logging to EditProfile.jsx
- Added backend logging to users.py update_profile endpoint
- Next: Test and see what logs show

**Testing steps:**
1. Wait for deployment (~2-3 min)
2. Go to /profile/jpwilson/edit
3. Open browser console (F12)
4. Make changes to profile (full name, bio, avatar, banner)
5. Click "Save"
6. Check console for logs
7. Check Vercel backend logs
8. Report what you see

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

### 4. Super Users / Admin Panel
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

### 5. TypeScript Migration
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
2. ⚠️ Fix profile edit bug (IN PROGRESS)
3. ✅ Test event creation (WORKING!)

**After Launch (First Week):**
1. Monitor for bugs
2. Fix any critical issues users report
3. Collect feedback

**After Launch (First Month):**
1. Stripe integration (HIGH - this makes money!)
2. Better freemium limits enforcement
3. Marketing/growth features
4. Super admin panel (for moderation)

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
