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
    """
    # Author can always view their own events
    if viewer and event.author_id == viewer.id:
        return True

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

    # Default: deny access
    return False


def filter_events_by_privacy(
    query,
    viewer: Optional[User],
    db: Session
):
    """
    Filter a SQLAlchemy query to only include events the viewer can see

    Returns a modified query with privacy filters applied
    """
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

    # Apply all conditions with OR
    return query.filter(or_(*conditions))


def get_event_privacy_display(event: Event, db: Session) -> dict:
    """
    Get human-readable privacy information for display
    """
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
