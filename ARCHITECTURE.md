# System Architecture

Detailed technical architecture for Our Family Socials.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              VERCEL PLATFORM                                 │
│                                                                             │
│  ┌────────────────────────────┐    ┌────────────────────────────────────┐  │
│  │     FRONTEND (React)       │    │      BACKEND (FastAPI)             │  │
│  │                            │    │                                    │  │
│  │  - Static SPA assets       │───▶│  - Serverless Python functions     │  │
│  │  - CDN-distributed         │    │  - /api/v1/* routes                │  │
│  │  - Auto SSL                │    │  - JWT validation                  │  │
│  │                            │    │  - Business logic                  │  │
│  └────────────────────────────┘    └─────────────┬──────────────────────┘  │
│                                                  │                          │
└──────────────────────────────────────────────────│──────────────────────────┘
                                                   │
                    ┌──────────────────────────────┼──────────────────────────┐
                    │                              │                          │
                    ▼                              ▼                          ▼
           ┌───────────────┐            ┌─────────────────┐          ┌──────────────┐
           │   SUPABASE    │            │   CLOUDINARY    │          │    STRIPE    │
           │               │            │                 │          │              │
           │ - PostgreSQL  │            │ - Image CDN     │          │ - Payments   │
           │ - Auth        │            │ - Video process │          │ - Webhooks   │
           │ - Session pool│            │ - Transforms    │          │ - Subs mgmt  │
           └───────────────┘            └─────────────────┘          └──────────────┘
                    │
                    ▼
           ┌───────────────┐
           │    RESEND     │
           │               │
           │ - Email API   │
           │ - Templates   │
           └───────────────┘
```

---

## Frontend Architecture

### Technology Stack
- **React 19.1.1** - UI library
- **Vite** - Build tool and dev server
- **React Router v7** - Client-side routing
- **CSS Modules** - Scoped styling
- **Tiptap** - Rich text editor
- **Leaflet** - Map rendering
- **yet-another-react-lightbox** - Image galleries

### State Management
```
AuthContext (global)
├── user object
├── token
├── login/logout functions
└── isAuthenticated

Local state (per component)
├── useState for UI state
├── useEffect for data fetching
└── useMemo for computed values
```

### Key Components

```
src/
├── App.jsx                 # Routes, AuthContext provider
├── main.jsx               # React DOM entry point
│
├── context/
│   └── AuthContext.jsx    # Global auth state
│
├── services/
│   └── api.js             # All API calls (single file, ~800 lines)
│
├── pages/                 # Route components (47+)
│   ├── Feed.jsx           # Main feed with filters
│   ├── EventDetail.jsx    # Event view with images, comments
│   ├── CreateEvent.jsx    # Rich editor, image upload
│   ├── Profile.jsx        # User profile with tabs
│   └── ...
│
├── components/            # Reusable (49+)
│   ├── Header.jsx         # Navigation, Quick Add
│   ├── EventFilters.jsx   # Sort, filter controls
│   ├── ImageGallery.jsx   # Lightbox wrapper
│   └── ...
│
└── extensions/            # Tiptap plugins
    └── ImageWithCaption/  # Custom image node
```

### Data Flow: Event Creation

```
1. User opens CreateEvent.jsx
   └── useState initializes form fields

2. User adds images via Tiptap editor
   └── Upload triggered → api.uploadImage()
       └── POST /api/v1/upload/image
           └── Cloudinary upload
               └── Returns URL + metadata (GPS, EXIF)

3. User submits form
   └── api.createEvent(eventData)
       └── POST /api/v1/events
           └── Create Event record
           └── Extract images from HTML content
           └── Create EventImage records
           └── Save locations (manual + GPS-extracted)

4. Redirect to EventDetail
   └── api.getEvent(id)
       └── GET /api/v1/events/{id}
           └── Returns event + images + locations + comments
```

---

## Backend Architecture

### Technology Stack
- **FastAPI** - Web framework
- **SQLAlchemy 2.0** - ORM
- **Pydantic 2.5** - Validation
- **Python 3.11** - Runtime (Vercel serverless)

### Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app, CORS, route registration
│   │
│   ├── api/                 # Route handlers (18 files)
│   │   ├── auth.py          # /auth/* - Supabase integration
│   │   ├── events.py        # /events/* - CRUD, publish, restore
│   │   ├── users.py         # /users/* - Profiles, follow
│   │   ├── comments.py      # /comments/*
│   │   ├── likes.py         # /likes/*
│   │   ├── upload.py        # /upload/* - Cloudinary
│   │   ├── locations.py     # /locations/*
│   │   ├── custom_groups.py # /custom-groups/*
│   │   ├── share_links.py   # /share-links/*
│   │   ├── stripe_api.py    # /stripe/* - Webhooks
│   │   ├── email_api.py     # /email/*
│   │   ├── media_engagement.py
│   │   ├── tag_profiles.py
│   │   ├── relationships.py
│   │   └── ...
│   │
│   ├── models/              # SQLAlchemy models (22 files)
│   │   ├── user.py          # User with subscription fields
│   │   ├── event.py         # Event with privacy, slug
│   │   ├── event_image.py   # Images with captions
│   │   ├── event_location.py
│   │   ├── comment.py
│   │   ├── like.py
│   │   ├── follow.py        # Follow with status
│   │   ├── custom_group.py
│   │   ├── share_token.py
│   │   ├── tag_profile.py
│   │   └── ...
│   │
│   ├── schemas/             # Pydantic schemas
│   │   ├── event.py         # EventCreate, EventResponse
│   │   ├── user.py
│   │   └── ...
│   │
│   ├── core/
│   │   ├── config.py        # Settings from env vars
│   │   ├── database.py      # SQLAlchemy session
│   │   ├── security.py      # JWT utilities
│   │   ├── deps.py          # get_current_user dependency
│   │   └── supabase_auth.py # Supabase JWT validation
│   │
│   ├── services/
│   │   └── email_service.py # Email template builder
│   │
│   └── utils/
│       ├── slug.py          # URL slug generation
│       ├── image_cleanup.py # Orphan cleanup
│       └── ...
│
├── requirements.txt         # Python dependencies
├── vercel.json             # Serverless config
└── index.py                # Vercel entry point
```

### Request Flow

```
HTTP Request
    │
    ▼
┌─────────────────────────────────────────┐
│           FastAPI App (main.py)         │
│                                         │
│  1. CORS middleware                     │
│  2. Route matching                      │
│  3. Dependency injection                │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         Route Handler (api/*.py)        │
│                                         │
│  1. get_current_user (JWT validation)   │
│  2. Pydantic request validation         │
│  3. Business logic                      │
│  4. Database operations                 │
│  5. Response serialization              │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         Database (SQLAlchemy)           │
│                                         │
│  1. Session from pool                   │
│  2. Query execution                     │
│  3. ORM mapping                         │
│  4. Session close                       │
└─────────────────────────────────────────┘
```

### Authentication Flow

```
Frontend                    Backend                     Supabase
   │                          │                            │
   │ 1. Login with email/pw   │                            │
   │─────────────────────────▶│                            │
   │                          │ 2. Forward to Supabase     │
   │                          │───────────────────────────▶│
   │                          │                            │
   │                          │ 3. Validate credentials    │
   │                          │◀───────────────────────────│
   │                          │    Return JWT + user       │
   │                          │                            │
   │ 4. Return JWT            │                            │
   │◀─────────────────────────│                            │
   │                          │                            │
   │ 5. Store JWT (localStorage)                           │
   │                          │                            │
   │ 6. API request + JWT     │                            │
   │─────────────────────────▶│                            │
   │                          │ 7. Validate JWT            │
   │                          │───────────────────────────▶│
   │                          │                            │
   │                          │ 8. JWT valid               │
   │                          │◀───────────────────────────│
   │                          │                            │
   │                          │ 9. Query user by auth_id   │
   │                          │    Execute business logic  │
   │                          │                            │
   │ 10. Response             │                            │
   │◀─────────────────────────│                            │
```

---

## Database Schema

### Core Tables

```sql
-- Users
users (
    id SERIAL PRIMARY KEY,
    auth_user_id UUID UNIQUE,      -- Links to Supabase Auth
    email VARCHAR UNIQUE,
    username VARCHAR UNIQUE,
    full_name VARCHAR,
    avatar_url VARCHAR,
    banner_url VARCHAR,
    bio TEXT,
    subscription_tier VARCHAR,      -- 'free' | 'premium'
    subscription_status VARCHAR,    -- 'trial' | 'active' | 'canceled'
    stripe_customer_id VARCHAR,
    trial_start_date TIMESTAMP,
    trial_end_date TIMESTAMP,
    created_at TIMESTAMP
)

-- Events
events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users,
    title VARCHAR,
    slug VARCHAR UNIQUE,           -- URL-friendly identifier
    description TEXT,              -- Rich HTML content
    cover_image_url VARCHAR,
    category VARCHAR,
    privacy VARCHAR,               -- 'public' | 'followers' | 'close_family' | 'custom' | 'private'
    custom_group_id INTEGER,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    is_draft BOOLEAN,
    is_deleted BOOLEAN,
    view_count INTEGER,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)

-- Event Images (for captions and tracking)
event_images (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events ON DELETE CASCADE,
    image_url VARCHAR,
    caption TEXT,
    order_index INTEGER,
    gps_latitude DECIMAL,
    gps_longitude DECIMAL,
    date_taken TIMESTAMP
)

-- Event Locations
event_locations (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events ON DELETE CASCADE,
    name VARCHAR,
    latitude DECIMAL,
    longitude DECIMAL,
    location_type VARCHAR,         -- 'manual' | 'exif' | 'inline_marker'
    timestamp TIMESTAMP
)
```

### Relationship Tables

```sql
-- Follows
follows (
    id SERIAL PRIMARY KEY,
    follower_id INTEGER REFERENCES users,
    following_id INTEGER REFERENCES users,
    status VARCHAR,                -- 'pending' | 'accepted' | 'rejected'
    is_close_family BOOLEAN,
    created_at TIMESTAMP
)

-- Custom Groups
custom_groups (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users,
    name VARCHAR,
    created_at TIMESTAMP
)

custom_group_members (
    group_id INTEGER REFERENCES custom_groups,
    user_id INTEGER REFERENCES users,
    PRIMARY KEY (group_id, user_id)
)

-- Share Tokens
share_tokens (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events,
    token VARCHAR UNIQUE,
    expires_at TIMESTAMP,
    is_active BOOLEAN,
    created_at TIMESTAMP
)
```

### Engagement Tables

```sql
-- Comments
comments (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events ON DELETE CASCADE,
    user_id INTEGER REFERENCES users,
    content TEXT,
    created_at TIMESTAMP
)

-- Likes
likes (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events ON DELETE CASCADE,
    user_id INTEGER REFERENCES users,
    created_at TIMESTAMP,
    UNIQUE (event_id, user_id)
)

-- Media Engagement (image/video specific)
media_likes (
    id SERIAL PRIMARY KEY,
    event_image_id INTEGER REFERENCES event_images ON DELETE CASCADE,
    user_id INTEGER REFERENCES users,
    UNIQUE (event_image_id, user_id)
)

media_comments (
    id SERIAL PRIMARY KEY,
    event_image_id INTEGER REFERENCES event_images ON DELETE CASCADE,
    user_id INTEGER REFERENCES users,
    content TEXT,
    created_at TIMESTAMP
)
```

---

## Connection Pooling

### Supabase Configuration

```
Mode: Session Pooler (NOT Transaction)
Port: 5432
Max Connections: 5 (free tier limit)
```

### SQLAlchemy Configuration

```python
# backend/app/core/database.py
engine = create_engine(
    DATABASE_URL,
    pool_size=1,           # Single connection per serverless instance
    max_overflow=0,        # No extra connections
    pool_pre_ping=True,    # Verify connection before use
    pool_recycle=300,      # Recycle after 5 minutes
)
```

### Connection Strategy

**Problem:** Serverless functions can spawn multiple instances, each needing database connections.

**Solution:**
1. Single connection per function instance
2. Consolidate related data into single API responses
3. Avoid N+1 queries

**Example - BAD:**
```python
event = get_event(id)           # Connection 1
images = get_event_images(id)   # Connection 2
comments = get_event_comments(id)  # Connection 3
```

**Example - GOOD:**
```python
event = get_event_with_all_data(id)  # Single query with joins
```

---

## External Service Integration

### Cloudinary (Media)

```python
# Upload flow
cloudinary.uploader.upload(
    file,
    folder="ofs/images",
    resource_type="auto",
    eager=[
        {"width": 2000, "crop": "limit"},  # Resize large images
    ]
)

# Video processing
cloudinary.uploader.upload(
    video_file,
    resource_type="video",
    eager=[
        {"streaming_profile": "hd", "format": "m3u8"},  # HLS
    ],
    eager_async=True  # Process in background
)
```

### Stripe (Payments)

```python
# Webhook handling
@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    event = stripe.Webhook.construct_event(
        payload, sig_header, STRIPE_WEBHOOK_SECRET
    )

    if event["type"] == "customer.subscription.created":
        # Update user subscription status
        pass
    elif event["type"] == "customer.subscription.deleted":
        # Downgrade to free tier
        pass
```

### Resend (Email)

```python
# Email sending
resend.Emails.send({
    "from": "Our Family Socials <noreply@ourfamilysocials.com>",
    "to": user.email,
    "subject": "New comment on your event",
    "html": render_template("comment_notification", {...})
})
```

---

## Security Considerations

### Authentication
- JWTs validated against Supabase public keys
- Tokens expire after 1 hour (Supabase default)
- Refresh tokens handled by Supabase client

### Authorization
- All API endpoints check `get_current_user` dependency
- Event privacy checked before returning data
- Follow status verified for followers-only content

### Data Protection
- Passwords never stored (Supabase handles)
- Sensitive data not logged
- CORS restricted to production domain

### Input Validation
- Pydantic schemas validate all input
- SQL injection prevented by SQLAlchemy ORM
- XSS mitigated by React's default escaping

---

## Performance Considerations

### Frontend
- Code splitting via React Router lazy loading
- Image lazy loading in galleries
- Memoization for expensive computations
- LocalStorage for user preferences

### Backend
- Connection pooling (see above)
- Eager loading for related data
- Pagination for list endpoints
- Caching headers for static responses

### CDN
- Vercel Edge Network for static assets
- Cloudinary CDN for media
- Appropriate Cache-Control headers

---

## Monitoring & Debugging

### Vercel Logs
- Function execution logs
- Build logs
- Deployment history

### Browser DevTools
- Network tab for API calls
- Console for JavaScript errors
- React DevTools for component state

### Common Debug Patterns

```bash
# Check recent commits
git log --oneline -20

# Check Vercel deployment status
# (via Vercel dashboard)

# Test frontend build locally
cd frontend && npm run build

# Check for circular dependencies
# (build will fail with "Cannot access X before initialization")
```
