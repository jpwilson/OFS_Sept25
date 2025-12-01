from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# Configure connection pool for Supabase free tier (max 5 connections in Session Pooler)
# CRITICAL: Vercel serverless can spin up multiple instances, so we need VERY small pools
pool_config = {}
if "postgresql" in settings.DATABASE_URL or "postgres" in settings.DATABASE_URL:
    pool_config = {
        "pool_size": 1,  # Only 1 persistent connection per serverless instance
        "max_overflow": 0,  # No overflow (strict limit)
        "pool_pre_ping": True,  # Verify connections before using
        "pool_recycle": 300,  # Recycle connections after 5 minutes
    }
elif "sqlite" in settings.DATABASE_URL:
    pool_config = {"connect_args": {"check_same_thread": False}}

engine = create_engine(
    settings.DATABASE_URL,
    **pool_config
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()