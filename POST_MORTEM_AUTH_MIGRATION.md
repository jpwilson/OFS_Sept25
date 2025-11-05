# Post-Mortem: Supabase Auth Migration Issues

**Date:** 2025-11-04
**Status:** ✅ RESOLVED
**Duration:** 4 days of debugging

---

## Executive Summary

After 4 days of debugging, we discovered that Supabase Auth users could not perform authenticated actions (create events, upload avatars) despite successfully logging in. The root cause was **incomplete migration** from legacy JWT auth to Supabase Auth.

---

## What Went Wrong

### The Problem
- ✅ Users could sign up with Supabase Auth
- ✅ Users could log in and see their profile
- ❌ Users could NOT create events (403 Forbidden)
- ❌ Users could NOT upload avatar/banner images (403 Forbidden)

### Root Cause
**Incomplete migration from legacy auth to Supabase Auth.**

#### Legacy Auth System (Original):
```javascript
// Stored token like this:
localStorage.setItem('token', 'jwt_token_here')

// Retrieved like this:
const token = localStorage.getItem('token')
```

#### Supabase Auth System (New):
```javascript
// Stores session in a project-specific key:
localStorage key: 'sb-vrquvdzoelvmwsxixqkt-auth-token'

// Retrieved like this:
const { data: { session } } = await supabase.auth.getSession()
const token = session.access_token
```

### What We Migrated ✅
1. **AuthContext** - Updated to use Supabase Auth
2. **Login/Signup pages** - Now use Supabase
3. **Backend** - Validates Supabase JWT tokens
4. **Email confirmation flow** - Uses Supabase email templates

### What We MISSED ❌
1. **ApiService** (`frontend/src/services/api.js`)
   - Still looked for `localStorage.getItem('token')`
   - Sent requests WITHOUT Authorization header for Supabase users
   - Result: Backend returned 403 Forbidden

2. **EditProfile** (`frontend/src/pages/EditProfile.jsx`)
   - Direct fetch call with `localStorage.getItem('token')`
   - Avatar/banner uploads would fail for Supabase users

---

## Timeline of Debugging

### Day 1-2: "Why can't users sign up?"
- Issue: Email confirmation wasn't creating user profiles
- Found: Database `hashed_password` column had NOT NULL constraint
- Fixed: Ran `ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL;`

### Day 3: "Why do logged-in users get 403 errors?"
- Issue: Users appeared logged in but API calls failed
- Discovered: Frontend was NOT sending Authorization header
- Root cause: ApiService looking for wrong localStorage key

### Day 4: "Are there other places with this bug?"
- Searched codebase for `localStorage.getItem('token')`
- Found EditProfile.jsx had same issue
- Fixed both files

---

## The Fixes

### Fix #1: ApiService (Commit: 1b2645b)
**File:** `frontend/src/services/api.js`

**Before:**
```javascript
getAuthHeaders() {
  const token = localStorage.getItem('token')  // ❌ WRONG
  return {
    'Authorization': `Bearer ${token}`
  }
}
```

**After:**
```javascript
async getAuthHeaders() {
  // Get Supabase session first
  const { data: { session } } = await supabase.auth.getSession()

  if (session?.access_token) {
    return {
      'Authorization': `Bearer ${session.access_token}`  // ✅ CORRECT
    }
  }

  // Fallback to legacy for demo accounts
  const legacyToken = localStorage.getItem('token')
  return {
    'Authorization': `Bearer ${legacyToken}`
  }
}
```

**Impact:** Fixed event creation, drafts, trash, follow requests, comments, likes, etc.

---

### Fix #2: EditProfile (Commit: 1931439)
**File:** `frontend/src/pages/EditProfile.jsx`

**Before:**
```javascript
const response = await fetch('/api/v1/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`  // ❌ WRONG
  },
  body: formData
})
```

**After:**
```javascript
// Use apiService which handles Supabase auth correctly
const file = new File([croppedBlob], 'image.jpg', { type: 'image/jpeg' })
const data = await apiService.uploadImage(file)  // ✅ CORRECT
```

**Impact:** Fixed avatar and banner image uploads for Supabase users.

---

## Why This Happened

### Classic Migration Anti-Pattern

1. **Started with legacy system** → All code used `localStorage.getItem('token')`
2. **Migrated auth provider** → Updated AuthContext to Supabase
3. **Partial refactoring** → Some components updated, others left behind
4. **Silent failures** → No errors during login, only when using authenticated features

### Why It Was Hard to Find

1. **Login appeared to work** - Users saw "Profile" in header
2. **Session existed** - Supabase stored it correctly
3. **No console errors** - Just 403 responses
4. **Backend validated tokens correctly** - The issue was frontend not SENDING them

---

## Lessons Learned

### For Future Migrations

1. **Search for all references** before migration
   ```bash
   grep -r "localStorage.getItem('token')" frontend/src/
   ```

2. **Create abstraction layers**
   - Never access localStorage directly in components
   - Always use a centralized auth service

3. **Add migration tests**
   - Test authenticated actions (create, update, delete)
   - Don't just test login/logout

4. **Use TypeScript**
   - Would have caught the async getAuthHeaders() change

### Code Smell Checklist

When migrating auth, check:
- [ ] All `localStorage.getItem('token')` references
- [ ] All `localStorage.getItem('user')` references
- [ ] All direct `fetch()` calls with Authorization headers
- [ ] All API service methods
- [ ] All image upload handlers
- [ ] All form submissions that need auth

---

## Verification

### How to Test Supabase Auth Works:

1. **Sign up:**
   - Go to /signup
   - Enter email, password, username, display name
   - Confirm email
   - Should redirect to /feed with "Profile" showing

2. **Create Event:**
   - Go to /create
   - Fill in event details
   - Click "Publish Event"
   - Should succeed ✅

3. **Upload Avatar:**
   - Go to /profile/[username]/edit
   - Click avatar upload
   - Select image and crop
   - Should upload successfully ✅

4. **Follow Users:**
   - Go to another user's profile
   - Click "Follow"
   - Should work ✅

---

## Final Status

### ✅ Fixed
- User signup and email confirmation
- Event creation
- Avatar/banner uploads
- Follow requests
- Comments and likes
- All authenticated API endpoints

### ⚠️ Known Issues
- 403 errors on `/follow-requests/count` (separate issue - follows table may not exist in production)

### 🎯 Delete These Files When Auth is Stable
- `AUTH_DEBUG_TRACKING.md`
- `POST_MORTEM_AUTH_MIGRATION.md` (this file)

---

**Authored by:** Claude Code
**With assistance from:** JPWilson (user testing and debugging)
