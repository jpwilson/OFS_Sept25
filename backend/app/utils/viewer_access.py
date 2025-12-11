"""
Viewer Access Control Utilities

Handles restrictions for invited viewers after their trial expires.
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from ..models.user import User
from ..models.invited_viewer import InvitedViewer
from ..models.viewer_notification_log import ViewerNotificationLog


def is_invited_viewer_restricted(user: User) -> bool:
    """
    Check if user is in restricted invited viewer mode.

    Returns True if:
    - User signed up via invitation (is_invited_viewer=True)
    - Trial has expired
    - No active paid subscription

    Restricted users can only see events from their inviters.
    """
    if not user.is_invited_viewer:
        return False

    # Has active paid subscription - not restricted
    if user.has_active_subscription():
        return False

    # Trial still active - not restricted
    trial_status = user.get_trial_status()
    if trial_status == 'active':
        return False

    # Legacy users (no trial set) - not restricted
    if trial_status == 'never_started':
        return False

    # Trial expired, no subscription - restricted
    return True


def can_create_content(user: User) -> bool:
    """Check if user can create events"""
    return not is_invited_viewer_restricted(user)


def can_follow_new_users(user: User) -> bool:
    """Check if user can send new follow requests"""
    return not is_invited_viewer_restricted(user)


def can_search_users(user: User) -> bool:
    """Check if user can search/discover new users"""
    return not is_invited_viewer_restricted(user)


def get_inviter_ids(user: User, db: Session) -> list:
    """
    Get list of user IDs who invited this user.
    Used for filtering events when restricted.
    """
    invitations = db.query(InvitedViewer).filter(
        InvitedViewer.resulting_user_id == user.id
    ).all()

    return [inv.inviter_id for inv in invitations]


def get_inviter_names(user: User, db: Session) -> list:
    """
    Get list of display names of users who invited this user.
    Used for messaging in UI and emails.
    """
    inviter_ids = get_inviter_ids(user, db)

    if not inviter_ids:
        return []

    inviters = db.query(User).filter(User.id.in_(inviter_ids)).all()
    return [inv.display_name or inv.username for inv in inviters]


def can_notify_invited_viewer(
    viewer_id: int,
    author_id: int,
    db: Session
) -> bool:
    """
    Check if we can send notification to invited viewer.
    Rate limited to max 1 notification per day per author.

    Args:
        viewer_id: The invited viewer's user ID
        author_id: The event author's user ID
        db: Database session

    Returns:
        True if notification can be sent, False if rate limited
    """
    cutoff = datetime.utcnow() - timedelta(days=1)

    recent_notification = db.query(ViewerNotificationLog).filter(
        ViewerNotificationLog.viewer_id == viewer_id,
        ViewerNotificationLog.event_author_id == author_id,
        ViewerNotificationLog.sent_at > cutoff
    ).first()

    return recent_notification is None


def log_viewer_notification(
    viewer_id: int,
    author_id: int,
    event_id: int,
    db: Session
) -> ViewerNotificationLog:
    """
    Log a notification sent to invited viewer.
    Used for rate limiting.
    """
    log = ViewerNotificationLog(
        viewer_id=viewer_id,
        event_author_id=author_id,
        event_id=event_id,
        sent_at=datetime.utcnow()
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def get_viewer_status(user: User, db: Session) -> dict:
    """
    Get comprehensive viewer status for a user.
    Used by frontend to show appropriate UI.
    """
    is_restricted = is_invited_viewer_restricted(user)
    inviter_names = get_inviter_names(user, db) if user.is_invited_viewer else []

    trial_days = user.get_trial_days_remaining()

    return {
        "is_invited_viewer": user.is_invited_viewer,
        "is_restricted": is_restricted,
        "can_create": can_create_content(user),
        "can_follow": can_follow_new_users(user),
        "can_search": can_search_users(user),
        "inviter_names": inviter_names,
        "inviter_count": len(inviter_names),
        "trial_days_remaining": trial_days,
        "trial_status": user.get_trial_status(),
        "subscription_status": user.subscription_status,
        "subscription_tier": user.subscription_tier
    }
