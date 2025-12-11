# Our Family Socials - Development Status

**Last Updated**: December 2024

This document provides context for AI assistants and developers to quickly understand the current state of the project.

---

## Tech Stack (Production)

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite |
| Backend | FastAPI (Python) |
| Database | PostgreSQL on Supabase |
| Auth | Supabase Auth |
| Hosting | Vercel (frontend + backend serverless) |
| Payments | Stripe |
| Email | Resend API |
| Image Storage | Cloudinary |

---

## Core Features Implemented

### Authentication & Users
- Supabase Auth integration (email/password)
- User profiles with username, display name, avatar, banner
- Follow/follower system with request approval
- Close Family designation for followers
- Email verification flow

### Subscription System (Freemium Model)
- 30-day free trial for new users
- Stripe integration for payments ($9/month annual, $12/month monthly)
- Free tier: 5 published events max
- Premium tier: Unlimited events
- Subscription management and cancellation flow
- Welcome modal after successful subscription

### Events
- Rich text editor (Tiptap) for event content
- Inline image support with captions
- Cover images
- Multi-location support with map
- Categories: Birthday, Anniversary, Vacation, Family Gathering, Holiday, Project, Daily Life, Milestone, Custom
- Privacy levels: Public, Followers, Close Family, Custom Group, Private
- Draft/publish workflow
- Soft delete (trash) with restore
- Event sharing via temporary links

### Feed & Discovery
- Event feed with filtering (All Events, Following, My Events)
- Category filtering
- Date range filtering
- User search with follow functionality
- Multiple card sizes (1, 2, or 3 per row)
- Events sorted by event date (most recent first)
- Collapsible filters with persistence

### Social Features
- Comments on events
- Likes on events
- View counts
- Follow requests (approve/reject)

### Sharing System
- **Sharing page** (formerly Groups): Manage followers, pending requests, sent invitations
- **Invite non-users**: Send email invitations to people not on the platform
- Temporary share links with expiration
- Email sharing with personal messages
- Custom groups for targeted sharing

### Email Notifications
- New follower notifications
- New comment notifications
- Event shared notifications
- New event from followed user notifications
- Trial reminder notifications
- User preference controls for each notification type
- Rate limiting (max 1/day per author for followed events)

### Profile
- Profile page with user info
- Tabs: Published, Drafts, Shared Links, Trash
- Follow/unfollow functionality
- Follower/following counts and lists
- Edit profile settings

### Maps & Location
- Map page showing events with locations
- Location autocomplete (Nominatim)
- GPS extraction from uploaded images
- Multi-location events with timeline navigation

---

## Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| users | User accounts with subscription info |
| events | Event content and metadata |
| content_blocks | Rich text blocks within events |
| event_images | Image metadata and captions |
| event_locations | Multi-location support |
| follows | Follower relationships |
| comments | Event comments |
| likes | Event likes |
| custom_groups | User-defined sharing groups |
| custom_group_members | Group membership |
| share_tokens | Temporary share links |
| invited_viewers | Pending invitations to non-users |

### Important: Cascade Deletes
User deletion cascades to: events, comments, likes, follows, custom_groups, share_tokens, invited_viewers

---

## Recent Changes (December 2024)

### Sharing System Simplification
- Removed separate "Invited Viewer" concept
- Unified model: Everyone is a "Follower"
- Subscription tier determines capabilities, not invitation status
- New Sharing page with followers table (Name, Email, Status, Close Family toggle)
- Invite functionality moved to Sharing page

### Feed Improvements
- Default view changed to 3 events per row
- Events now sorted by event date (not publish date)
- User search results are clickable (link to profile)
- Default privacy for new events: Followers
- Default category: Daily Life

### Database
- Added ON DELETE CASCADE to events, comments, likes foreign keys
- Easy user deletion: `DELETE FROM users WHERE username = 'x'`

---

## Key Files & Structure

```
/backend
  /app
    /api          # API routes (events.py, users.py, auth.py, etc.)
    /models       # SQLAlchemy models
    /services     # Email service, etc.
    /utils        # Privacy filtering, validation
    /core         # Database, config

/frontend
  /src
    /pages        # Main pages (Feed, Profile, CreateEvent, etc.)
    /components   # Reusable components
    /context      # Auth context
    /services     # API service
```

---

## Environment Variables

### Backend (.env)
- `DATABASE_URL` - Supabase PostgreSQL connection
- `SUPABASE_URL`, `SUPABASE_KEY` - Supabase project
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` - Payments
- `RESEND_API_KEY` - Email
- `CLOUDINARY_*` - Image storage

### Frontend (.env)
- `VITE_API_URL` - Backend API URL
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` - Auth

---

## Known Issues / Tech Debt

1. **No soft delete for users** - Currently hard delete with CASCADE
2. **Image upload size** - Limited by Vercel (client-side compression in place)
3. **No admin panel** - User management via SQL

---

## Deployment

- Push to `main` branch triggers Vercel deployment
- Backend and frontend deploy as separate Vercel projects
- Database migrations run manually via Supabase SQL Editor

---

## Testing User Deletion

```sql
-- Delete a test user (cascades all related data)
DELETE FROM users WHERE username = 'testuser';
-- Then delete from Supabase Auth dashboard
```

---

## For AI Assistants

When starting a new session:
1. Read this file for context
2. Check recent commits: `git log --oneline -20`
3. The codebase uses React (frontend) + FastAPI (backend)
4. Database is PostgreSQL on Supabase
5. All API routes are in `/backend/app/api/`
6. All pages are in `/frontend/src/pages/`
