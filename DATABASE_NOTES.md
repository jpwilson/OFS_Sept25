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
