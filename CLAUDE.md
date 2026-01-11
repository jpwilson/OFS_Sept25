# Claude Code Instructions for Our Family Socials

**READ THIS FIRST** - This file is automatically loaded at the start of each session.

---

## Quick Context

**Our Family Socials** is a production social network for families at **ourfamilysocials.com**.

- **Stack:** React + FastAPI + PostgreSQL (Supabase) + Stripe + Cloudinary
- **Status:** Live with real users
- **Deployment:** Vercel (auto-deploys from GitHub main branch)

---

## Before You Start Working

1. **Read CURRENT_STATE.md** - Critical patterns, recent work, what NOT to do
2. **Check recent commits:** `git log --oneline -20`
3. **Understand the workflow:** No local database - we test in production

---

## Critical Rules

### Always Do:
- Run `npm run build` in `/frontend` before pushing (catches bundling errors)
- Test in production after deploying (hard refresh: Cmd+Shift+R)
- Revert immediately if something breaks: `git revert HEAD --no-edit && git push`
- Consolidate API calls (Supabase has 5 connection limit)

### Never Do:
- Trust migration files (they're outdated - database truth is in Supabase)
- Use Transaction pooler mode (crashes backend - use Session mode only)
- Push without testing the frontend build first
- Create complex useCallback dependency chains (causes circular deps)

---

## Documentation Map

| File | When to Read |
|------|--------------|
| **CURRENT_STATE.md** | First - onboarding, patterns, recent features |
| **ARCHITECTURE.md** | For system design, data flow, schemas |
| **CHANGELOG.md** | For project history and past decisions |
| **DATABASE_NOTES.md** | For connection pooling details |
| **README.md** | For tech stack overview |

---

## Common Tasks

### Adding a Feature
1. Read relevant existing code first
2. Make changes
3. Run `cd frontend && npm run build`
4. If build passes: `git add . && git commit -m "Description" && git push`
5. Wait 2-3 min for Vercel deploy
6. Test at ourfamilysocials.com
7. If broken: `git revert HEAD --no-edit && git push`

### Database Changes
- Don't modify migration files
- Provide SQL for user to run in Supabase dashboard:
  ```sql
  ALTER TABLE events ADD COLUMN new_field TEXT;
  ```

### Debugging Black Screen / Build Errors
- Usually circular dependencies in React
- Look for "Cannot access X before initialization"
- Simplify hook dependencies, avoid complex useCallback chains

---

## Key File Locations

```
frontend/src/pages/          # Page components (Feed, EventDetail, Profile...)
frontend/src/components/     # Reusable components
frontend/src/services/api.js # All API calls
frontend/src/context/        # AuthContext

backend/app/api/             # API routes
backend/app/models/          # SQLAlchemy models
backend/app/core/            # Config, database, auth
```

---

## When User Asks You to Work

1. Confirm you understand the task
2. Read relevant code files first
3. Plan your approach (use TodoWrite for complex tasks)
4. Implement incrementally
5. Test build before committing
6. Update documentation if patterns change

---

## Questions to Ask User

If unclear about:
- Whether to commit changes (don't commit without permission)
- Which approach to take for ambiguous requirements
- Whether a feature should affect existing behavior

---

**Ready to help!** Ask the user what they'd like to work on.
