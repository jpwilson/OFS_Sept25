from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Our Family Socials"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    DATABASE_URL: str = "sqlite:///./ofs.db"

    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024

    # Supabase Storage (required for image uploads)
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_BUCKET: str = "event-images"

    # Video settings
    SUPABASE_VIDEO_BUCKET: str = "event-videos"
    MAX_VIDEO_SIZE: int = 100 * 1024 * 1024  # 100MB
    MAX_VIDEO_DURATION: int = 120  # 2 minutes in seconds
    ALLOWED_VIDEO_FORMATS: list = [".mp4", ".mov", ".avi", ".webm"]

    # Cloudinary (for video uploads and optimization)
    CLOUDINARY_CLOUD_NAME: str = "dejjei389"
    CLOUDINARY_API_KEY: str = ""  # Set in Vercel environment variables
    CLOUDINARY_API_SECRET: str = ""  # Set in Vercel environment variables

    # Supabase Auth (for authentication)
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # CORS Origins (comma-separated list of allowed origins)
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,https://ofs-sept25-frontend.vercel.app,https://www.ourfamilysocials.com,https://ourfamilysocials.com"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()