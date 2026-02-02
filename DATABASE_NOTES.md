# Database Setup Notes

## Production Database

**Production Database**: PostgreSQL on Supabase
**Connection Mode**: Session mode (NOT Transaction pooler - causes crashes)

## Database Migrations with Alembic

We use Alembic for database migrations. Migrations run against the production Supabase database.

### Running Migrations

From the `backend/` directory:

```bash
# Check current migration status
alembic current

# Apply all pending migrations
alembic upgrade head

# Create a new migration
alembic revision -m "description_of_change"

# Rollback one migration
alembic downgrade -1
```

### Creating a New Migration

1. Update the SQLAlchemy model in `backend/app/models/`
2. Create migration file:
   ```bash
   cd backend
   alembic revision -m "add_column_name_to_table"
   ```
3. Edit the generated file in `backend/alembic/versions/` to add upgrade/downgrade logic
4. Run the migration: `alembic upgrade head`
5. Commit both the model changes and migration file

### Migration History

| Revision | Description |
|----------|-------------|
| a3ad04689449 | Initial schema |
| 877cc9ab0a0b | Add theme_preference to users |
| 6a09c5b9297f | Add reaction_type to media_likes |

### Important Notes

- Migrations run against **production** database via `settings.DATABASE_URL`
- Always test migrations locally before running in production
- The `env.py` imports all models to ensure they're registered with Base.metadata
- Never skip migrations - always use Alembic to track schema changes

## Current Production Schema

Key tables:
- `users` - User accounts with auth, profile, preferences
- `events` - Family events/memories
- `event_images` - Media attachments for events
- `event_locations` - GPS coordinates for events
- `comments` - Comments on events
- `likes` - Likes on events
- `follows` - User follow relationships
- `media_likes` - Reactions on individual images/videos (supports 10 reaction types)
- `media_comments` - Comments on individual images/videos
- `tag_profiles` - Family member profiles (taggable in events)

## Connection Pooling

**CRITICAL**: Use Session mode connection string, NOT Transaction pooler.

Transaction pooler mode causes backend crashes. The Session mode connection string is configured in the environment variables.

### Connection Pool History

We've tried multiple configurations for serverless (Vercel):

| Approach | Config | Result |
|----------|--------|--------|
| Small pool | `pool_size=1, max_overflow=0` | Intermittent failures |
| NullPool | `poolclass=NullPool` | **Current** - testing |
| Pre-ping | `pool_pre_ping=True` | Added extra latency |

NullPool creates fresh connections per request - no pooling. Better for serverless where instances spin up/down frequently.

---

## Monitoring & Debugging

### Built-in Logging (Free)

**Request logging is enabled** in `backend/app/main.py`:
- Every request gets a correlation ID (X-Request-ID header)
- Logs: `[abc123] START GET /api/v1/events`
- Logs: `[abc123] END 200 in 0.234s`
- Errors include the correlation ID for tracing

**Database logging** in `backend/app/core/database.py`:
- Logs connection establish/close events
- Logs database errors

**Frontend** adds X-Request-ID header to all API calls for correlation.

### Where to View Logs

| Platform | Location | What's Logged |
|----------|----------|---------------|
| **Vercel** | Dashboard → Project → Logs tab | All console.log, request timing |
| **Supabase** | Dashboard → Logs → Logs Explorer | Database queries, auth events |
| **Browser** | DevTools Console | Frontend errors with request IDs |

### Debugging Intermittent Failures

When the site goes down, check in this order:

1. **Vercel Logs** - Look for recent errors with request IDs
2. **Supabase Logs** - Check postgres_logs for connection errors
3. **Browser Console** - Get the X-Request-ID from the failed request
4. **Cross-reference** - Use the request ID to trace frontend → backend → database

### Optional: Sentry (Recommended)

For better error tracking, set up Sentry (free tier: 5,000 errors/month):

1. Sign up at sentry.io
2. Create React project, install: `npm install @sentry/react`
3. Create Python project, install: `pip install sentry-sdk[fastapi]`
4. Add DSN to environment variables

Sentry provides: stack traces, user context, performance monitoring, alerting.

### Key Metrics to Watch

- **Response times** > 5s = likely database issue
- **503 errors** = Vercel function timeout or DB connection failed
- **CORS errors in console** = Usually backend not responding (not actual CORS)
