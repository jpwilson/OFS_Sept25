from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel, ValidationError
from datetime import datetime
from ..core.database import get_db
from ..core.deps import get_current_user, get_current_user_optional, require_not_demo
from ..models.user import User
from ..models.feedback import Feedback
import hashlib
import re
import time
from ..utils.rate_limit import SlidingWindowLimiter

router = APIRouter(prefix="/feedback", tags=["feedback"])

# Simple rate limiting: track submissions by IP
_rate_limit_cache = {}
RATE_LIMIT_WINDOW = 60  # seconds
MAX_SUBMISSIONS_PER_WINDOW = 3

class FeedbackCreate(BaseModel):
    feedback_type: str  # bug, feature, general
    message: str
    page_url: Optional[str] = None
    screen_size: Optional[str] = None
    is_mobile: bool = False
    attachment_url: Optional[str] = None

class FeedbackResponse(BaseModel):
    id: int
    feedback_type: str
    message: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

def _check_rate_limit(ip: str) -> bool:
    """Returns True if request is allowed, False if rate limited."""
    current_time = time.time()

    # Clean old entries
    cutoff = current_time - RATE_LIMIT_WINDOW
    _rate_limit_cache[ip] = [t for t in _rate_limit_cache.get(ip, []) if t > cutoff]

    # Check limit
    if len(_rate_limit_cache.get(ip, [])) >= MAX_SUBMISSIONS_PER_WINDOW:
        return False

    # Record this request
    if ip not in _rate_limit_cache:
        _rate_limit_cache[ip] = []
    _rate_limit_cache[ip].append(current_time)

    return True

@router.post("", response_model=FeedbackResponse)
async def submit_feedback(
    feedback: FeedbackCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_not_demo)
):
    """Submit user feedback. Requires authentication."""

    # Get client IP for rate limiting
    client_ip = request.client.host if request.client else "unknown"
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()

    # Rate limit check
    if not _check_rate_limit(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Too many feedback submissions. Please wait a minute before trying again."
        )

    # Validate feedback type
    valid_types = ["bug", "feature", "general"]
    if feedback.feedback_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid feedback type. Must be one of: {', '.join(valid_types)}")

    # Validate message length
    if len(feedback.message.strip()) < 10:
        raise HTTPException(status_code=400, detail="Please provide a more detailed message (at least 10 characters)")

    if len(feedback.message) > 5000:
        raise HTTPException(status_code=400, detail="Message is too long (max 5000 characters)")

    # Get user agent from request headers
    user_agent = request.headers.get("user-agent", "")[:500]

    # Create feedback record
    new_feedback = Feedback(
        user_id=current_user.id if current_user else None,
        feedback_type=feedback.feedback_type,
        message=feedback.message.strip(),
        page_url=feedback.page_url[:500] if feedback.page_url else None,
        user_agent=user_agent,
        screen_size=feedback.screen_size[:50] if feedback.screen_size else None,
        is_mobile=feedback.is_mobile,
        attachment_url=feedback.attachment_url[:500] if feedback.attachment_url else None
    )

    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)

    return FeedbackResponse(
        id=new_feedback.id,
        feedback_type=new_feedback.feedback_type,
        message=new_feedback.message,
        status=new_feedback.status,
        created_at=new_feedback.created_at
    )


class ErrorLog(BaseModel):
    error_message: str
    error_stack: Optional[str] = None
    component_name: Optional[str] = None
    page_url: Optional[str] = None
    user_agent: Optional[str] = None
    is_mobile: bool = False
    additional_context: Optional[dict] = None

# Client error logging is open to signed-out visitors (errors happen before
# sign-in), so bound what one client can write to the logs.
MAX_ERROR_LOG_BYTES = 16 * 1024
_error_log_limiter = SlidingWindowLimiter(limit=10, window_seconds=60)
_CONTROL_CHARS = re.compile(r"[\x00-\x1f\x7f]+")


def _log_field(value, limit: int) -> str:
    """One line, truncated: a client cannot forge extra log lines or flood them."""
    return _CONTROL_CHARS.sub(" ", str(value))[:limit]


def _client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def _read_capped_body(request: Request, cap: int) -> bytes:
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > cap:
        raise HTTPException(status_code=413, detail="Error report too large")
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > cap:
            raise HTTPException(status_code=413, detail="Error report too large")
    return bytes(body)


@router.post("/log-error")
async def log_client_error(
    request: Request,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Log client-side errors for debugging. Does not store in DB, just logs."""
    client_ip = _client_ip(request)
    limiter_key = f"user:{current_user.id}" if current_user else f"ip:{client_ip}"
    if not _error_log_limiter.allow(limiter_key):
        raise HTTPException(status_code=429, detail="Too many error reports")

    body = await _read_capped_body(request, MAX_ERROR_LOG_BYTES)
    try:
        error = ErrorLog.model_validate_json(body)
    except ValidationError:
        raise HTTPException(status_code=422, detail="Invalid error report")

    # Log the error (this will appear in Vercel logs)
    user_info = f"user:{current_user.username}" if current_user else "anonymous"
    device_type = "mobile" if error.is_mobile else "desktop"

    print(f"[CLIENT ERROR] {user_info} | {device_type} | {_log_field(error.component_name or 'unknown', 100)}")
    print(f"  Message: {_log_field(error.error_message, 500)}")
    print(f"  URL: {_log_field(error.page_url, 300)}")
    if error.error_stack:
        print(f"  Stack: {_log_field(error.error_stack, 1000)}")
    if error.additional_context:
        print(f"  Context: {_log_field(error.additional_context, 1000)}")

    return {"logged": True}


@router.get("/my-feedback")
async def get_my_feedback(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the current user's feedback submissions with admin replies."""
    items = db.query(Feedback).filter(
        Feedback.user_id == current_user.id
    ).order_by(Feedback.created_at.desc()).all()

    return {
        "feedback": [
            {
                "id": f.id,
                "feedback_type": f.feedback_type,
                "message": f.message,
                "status": f.status,
                "attachment_url": f.attachment_url,
                "admin_reply": getattr(f, 'admin_reply', None),
                "admin_reply_at": f.admin_reply_at.isoformat() if getattr(f, 'admin_reply_at', None) else None,
                "created_at": f.created_at.isoformat() if f.created_at else None
            }
            for f in items
        ]
    }
