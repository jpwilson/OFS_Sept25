# Our Family Socials (OFS) - Project Context

**Last Updated**: December 2024

---

## Vision & Core Concept

A curated social network for trusted friends and family to share rich, detailed life experiences - from vacations and weddings to DIY projects - in a magazine-style format with proper context, timeline, and geographic information.

### The Problem
Current social platforms lack:
- Proper contextualization of photos with narrative
- Timeline and geographic mapping
- Magazine/blog-style layout where images are inline with relevant text
- Ability to create detailed, multi-day event stories

### The Solution
A platform for detailed, structured event stories with rich content, timeline, locations, and curated sharing to trusted circles.

---

## Current Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite |
| Backend | FastAPI (Python) |
| Database | PostgreSQL on Supabase |
| Auth | Supabase Auth |
| Hosting | Vercel (frontend + backend serverless) |
| Payments | Stripe |
| Email | Resend API |
| Images | Cloudinary |

---

## Features Implemented

### Authentication & Users
- Supabase Auth (email/password)
- User profiles (username, display name, avatar, banner)
- Follow/follower system with approval
- Close Family designation
- Email verification

### Subscription System
- 30-day free trial
- Stripe payments ($9/mo annual, $12/mo monthly)
- Free: 5 events max | Premium: Unlimited
- Subscription management UI

### Events
- Rich text editor (Tiptap) with inline images
- Cover images, captions
- Multi-location support with maps
- Categories: Birthday, Anniversary, Vacation, etc.
- Privacy: Public, Followers, Close Family, Custom Group, Private
- Draft/publish workflow, soft delete with restore
- Temporary share links

### Feed & Discovery
- Filtering (All/Following/My Events, Category, Date)
- User search with follow
- 1/2/3 column layouts
- Sorted by event date (most recent first)

### Social Features
- Comments, likes, view counts
- Follow requests (approve/reject)

### Sharing
- **Sharing page**: Manage followers, requests, invitations
- Invite non-users via email
- Temporary share links with expiration
- Custom groups

### Notifications (Email)
- New follower, comment, shared event, new event from followed user
- User preference controls
- Rate limiting

### Profile
- Published/Drafts/Shared Links/Trash tabs
- Edit settings

### Maps
- Event locations on map
- Location autocomplete
- GPS extraction from photos

---

## Key Database Tables

`users`, `events`, `content_blocks`, `event_images`, `event_locations`, `follows`, `comments`, `likes`, `custom_groups`, `share_tokens`, `invited_viewers`

**Cascade deletes**: User deletion cascades to all related data.

---

## Recent Changes (Dec 2024)

- **Sharing simplification**: Removed "Invited Viewer" concept - just "Followers" now
- **New Sharing page**: Table with followers, pending requests, invitations
- **Feed defaults**: 3 columns, sorted by event date, clickable search results
- **Event defaults**: Privacy = Followers, Category = Daily Life
- **Cascade deletes**: Easy user deletion via SQL

---

## File Structure

```
/backend/app/api/      # Routes (events, users, auth, etc.)
/backend/app/models/   # SQLAlchemy models
/frontend/src/pages/   # React pages
/frontend/src/components/
```

---

## For AI Assistants

1. Read this file first
2. Check recent commits: `git log --oneline -20`
3. React frontend + FastAPI backend
4. Database: PostgreSQL on Supabase
5. See `REQUIREMENTS.md` for original requirements, `DESIGN_DECISION.md` for design choices
