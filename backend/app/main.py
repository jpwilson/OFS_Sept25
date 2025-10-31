from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from .core.config import settings
from .core.database import engine, Base
from .api import auth, events, users, comments, likes, upload, locations, geocoding

# Tables are managed by migrations, not created on startup
# Base.metadata.create_all(bind=engine)  # Removed to avoid connection exhaustion in serverless

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Configure CORS - origins can be set via CORS_ORIGINS environment variable
origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",")] if settings.CORS_ORIGINS else ["http://localhost:5173"]
print(f"CORS Origins configured: {origins}")  # Debug logging

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(events.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(comments.router, prefix=settings.API_V1_STR)
app.include_router(likes.router, prefix=settings.API_V1_STR)
app.include_router(upload.router, prefix=settings.API_V1_STR)
app.include_router(locations.router, prefix=settings.API_V1_STR)
app.include_router(geocoding.router, prefix=settings.API_V1_STR)

# Mount static files for serving uploaded images (only if directory exists)
# In production (Vercel), files will be served from Supabase Storage instead
upload_dir = Path(settings.UPLOAD_DIR)
if upload_dir.exists() and upload_dir.is_dir():
    app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

@app.get("/")
def read_root():
    return {"message": "Our Family Socials API", "version": settings.VERSION}

@app.get("/health")
def health_check():
    return {"status": "healthy", "cors_origins": settings.CORS_ORIGINS}

@app.get("/debug/env")
def debug_env():
    """Debug endpoint to check environment variables"""
    return {
        "supabase_url_set": bool(settings.SUPABASE_URL),
        "supabase_url_length": len(settings.SUPABASE_URL),
        "supabase_url_preview": settings.SUPABASE_URL[:30] + "..." if len(settings.SUPABASE_URL) > 30 else settings.SUPABASE_URL,
        "supabase_key_set": bool(settings.SUPABASE_KEY),
        "supabase_key_length": len(settings.SUPABASE_KEY),
        "supabase_bucket": settings.SUPABASE_BUCKET,
        "database_url_preview": settings.DATABASE_URL[:50] + "..." if len(settings.DATABASE_URL) > 50 else settings.DATABASE_URL
    }