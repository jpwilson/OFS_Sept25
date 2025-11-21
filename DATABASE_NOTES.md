# Database Setup Notes

## IMPORTANT: Production Database Only

**DO NOT use local SQLite database for development or assume it's in sync with production.**

- **Production Database**: PostgreSQL on Supabase
- **Local Database**: SQLite - ONLY used to get the FastAPI server running locally for testing. NOT used for actual data.
- **Migration Strategy**: NO migration files. All schema changes are provided as raw SQL that the user runs directly in Supabase dashboard.

## Current Production Schema

The production database (Supabase) has the following tables:
- `users` (8 rows)
- `events` (42 rows)
- `event_images` (2 rows) - Added for caption system
- `event_locations` (15 rows)
- `content_blocks` (0 rows)
- `comments` (8 rows)
- `follows` (6 rows)
- `likes` (16 rows)

## Making Schema Changes

1. Write SQL migration script
2. User runs it manually in Supabase dashboard
3. DO NOT run migrations automatically or assume local DB structure

## Never Assume

- Never assume local DB matches production
- Never run SQL against production without user approval
- Always ask about production DB state before making changes
