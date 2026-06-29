"""
Cloudflare R2 storage client (S3-compatible).

R2 is the replacement for Cloudinary/Supabase Storage: zero egress, $0.015/GB,
10GB free. Objects are stored under the same folder conventions the app already
uses (full/, medium/, thumbnails/, videos/) and delivered through a Cloudflare
custom domain (R2_PUBLIC_DOMAIN), optionally transformed on the fly via
/cdn-cgi/image/ on the frontend.

When R2 is not configured (R2_ACCESS_KEY_ID empty) the callers fall back to
Supabase Storage, so deploying this code before provisioning R2 is safe.
"""
import boto3
from botocore.config import Config

from ..core.config import settings

# Cache the client across invocations within a warm serverless container.
_client = None


def r2_configured() -> bool:
    """True when R2 credentials are present and uploads should route to R2."""
    return bool(
        settings.R2_ACCESS_KEY_ID
        and settings.R2_SECRET_ACCESS_KEY
        and settings.R2_PUBLIC_DOMAIN
        and (settings.R2_ENDPOINT or settings.R2_ACCOUNT_ID)
    )


def get_r2_client():
    """Get (or lazily create) the boto3 S3 client pointed at R2."""
    global _client
    if _client is None:
        endpoint = settings.R2_ENDPOINT or (
            f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
        )
        _client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            region_name="auto",
            config=Config(signature_version="s3v4"),
        )
    return _client


def r2_public_url(key: str) -> str:
    """Public delivery URL for an object key, e.g. full/<uuid>.jpg."""
    return f"https://{settings.R2_PUBLIC_DOMAIN}/{key}"


def r2_put(key: str, data: bytes, content_type: str) -> str:
    """Upload bytes to R2 and return the public URL.

    Objects are marked immutable + long-cache since keys are uuid-based and
    never overwritten.
    """
    get_r2_client().put_object(
        Bucket=settings.R2_BUCKET,
        Key=key,
        Body=data,
        ContentType=content_type,
        CacheControl="public, max-age=31536000, immutable",
    )
    return r2_public_url(key)


def r2_delete(keys: list[str]) -> None:
    """Delete one or more object keys from R2 (best-effort, ignores misses)."""
    keys = [k for k in keys if k]
    if not keys:
        return
    get_r2_client().delete_objects(
        Bucket=settings.R2_BUCKET,
        Delete={"Objects": [{"Key": k} for k in keys], "Quiet": True},
    )


def r2_presign_put(key: str, content_type: str, expires_in: int = 3600) -> dict:
    """Generate a presigned PUT URL so the browser can upload large files
    (e.g. videos) directly to R2, bypassing the Vercel 4.5MB request-body limit.

    Returns {"upload_url": <presigned PUT URL>, "public_url": <delivery URL>, "key": key}.
    """
    upload_url = get_r2_client().generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.R2_BUCKET,
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=expires_in,
    )
    return {"upload_url": upload_url, "public_url": r2_public_url(key), "key": key}
