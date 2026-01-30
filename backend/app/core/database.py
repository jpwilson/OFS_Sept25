from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from .config import settings

# For serverless (Vercel), use NullPool - no persistent connections
# This avoids connection pool exhaustion when multiple instances spin up
# Each request gets a fresh connection and releases it immediately
if "postgresql" in settings.DATABASE_URL or "postgres" in settings.DATABASE_URL:
    engine = create_engine(
        settings.DATABASE_URL,
        poolclass=NullPool,  # No connection pooling - best for serverless
        connect_args={
            "connect_timeout": 10,  # 10 second timeout for initial connection
            "options": "-c statement_timeout=30000"  # 30 second query timeout
        }
    )
elif "sqlite" in settings.DATABASE_URL:
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(settings.DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()