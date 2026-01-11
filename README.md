# Our Family Socials (OFS)

**Production:** [ourfamilysocials.com](https://ourfamilysocials.com)
**Status:** Live with real users
**Last Updated:** January 2026

A private social network for families to share rich, magazine-style life experiences with trusted friends and family.

---

## Quick Links

| Document | Purpose |
|----------|---------|
| [CURRENT_STATE.md](./CURRENT_STATE.md) | Onboarding guide for developers, key patterns, recent work |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, data flow, deployment |
| [CHANGELOG.md](./CHANGELOG.md) | Historical evolution, post-mortems, lessons learned |
| [DATABASE_NOTES.md](./DATABASE_NOTES.md) | Database connection details, pooling configuration |

---

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Frontend** | React 19 + Vite | Deployed to Vercel |
| **Backend** | FastAPI (Python) | Vercel Serverless Functions |
| **Database** | PostgreSQL | Supabase (Session pooler, port 5432) |
| **Auth** | Supabase Auth | JWT-based |
| **File Storage** | Cloudinary | Images and videos |
| **Payments** | Stripe | Subscriptions (trial/monthly/annual) |
| **Email** | Resend API | Transactional notifications |
| **Maps** | Leaflet | With marker clustering |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Vercel CDN                               │
│  ┌─────────────────────┐      ┌─────────────────────────────┐   │
│  │   React Frontend    │      │   FastAPI Backend           │   │
│  │   (Static Assets)   │──────│   (Serverless Functions)    │   │
│  └─────────────────────┘      └──────────────┬──────────────┘   │
└───────────────────────────────────────────────│─────────────────┘
                                                │
        ┌───────────────────────────────────────┼───────────────────┐
        │                                       │                   │
        ▼                                       ▼                   ▼
┌───────────────┐                    ┌─────────────────┐   ┌──────────────┐
│   Supabase    │                    │   Cloudinary    │   │    Stripe    │
│  PostgreSQL   │                    │   (Media CDN)   │   │  (Payments)  │
│  + Auth       │                    └─────────────────┘   └──────────────┘
└───────────────┘
```

---

## Key Features

### Content & Media
- Rich text editor (Tiptap) with inline images
- Multi-image events with captions
- Video support (Cloudinary processing)
- GPS extraction from photo EXIF data
- Cover images and image galleries

### Social
- Follow/follower system with approval workflow
- Comments and likes on events
- Comments and likes on individual images
- User profiles with banners and bios
- User muting

### Privacy & Sharing
- Privacy levels: Public, Followers, Close Family, Custom Group, Private
- Temporary share links with expiration
- Custom groups for organizing followers
- Tag profiles (group profiles for non-users)

### Discovery
- Feed with multiple view layouts (1/2/3 columns)
- Sort by event date or upload date
- Sort direction toggle (newest/oldest first)
- Category and date filtering
- Map view with clustering
- Timeline view
- User search

### Monetization
- 30-day free trial
- Stripe subscriptions ($9/mo annual, $12/mo monthly)
- Free tier: 5 events max
- Premium: Unlimited events

---

## Project Structure

```
OFS_claude/
├── backend/
│   ├── app/
│   │   ├── api/           # 18 API route files
│   │   ├── models/        # 22 SQLAlchemy models
│   │   ├── schemas/       # Pydantic validation
│   │   ├── core/          # Config, database, auth
│   │   ├── services/      # Email service
│   │   └── utils/         # Helpers (slug, cleanup, etc.)
│   ├── requirements.txt
│   └── vercel.json        # Serverless config
│
├── frontend/
│   ├── src/
│   │   ├── pages/         # 47+ page components
│   │   ├── components/    # 49+ reusable components
│   │   ├── context/       # AuthContext
│   │   ├── services/      # API client
│   │   ├── hooks/         # Custom hooks
│   │   ├── extensions/    # Tiptap extensions
│   │   └── utils/         # Utilities
│   ├── package.json
│   └── vite.config.js
│
└── *.md                   # Documentation
```

---

## Development Workflow

### Critical Pattern: No Local Database

We test directly in production. There is no local development database.

```bash
# 1. Make changes

# 2. Test frontend builds (catches bundling errors)
cd frontend && npm run build

# 3. If build succeeds, commit and push
git add . && git commit -m "Description" && git push

# 4. Wait 2-3 minutes for Vercel deploy

# 5. Test at ourfamilysocials.com (hard refresh: Cmd+Shift+R)

# 6. If broken, revert immediately
git revert HEAD --no-edit && git push
```

### Why This Workflow?

1. **Supabase free tier** has limited connections (5 max)
2. **No local PostgreSQL** - database is only on Supabase
3. **Vercel auto-deploys** from GitHub main branch
4. **Fast iteration** - push → deploy → test cycle is ~3 minutes

---

## Database Notes

**Connection:** PostgreSQL on Supabase (Session pooler, port 5432)

**Critical:**
- Max 5 concurrent connections on free tier
- Use Session mode ONLY (Transaction mode crashes backend)
- Consolidate API calls to minimize connections
- No migration files - schema changes via SQL in Supabase dashboard

**Schema changes:** Provide SQL for user to run in Supabase SQL editor:
```sql
ALTER TABLE events ADD COLUMN new_field TEXT;
```

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Black screen | Circular dependency in React | Run `npm run build` locally first |
| "Cannot access X before initialization" | Vite bundling error | Avoid complex useCallback dependencies |
| MaxClientsInSessionMode | Too many DB connections | Consolidate API calls |
| Python process exited | Transaction pooler mode | Use Session mode (port 5432) |

---

## API Endpoints (Key Routes)

| Route Group | Purpose |
|-------------|---------|
| `/api/v1/auth` | Authentication (Supabase integration) |
| `/api/v1/events` | Event CRUD, drafts, publish |
| `/api/v1/users` | Profiles, follow system |
| `/api/v1/comments` | Event comments |
| `/api/v1/likes` | Event likes |
| `/api/v1/upload` | Image/video upload |
| `/api/v1/locations` | Event locations |
| `/api/v1/custom-groups` | Sharing groups |
| `/api/v1/share-links` | Temporary share links |
| `/api/v1/stripe` | Subscription webhooks |
| `/api/v1/media-engagement` | Image/video likes & comments |
| `/api/v1/tag-profiles` | Group profiles |
| `/api/v1/relationships` | User relationships |

---

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=https://your-backend.vercel.app
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

### Backend
Set in Vercel Environment Variables:
- `DATABASE_URL` - Supabase PostgreSQL connection string
- `SUPABASE_URL`, `SUPABASE_KEY` - Supabase credentials
- `CLOUDINARY_*` - Cloudinary credentials
- `STRIPE_*` - Stripe keys and webhook secret
- `RESEND_API_KEY` - Email service

---

## For New Developers

1. **Read [CURRENT_STATE.md](./CURRENT_STATE.md)** - Critical patterns and recent work
2. **Check recent commits:** `git log --oneline -20`
3. **Understand the testing workflow** - No local dev, test in prod
4. **Run `npm run build` before pushing** - Catches bundling errors
5. **Ask questions** - Don't assume requirements

---

## License

Private project - not open source.
