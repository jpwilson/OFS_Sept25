# Supabase Auth Migration Plan

## Overview
Replace custom JWT authentication with Supabase Auth to get:
- ✅ Built-in email verification
- ✅ Built-in password reset/recovery
- ✅ Secure token management
- ✅ OAuth providers (future: Google, Facebook, etc.)
- ✅ Better security practices

## Current System (To Replace)
- **Backend:** python-jose generates JWT tokens
- **Backend:** passlib/bcrypt for password hashing
- **Database:** users.hashed_password stores passwords
- **Frontend:** Custom login/register with manual token storage
- **No email verification**
- **No password recovery**

## New System (Supabase Auth)
- **Supabase:** Manages auth.users table (built-in, managed by Supabase)
- **Supabase:** Generates and validates JWT tokens
- **Supabase:** Sends verification emails, password reset emails
- **Backend:** Validates Supabase JWT, links to profile data
- **Database:** users table becomes profile table, no passwords
- **Frontend:** Supabase JS client for auth

## Architecture Design

### Database Schema Changes

```sql
-- Add to users table
ALTER TABLE users ADD COLUMN auth_user_id UUID UNIQUE;
ALTER TABLE users DROP COLUMN hashed_password; -- Will remove after migration

-- Link to Supabase auth.users
-- auth_user_id references auth.users(id) in Supabase
```

### Data Flow

**Sign Up:**
1. Frontend calls `supabase.auth.signUp({ email, password })`
2. Supabase creates user in auth.users, sends verification email
3. Supabase returns session with JWT
4. Frontend creates profile in our users table with auth_user_id
5. User verifies email via link

**Sign In:**
1. Frontend calls `supabase.auth.signInWithPassword({ email, password })`
2. Supabase validates credentials, returns session
3. Frontend stores session (handled by Supabase client)
4. Backend validates JWT from Supabase

**Password Reset:**
1. User clicks "Forgot Password"
2. Frontend calls `supabase.auth.resetPasswordForEmail(email)`
3. Supabase sends reset link to email
4. User clicks link, redirected to reset page
5. Frontend calls `supabase.auth.updateUser({ password })`

**Backend Token Validation:**
1. Frontend sends Supabase JWT in Authorization header
2. Backend validates JWT using Supabase public key
3. Backend extracts auth_user_id from JWT
4. Backend queries our users table by auth_user_id

## Migration Steps

### Phase 1: Backend Changes
1. Add auth_user_id column to users table
2. Install Supabase Python library (already installed)
3. Create new auth middleware to validate Supabase JWTs
4. Keep old JWT middleware for backward compatibility during migration
5. Add new register endpoint that works with Supabase

### Phase 2: Frontend Changes
1. Install @supabase/supabase-js
2. Create Supabase client with project URL and anon key
3. Replace AuthContext to use Supabase Auth
4. Update login/signup pages to use Supabase methods
5. Add password recovery UI
6. Add email verification UI

### Phase 3: Email Configuration
1. Configure Supabase email templates (signup, reset)
2. Set up custom SMTP (optional, later)
3. Test email flows

### Phase 4: Migration & Cleanup
1. Migrate existing users to Supabase (optional - or start fresh)
2. Remove old auth endpoints
3. Remove hashed_password column
4. Remove python-jose, passlib dependencies

## Username vs Handle Consideration

**Current:** username serves as both display name and @handle

**Proposed:**
- **username:** Display name (can be changed, "Sarah Wilson")
- **handle:** Unique @handle (cannot be changed, "@sarahw")
- Benefits: Users can update their display name without breaking @mentions

**Implementation:**
```sql
ALTER TABLE users RENAME COLUMN username TO handle;
ALTER TABLE users ADD COLUMN display_name TEXT;
-- Keep handle unique and immutable
-- display_name can be changed anytime
```

## Risks & Mitigations

**Risk:** Breaking existing sessions during migration
**Mitigation:** Support both old and new auth during transition

**Risk:** Email delivery issues
**Mitigation:** Test thoroughly, use Supabase default SMTP first

**Risk:** Users losing access if emails don't match
**Mitigation:** Keep old auth working temporarily, provide migration path

## Testing Checklist

- [ ] Sign up new user with email verification
- [ ] Sign in with verified email
- [ ] Password reset flow (request → email → reset → sign in)
- [ ] Token validation on backend
- [ ] Protected routes still work
- [ ] Demo accounts still accessible
- [ ] Freemium limits still enforced
- [ ] All existing API endpoints still work

## Timeline Estimate

- Backend changes: 2-3 hours
- Frontend changes: 2-3 hours
- Email setup & testing: 1 hour
- Total: ~6 hours

## Next Steps

1. Enable Supabase Auth in Supabase dashboard
2. Get Supabase project URL and anon key
3. Configure email settings in Supabase
4. Implement backend token validation
5. Update frontend auth flow
6. Test thoroughly with demo accounts
