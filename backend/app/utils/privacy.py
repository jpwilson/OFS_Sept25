"""
Privacy filtering utilities for events
"""
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from ..models.event import Event
from ..models.follow import Follow
from ..models.custom_group import CustomGroupMember
from ..models.user import User


def can_view_event(event: Event, viewer: Optional[User], db: Session) -> bool:
    """
    Check if a user can view an event based on privacy settings

    Privacy levels:
    - public: Anyone can view
    - followers: Only accepted followers can view
    - close_family: Only followers marked as close family can view
    - custom_group: Only members of the specified custom group can view
    - private: Only the author can view

    Subscription rules:
    - Authors can ALWAYS see their own events (even if expired - reminds them what they have)
    - If author's subscription expired, others cannot see their events

    Drafts and trashed events are visible to their author only.

    Demo accounts may open only public stories and stories flagged
    is_demo_showcase (whatever their audience).

    audience_filter() is the same rule as an SQL condition, used by the feed
    and list filters: a list may never include an event this function refuses.
    """
    # Author can ALWAYS view their own events (even with expired subscription)
    # This reminds them of what they have and motivates resubscription
    if viewer and event.author_id == viewer.id:
        return True

    # Drafts and trashed events are for the author only
    if not event.is_published or event.is_deleted:
        return False

    # Demo accounts: showcase stories (so the demo works without following
    # anyone) and public stories only
    if is_demo_viewer(viewer):
        if event.is_demo_showcase:
            return True
        return event.privacy_level == "public" and is_user_subscription_active(event.author)

    # For others viewing: check if author's subscription is active
    if not is_user_subscription_active(event.author):
        return False

    # Public events are visible to everyone
    if event.privacy_level == "public":
        return True

    # Private events are only visible to author
    if event.privacy_level == "private":
        return False

    # All other privacy levels require authentication
    if not viewer:
        return False

    # Followers-only events
    if event.privacy_level == "followers":
        follow = db.query(Follow).filter(
            Follow.follower_id == viewer.id,
            Follow.following_id == event.author_id,
            Follow.status == "accepted"
        ).first()
        return follow is not None

    # Close family events
    if event.privacy_level == "close_family":
        follow = db.query(Follow).filter(
            Follow.follower_id == viewer.id,
            Follow.following_id == event.author_id,
            Follow.status == "accepted",
            Follow.is_close_family == True
        ).first()
        return follow is not None

    # Custom group events
    if event.privacy_level == "custom_group":
        if not event.custom_group_id:
            return False

        member = db.query(CustomGroupMember).filter(
            CustomGroupMember.group_id == event.custom_group_id,
            CustomGroupMember.user_id == viewer.id
        ).first()
        return member is not None

    # Being tagged, or following someone who is tagged, never widens the
    # audience: Close Family and Custom Group stories are for that audience only.

    # Default: deny access
    return False


def is_demo_viewer(viewer: Optional[User]) -> bool:
    return bool(viewer and getattr(viewer, "is_demo_account", False))


def audience_filter(viewer: Optional[User], db: Session):
    """
    SQL condition for the events whose audience includes the viewer: the same
    rule as can_view_event(). Callers still filter is_published / is_deleted
    and the author subscription check (see active_author_filter).

    - anonymous: public
    - demo account: own, public, is_demo_showcase
    - member: own (Private included), public, followers stories of people they
      follow, close family stories of people who marked them close family,
      custom group stories of groups they belong to
    """
    if not viewer:
        return Event.privacy_level == "public"

    if is_demo_viewer(viewer):
        return or_(
            Event.author_id == viewer.id,
            Event.privacy_level == "public",
            Event.is_demo_showcase == True
        )

    following_ids = db.query(Follow.following_id).filter(
        Follow.follower_id == viewer.id,
        Follow.status == "accepted"
    )
    close_family_ids = db.query(Follow.following_id).filter(
        Follow.follower_id == viewer.id,
        Follow.status == "accepted",
        Follow.is_close_family == True
    )
    group_ids = db.query(CustomGroupMember.group_id).filter(
        CustomGroupMember.user_id == viewer.id
    )

    # No "someone you follow is tagged" condition: can_view_event() does not
    # grant access that way, so a list must not show those events either
    # (it used to, which leaked Private, Close Family and Custom Group stories).
    return or_(
        Event.author_id == viewer.id,
        Event.privacy_level == "public",
        (Event.privacy_level == "followers") & Event.author_id.in_(following_ids),
        (Event.privacy_level == "close_family") & Event.author_id.in_(close_family_ids),
        (Event.privacy_level == "custom_group") & Event.custom_group_id.in_(group_ids),
    )


def active_author_filter(query, viewer: Optional[User]):
    """Hide events whose author's subscription has lapsed, except the viewer's
    own (and, for a demo account, showcase stories, as in can_view_event)."""
    from datetime import datetime

    return query.join(Event.author).filter(
        or_(
            # Always show viewer's own events (regardless of subscription)
            Event.author_id == viewer.id if viewer else False,
            # Demo accounts always see showcase stories
            Event.is_demo_showcase == True if is_demo_viewer(viewer) else False,
            # Author has premium/family tier with active or canceled status
            (User.subscription_tier.in_(['premium', 'family'])) &
            (User.subscription_status.in_(['active', 'canceled'])),
            # Author is on trial and trial hasn't expired
            (User.subscription_status == 'trial') &
            (
                (User.trial_end_date == None) |  # Legacy users
                (User.trial_end_date > datetime.utcnow())  # Active trial
            )
        )
    )


