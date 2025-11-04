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

## LIKELY FIX DEPLOYED ✅

### The Issue (Root Cause)
The `auth_user_id` column in our users table is defined as `UUID` type, but the backend was passing the JWT `sub` field (a string) directly without converting it to a UUID object.

PostgreSQL was rejecting the insert, causing a 500 error.

### The Fix
**Commit:** `801f7fc` - "Fix critical auth issues - add /me endpoint, improve UX, better error handling"

Changes made:
1. **Added explicit UUID conversion** - Converts `auth_user_id` string to `uuid.UUID` object before database insert
2. **Added comprehensive logging** - Every step now logs with colored emoji indicators (🔵🟢🔴🟡)
3. **Better error handling** - Full tracebacks are now printed to Vercel logs
4. **Database rollback** - Prevents partial commits if profile creation fails

### Next Steps
1. Wait for backend deployment (~2-3 min)
2. Delete test user from Supabase Auth (if exists)
3. Delete from our users table: `DELETE FROM users WHERE email = 'jeanpaulwilson@gmail.com';`
4. Sign up fresh with Gmail
5. Check Vercel backend logs for the new colored logging (🔵🟢🔴🟡)
6. Profile should now be created successfully!

---
**Last Updated:** 2025-11-04 2:14 PM CST
**Status:** Waiting for deployment
