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
from ..models.event_tag import EventTag


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
    """
    # Author can ALWAYS view their own events (even with expired subscription)
    # This reminds them of what they have and motivates resubscription
    if viewer and event.author_id == viewer.id:
        return True

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
        if member:
            return True

    # Check if viewer follows someone who is tagged in this event
    # This applies to all privacy levels except private
    if event.privacy_level != "private":
        tagged_followed = db.query(EventTag).join(
            Follow,
            (Follow.following_id == EventTag.tagged_user_id) &
            (Follow.follower_id == viewer.id) &
            (Follow.status == "accepted")
        ).filter(
            EventTag.event_id == event.id,
            EventTag.status == "accepted"
        ).first()
        if tagged_followed:
            return True

    # Default: deny access
    return False


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
    Filter events for feed/explore display.
    Shows ALL events except PRIVATE to logged-in users.
    Privacy gates are applied when viewing event detail via can_view_event().

    - Anonymous users: only PUBLIC events (prevents enumeration)
    - Logged-in users: ALL events except PRIVATE
    - Subscription filtering: still enforced (expired author events hidden)
    """
    from datetime import datetime

    # Filter out events from expired users (subscription check)
    query = query.join(Event.author).filter(
        or_(
            # Always show viewer's own events
            Event.author_id == viewer.id if viewer else False,
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

    # Anonymous users: only public events (security - prevents enumeration)
    if not viewer:
        return query.filter(Event.privacy_level == "public")

    # Logged-in users: all events except private
    # Privacy gates for followers/close_family/custom_group applied at detail view
    query = query.filter(Event.privacy_level != "private")

    return query


def filter_events_by_privacy(
    query,
    viewer: Optional[User],
    db: Session
):
    """
    Filter a SQLAlchemy query to only include events the viewer can see

    Returns a modified query with privacy filters applied

    Subscription rules:
    - Users can ALWAYS see their own events (even if their subscription expired)
    - Events from OTHER expired users are hidden
    """
    from sqlalchemy.orm import joinedload
    from datetime import datetime

    # Filter out events from expired users (authors without active subscription)
    # EXCEPT: Always allow viewer to see their own events
    # We need to join with the User table to check subscription status
    query = query.join(Event.author).filter(
        or_(
            # Always show viewer's own events (regardless of subscription)
            Event.author_id == viewer.id if viewer else False,
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

    # If no viewer, only show public events
    if not viewer:
        return query.filter(Event.privacy_level == "public")

    # Build privacy filter conditions
    conditions = [
        # Always show author's own events
        Event.author_id == viewer.id,
        # Always show public events
        Event.privacy_level == "public"
    ]

    # Get user's accepted follows (people they follow)
    following_ids = db.query(Follow.following_id).filter(
        Follow.follower_id == viewer.id,
        Follow.status == "accepted"
    ).subquery()

    # Add followers-only events from people user follows
    conditions.append(
        (Event.privacy_level == "followers") &
        (Event.author_id.in_(following_ids))
    )

    # Get user's close family follows
    close_family_ids = db.query(Follow.following_id).filter(
        Follow.follower_id == viewer.id,
        Follow.status == "accepted",
        Follow.is_close_family == True
    ).subquery()

    # Add close family events
    conditions.append(
        (Event.privacy_level == "close_family") &
        (Event.author_id.in_(close_family_ids))
    )

    # Get custom groups user is a member of
    group_ids = db.query(CustomGroupMember.group_id).filter(
        CustomGroupMember.user_id == viewer.id
    ).subquery()

    # Add custom group events
    conditions.append(
        (Event.privacy_level == "custom_group") &
        (Event.custom_group_id.in_(group_ids))
    )

    # Add events where a followed user is tagged (with accepted tag)
    # This allows viewers to see events where someone they follow is tagged
    tagged_events = db.query(EventTag.event_id).filter(
        EventTag.tagged_user_id.in_(
            db.query(Follow.following_id).filter(
                Follow.follower_id == viewer.id,
                Follow.status == "accepted"
            )
        ),
        EventTag.status == "accepted"
    ).subquery()

    conditions.append(Event.id.in_(tagged_events))

    # Apply all conditions with OR (using distinct to avoid duplicates)
    return query.filter(or_(*conditions)).distinct()


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
