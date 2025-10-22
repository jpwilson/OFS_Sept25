# Our Family Socials (OFS)

A private social network for sharing rich, detailed life experiences with trusted friends and family.

## Project Structure

```
OFS_claude/
├── backend/          # FastAPI backend
│   ├── app/
│   │   ├── api/      # API routes
│   │   ├── core/     # Config, database
│   │   ├── models/   # SQLAlchemy models
│   │   └── schemas/  # Pydantic schemas
│   └── requirements.txt
├── frontend/         # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── styles/
│   │   └── context/
│   └── package.json
└── docs/            # Documentation
```

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - SQL toolkit and ORM
- **SQLite** - Database (for MVP, will migrate to PostgreSQL)
- **Pydantic** - Data validation

### Frontend
- **React** - UI library
- **React Router** - Routing
- **Vite** - Build tool
- **CSS Modules** - Styling

## Getting Started

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run backend
uvicorn app.main:app --reload --port 8000
```

Backend will run at: http://localhost:8000

### Frontend Setup

```bash
cd frontend

# Install dependencies (already done)
npm install

# Run frontend
npm run dev
```

Frontend will run at: http://localhost:3000

## Database Models

- **User** - User accounts and profiles
- **Event** - Main event/story container
- **ContentBlock** - Flexible content (text, images, videos)
- **Comment** - Comments on events
- **Like** - Likes on events

## API Endpoints (To be implemented)

- `POST /api/v1/auth/register` - Register user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/events` - Get feed of events
- `GET /api/v1/events/{id}` - Get event details
- `POST /api/v1/events` - Create event
- `POST /api/v1/events/{id}/content` - Add content to event
- `POST /api/v1/events/{id}/comments` - Comment on event
- `POST /api/v1/events/{id}/like` - Like event

## Design Philosophy

- **Photo-first**: Immersive, large images
- **Minimal UI**: Interface fades into background
- **Content-focused**: Let stories shine
- **Magazine-quality**: Professional presentation
- **Dark mode default**: With light mode option

## Roadmap

### MVP (Phase 1)
- [x] Project setup
- [x] Database models
- [x] Basic UI structure
- [ ] Authentication
- [ ] Event CRUD operations
- [ ] Image upload
- [ ] Feed functionality
- [ ] Event detail page

### Phase 2
- [ ] Comments and likes
- [ ] User profiles
- [ ] Search
- [ ] Notifications
- [ ] Light/dark mode toggle

### Phase 3
- [ ] Geographic features (PostGIS)
- [ ] Map visualization
- [ ] Gallery views
- [ ] Export to PDF
- [ ] Mobile apps

### Future
- [ ] Migrate to PostgreSQL + Supabase
- [ ] Deploy to Vercel
- [ ] CDN for images
- [ ] Analytics/stats
- [ ] Monetization features