def can_view_event_or_share(
    event: Event,
    viewer: Optional[User],
    db: Session,
    share_token: Optional[str] = None
) -> bool:
    """
    can_view_event(), plus access through a valid share link token for that
    event (the same rules as GET /share/{token}). Non-authors never see drafts
    or trashed events.
    """
    if viewer and event.author_id == viewer.id:
        return True

    if not event.is_published or event.is_deleted:
        return False

    if can_view_event(event, viewer, db):
        return True

    if share_token and event.share_enabled and event.share_token:
        from datetime import datetime
        import secrets
        if event.share_expires_at and event.share_expires_at < datetime.utcnow():
            return False
        return secrets.compare_digest(str(event.share_token), str(share_token))

    return False


def get_viewable_event_or_404(
    event_id: int,
    viewer: Optional[User],
    db: Session,
    share_token: Optional[str] = None
) -> Event:
    """
    Load an event and make sure the viewer may see it. Returns 404 (not 403)
    when they may not, so event IDs cannot be probed for existence.
    """
    from fastapi import HTTPException

    event = db.query(Event).filter(Event.id == event_id).first()
    if not event or not can_view_event_or_share(event, viewer, db, share_token):
        raise HTTPException(status_code=404, detail="Event not found")
    return event


def is_user_subscription_active(user: User) -> bool:
    """
    Check if a user has an active subscription (trial or paid).
    Returns True if user can have visible events.
    """
    if not user:
        return False

    # Paid subscribers are always active
    if user.subscription_tier in ['premium', 'family']:
        if user.subscription_status in ['active', 'canceled']:
            # 'canceled' still has access until period ends
            return True

    # Trial users need to check if trial is still valid
    if user.subscription_status == 'trial':
        if user.trial_end_date:
            from datetime import datetime
            return datetime.utcnow() < user.trial_end_date
        # Legacy users without trial_end_date are considered active
        return True

    return False


def filter_events_for_feed(
    query,
    viewer: Optional[User],
    db: Session
):
    """
    Filter events for feed/explore display: only stories the viewer may open
    (audience_filter, the same rule as can_view_event), from authors whose
    subscription is active, minus muted authors.

    - Anonymous users: only PUBLIC events
    - Logged-in users: their own stories (Private included) plus stories whose
      audience includes them
    """
    query = active_author_filter(query, viewer)
    query = query.filter(audience_filter(viewer, db))

    if not viewer:
        return query

    # Filter out events from muted users
    from ..models.user_mute import UserMute
    muted_user_ids = db.query(UserMute.muted_user_id).filter(
        UserMute.muter_id == viewer.id
    )
    query = query.filter(~Event.author_id.in_(muted_user_ids))

    return query


def filter_events_by_privacy(
    query,
    viewer: Optional[User],
    db: Session
):
    """
    Filter a SQLAlchemy query to only include events the viewer can see
    (audience_filter, the same rule as can_view_event).

    Subscription rules:
    - Users can ALWAYS see their own events (even if their subscription expired)
    - Events from OTHER expired users are hidden
    """
    query = active_author_filter(query, viewer)
    return query.filter(audience_filter(viewer, db)).distinct()


def is_event_hidden_due_to_expired_subscription(event: Event) -> bool:
    """
    Check if an event is hidden because the author's subscription has expired.
    """
    return not is_user_subscription_active(event.author)


def get_event_privacy_display(event: Event, db: Session) -> dict:
    """
    Get human-readable privacy information for display
    """
    # Check if event is hidden due to expired subscription
    if is_event_hidden_due_to_expired_subscription(event):
        return {
            "level": "subscription_expired",
            "display": "Unavailable",
            "description": "This event is currently unavailable. The creator's subscription has expired."
        }

    if event.privacy_level == "public":
        return {
            "level": "public",
            "display": "Public",
            "description": "Visible to everyone"
        }
    elif event.privacy_level == "followers":
        return {
            "level": "followers",
            "display": "Followers",
            "description": "Visible to your followers"
        }
    elif event.privacy_level == "close_family":
        return {
            "level": "close_family",
            "display": "Close Family",
            "description": "Visible to close family members only"
        }
    elif event.privacy_level == "custom_group":
        if event.custom_group_id and event.custom_group:
            return {
                "level": "custom_group",
                "display": f"Group: {event.custom_group.name}",
                "description": f"Visible to members of '{event.custom_group.name}'"
            }
        return {
            "level": "custom_group",
            "display": "Custom Group",
            "description": "Visible to custom group members"
        }
    elif event.privacy_level == "private":
        return {
            "level": "private",
            "display": "Private",
            "description": "Only visible to you"
        }
    else:
        return {
            "level": "unknown",
            "display": "Unknown",
            "description": "Privacy level not set"
        }
