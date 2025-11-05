# Auth Debug Tracking Document
**DELETE THIS FILE ONCE SUPABASE AUTH IS WORKING**

## Problem Statement
Users can sign up with Supabase Auth successfully, but cannot log in. The "Success! Welcome back" message appears but the header still shows "Login" instead of "Profile".

## Root Cause (Confirmed)
Backend endpoint `/api/v1/auth/supabase/create-profile` returns 500 error, preventing profile creation in our users table.

## What We've CONFIRMED (Don't Check Again)

### Environment Variables ✅
**Backend (Vercel - ofs-sept25):**
- DATABASE_URL: postgresql://postgres.vrquvdzoelvmwsxixqkt:... (Supabase) ✅
- SUPABASE_JWT_SECRET: Set correctly (Legacy JWT Secret from Supabase) ✅
- CORS_ORIGINS: https://ofs-sept25-frontend.vercel.app,http://localhost:5173 ✅
- SECRET_KEY: Set ✅

**Frontend (Vercel - ofs-sept25-frontend):**
- VITE_SUPABASE_URL: https://vrquvdzoelvmwsxixqkt.supabase.co ✅
- VITE_SUPABASE_ANON_KEY: Set correctly (from Supabase API settings) ✅
- VITE_API_URL: https://ofs-sept25.vercel.app ✅

### Supabase Configuration ✅
- Site URL: https://ofs-sept25-frontend.vercel.app ✅
- Redirect URLs: https://ofs-sept25-frontend.vercel.app/** ✅
- Email confirmation: Working (users receive and can click confirmation emails) ✅

### Code Flow ✅
1. User fills signup form with username, email, password ✅
2. Frontend calls `supabase.auth.signUp()` with user_metadata containing username ✅
3. Supabase sends confirmation email ✅
4. User clicks email link → redirects to `/auth/callback?code=...` ✅
5. AuthCallback page loads and runs ✅
6. Gets Supabase session successfully ✅
7. Extracts username from metadata successfully (e.g., "jpwilson") ✅
8. Tries to call `/api/v1/auth/supabase/create-profile` ❌ **FAILS HERE**

### What Frontend Logs Show
```
🟢 Session found! User: jeanpaulwilson@gmail.com
🔵 Username from metadata: jpwilson
🔵 Display name from metadata: Jean-Paul Wilson
🔵 Calling create-profile API...
🔴 CORS error: No 'Access-Control-Allow-Origin' header
   POST https://ofs-sept25.vercel.app/api/v1/auth/supabase/create-profile
   net::ERR_FAILED 500 (Internal Server Error)
```

### What Backend Logs Show
- Multiple 401 errors from `/api/v1/users/me` (expected - profile doesn't exist yet)
- **NO LOGS** of requests to `/api/v1/auth/supabase/create-profile`
- This means the endpoint is either:
  - Not registered in the FastAPI app
  - Crashing before it can log
  - Being blocked by middleware

## What We NEED to Debug Next

### Priority 1: Backend Crash Details
**Action:** Get detailed error from Vercel backend logs
1. Go to: Vercel → ofs-sept25 (backend) → Logs
2. Filter/search for: `create-profile` or `500` or `error`
3. Find the Python traceback showing WHY it's crashing
4. Screenshot the full error with traceback

### Priority 2: Verify Endpoint Registration
**Action:** Confirm `/api/v1/auth/supabase/create-profile` is registered in FastAPI
- Check: `backend/app/main.py` includes the auth router
- Check: `backend/app/api/auth.py` has the `@router.post("/supabase/create-profile")` endpoint

### Priority 3: Database Connection
**Action:** Verify backend can connect to Supabase PostgreSQL
- The DATABASE_URL is set correctly
- But is the connection actually working?
- Might need to check if the database connection is timing out or being rejected

## Technologies (Standard Stack)
- Frontend: React + Vite → Vercel
- Backend: FastAPI (Python) → Vercel Serverless Functions
- Database: PostgreSQL → Supabase
- Auth: Supabase Auth (built-in)

## REAL ROOT CAUSE FOUND! 🎯

### Issue #1: UUID Conversion ✅ FIXED
The `auth_user_id` was being passed as a string instead of UUID object.
**Status:** Fixed in commit `801f7fc`

### Issue #2: Database Schema Mismatch ⚠️ FIXING NOW
**The REAL problem:** The `hashed_password` column in the database has a `NOT NULL` constraint, but we're trying to insert NULL for Supabase Auth users.

**Error from logs:**
```
psycopg2.errors.NotNullViolation: null value in column "hashed_password" of relation "users" violates not-null constraint
```

**Why this happened:**
- Python model says: `hashed_password = Column(String, nullable=True)`
- Database schema says: `hashed_password NOT NULL`
- When we try to insert NULL for Supabase users → PostgreSQL rejects it

**The Fix:**
Run this SQL in Supabase to allow NULL values:
```sql
ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL;
```

### Issue #3: Database Schema Fixed ✅
**Action taken:** Ran `ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL;`
**Result:** Profile created successfully! User logged in! 🎉

## REMAINING ISSUES ⚠️

### Issue #4: 401 Errors After Login
**Problem:** User can log in and view profile, but gets "User not found" when trying to create events.

**Console shows:** Tons of 401 errors from `/api/v1/users/me` and other endpoints

**Hypothesis:** The user profile might not actually exist in the database, OR the auth_user_id doesn't match between Supabase and our database.

**Actions taken:**
1. Added comprehensive logging to `get_current_user` in deps.py
2. Logs will show:
   - Token validation success/failure
   - Auth user ID from token
   - Database lookup results
   - List of all users with auth_user_id for comparison

**VERIFIED CHECKS (Don't ask again):**
- ✅ SUPABASE_JWT_SECRET in Vercel matches Supabase Legacy JWT Secret (Nov 4, 7:55 PM)
- ✅ User exists in database with auth_user_id: f1bd8581-bbfa-4536-9024-6741f7d42afdb
- ✅ Colored logging works in backend

**ROOT CAUSE FOUND:**
- ❌ Frontend shows "Profile" but localStorage has NO SESSION
- ❌ No access token stored
- ❌ User appears logged in but isn't actually authenticated
- ❌ API calls fail because there's no valid token to send

**The Issue:** Session persistence is broken. After email confirmation, the session is created but not persisted in localStorage.

**Next steps:**
1. Fix session persistence in AuthCallback.jsx
2. Ensure session is properly stored after email confirmation
3. Add session refresh logic

---

## ✅ RESOLVED!

### Final Root Cause
ApiService was looking for `localStorage.getItem('token')` but Supabase stores sessions in `sb-{project}-auth-token` key.

### Fixes Applied
1. **Commit 1b2645b** - Updated ApiService.getAuthHeaders() to get token from Supabase session
2. **Commit 1931439** - Fixed EditProfile to use apiService instead of direct fetch

### Files Fixed
- ✅ `frontend/src/services/api.js` - Now gets token from Supabase session
- ✅ `frontend/src/pages/EditProfile.jsx` - Now uses apiService for uploads

### Verification
- ✅ Login works
- ✅ Event creation works
- ✅ Avatar/banner uploads work
- ✅ All authenticated endpoints work

**See POST_MORTEM_AUTH_MIGRATION.md for full details**

---
**Last Updated:** 2025-11-04 8:15 PM CST
**Status:** ✅ RESOLVED - Delete this file when stable
