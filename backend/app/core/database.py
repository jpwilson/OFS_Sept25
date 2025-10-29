from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# Configure connection pool for Supabase free tier (max 5 connections in Session Pooler)
pool_config = {}
if "postgresql" in settings.DATABASE_URL or "postgres" in settings.DATABASE_URL:
    pool_config = {
        "pool_size": 2,  # Max 2 persistent connections
        "max_overflow": 1,  # Allow 1 additional connection if needed (total 3)
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