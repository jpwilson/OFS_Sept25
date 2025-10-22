# Our Family Socials (OFS) - Requirements & Decisions

## Tech Stack
- **Frontend**: React
- **Backend**: FastAPI + Python
- **Database**: SQLite (local MVP) → PostgreSQL on Supabase (production)
- **Hosting**: Vercel (future)
- **Auth**: Google OAuth (eventually), username/password for MVP
- **Image Storage**: Filesystem for MVP (quickest path)

## Core Features for MVP

### Pages/Screens
1. **Feed** - Home page showing events from network
2. **Profile Page** - User's own profile and their events
3. **Event Detail Page (Creator View)** - With edit buttons, view stats
4. **Event Detail Page (Viewer)** - Read-only view for network
5. **Event Creation/Edit Page** - Create and manage events
6. **Stats Page** - Analytics on views, engagement

### Content Structure
- **Flexible content blocks**: Events contain ordered blocks of:
  - Text paragraphs
  - Images (inline with text)
  - Videos
  - Image captions
- **Gallery view**: All images/videos from an event in one place
- **Days/Sections**: Logical grouping within events (optional)

### User Network & Privacy
- Multi-user from day one (core feature)
- User relationships (friends/followers model - TBD)
- Per-event visibility controls
- Private network of trusted users

### Social Features
- Comments on events
- Likes on events
- View counts and stats
- Notifications (basic)

### Media Handling
- Image upload with progress indicators
- Image compression/optimization
- Image cropping/formatting
- Multiple image sizes (thumbnails, full-res)
- Video upload support
- Max file size limits

### Geographic Features
- GPS coordinates for events/locations
- Store geo data for future mapping features
- Optional for DIY-type events

### Responsive Design
- Mobile viewport
- iPad/tablet viewport
- Desktop viewport
- All layouts must work seamlessly across devices

## Design Philosophy
- **Minimal UI**: Interface fades into background
- **Content-first**: Focus on the events and stories
- **Magazine-style**: Images inline with narrative text
- **Clean and curated**: Professional, organized presentation

## Scale Considerations (Millions of Users)
- CDN for media delivery (Vercel Edge, Cloudflare)
- Image optimization pipeline
- Lazy loading and infinite scroll
- Caching strategy
- Database indexes and query optimization

## Additional Features to Consider
- Search (own events, network events)
- Feed algorithm (chronological vs. weighted)
- Event templates
- Draft/publish workflow
- Event sharing links
- Export event as PDF/webpage

## Use Cases
- Vacations (multi-day, multi-location)
- Weddings and honeymoons
- DIY/home projects
- Any life event worth documenting richly

## Success Metrics
- User engagement (time on site, events viewed)
- Content creation (events published, photos uploaded)
- Network growth (users added to networks)
- Return visits

## Development Approach
1. Create visual mockups (5-6 variations)
2. Select design direction
3. Build data models
4. Implement MVP features iteratively
5. Test and refine
6. Scale infrastructure