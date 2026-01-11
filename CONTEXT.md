# Our Family Socials (OFS) - Project Context

**Production:** ourfamilysocials.com
**Status:** Live with real users
**Last Updated:** January 2026

---

## What Is This?

A private social network for families to share rich, magazine-style life experiences. Think Instagram meets a travel blog, with proper storytelling, timeline, and geographic context.

**Target Users:** Families and close friends who want to document life events (vacations, weddings, milestones) in more depth than typical social media.

---

## Business Model

| Tier | Price | Limits |
|------|-------|--------|
| Free | $0 | 5 published events |
| Premium (Annual) | $9/mo | Unlimited |
| Premium (Monthly) | $12/mo | Unlimited |
| Trial | 30 days free | Full access |

---

## Tech Stack (TL;DR)

- **Frontend:** React + Vite on Vercel
- **Backend:** FastAPI (Python) on Vercel Serverless
- **Database:** PostgreSQL on Supabase
- **Auth:** Supabase Auth
- **Media:** Cloudinary
- **Payments:** Stripe
- **Email:** Resend

---

## Key Features

**Content:** Rich text events with inline images, captions, cover images, multi-location support, categories, GPS extraction from photos

**Social:** Follow system with approval, comments, likes, user profiles, muting

**Privacy:** Public/Followers/Close Family/Custom Group/Private levels, temporary share links

**Discovery:** Feed with layouts and filters, map view, timeline view, search

---

## Documentation Structure

| File | Purpose |
|------|---------|
| **README.md** | Quick start, tech stack, architecture diagram |
| **CURRENT_STATE.md** | Developer onboarding, patterns, recent work |
| **ARCHITECTURE.md** | Detailed system design, data flow, schemas |
| **CHANGELOG.md** | Project history, decisions, lessons learned |
| **DATABASE_NOTES.md** | Connection pooling, schema change process |

---

## For AI Assistants

1. Read **CURRENT_STATE.md** first - critical patterns
2. Check commits: `git log --oneline -20`
3. **Always run `npm run build`** before pushing
4. No local database - test in production
5. Revert fast if broken: `git revert HEAD --no-edit && git push`

---

## Original Vision

> "A curated social network for trusted friends and family to share rich, detailed life experiences - from vacations and weddings to DIY projects - in a magazine-style format with proper context, timeline, and geographic information."

This vision is now realized in production.
