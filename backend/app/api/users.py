from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from ..core.database import get_db
from ..core.deps import get_current_user
from ..models.user import User
from ..models.follow import Follow
from ..services.email_service import send_follow_request_email, send_new_follower_email

router = APIRouter(prefix="/users", tags=["users"])

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None


class NotificationPreferencesUpdate(BaseModel):
    email_notifications_enabled: Optional[bool] = None
    notify_new_follower: Optional[bool] = None
    notify_new_comment: Optional[bool] = None
    notify_trial_reminder: Optional[bool] = None
    notify_event_shared: Optional[bool] = None
    notify_new_event_from_followed: Optional[bool] = None

@router.get("/me")
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the current authenticated user's profile"""
    # Count PUBLISHED events by this user (exclude drafts and trash)
    from ..models.event import Event
    event_count = db.query(Event).filter(
        Event.author_id == current_user.id,
        Event.is_published == True,
        Event.is_deleted == False
    ).count()

    # Count followers and following (only accepted)
    follower_count = db.query(Follow).filter(
        Follow.following_id == current_user.id,
        Follow.status == "accepted"
    ).count()
    following_count = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.status == "accepted"
    ).count()

    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "display_name": current_user.display_name,
        "bio": current_user.bio,
        "avatar_url": current_user.avatar_url,
        "banner_url": current_user.banner_url,
        "subscription_tier": current_user.subscription_tier,
        "subscription_status": current_user.subscription_status,
        "subscription_ends_at": current_user.subscription_ends_at.isoformat() if current_user.subscription_ends_at else None,
        "trial_end_date": current_user.trial_end_date.isoformat() if current_user.trial_end_date else None,
        "trial_days_remaining": current_user.get_trial_days_remaining(),
        "is_within_first_5_days": current_user.is_within_first_5_days(),
        "can_access_content": current_user.can_access_content(),
        "event_count": event_count,
        "follower_count": follower_count,
        "following_count": following_count,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None
    }

@router.get("/search/users")
def search_users(
    q: str,
    db: Session = Depends(get_db)
):
    """Search for users by username or full name"""
    if not q or len(q) < 2:
        return []

    # Search by username or full_name (case-insensitive)
    search_term = f"%{q}%"
    users = db.query(User).filter(
        (User.username.ilike(search_term)) | (User.full_name.ilike(search_term))
    ).limit(20).all()

    results = []
    for user in users:
        results.append({
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
            "bio": user.bio
        })

    return results

@router.get("/{username}")
def get_user_profile(
    username: str,
    db: Session = Depends(get_db)
):
    """Get a user's profile by username"""
    user = db.query(User).filter(User.username == username).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Count PUBLISHED events by this user (exclude drafts and trash)
    from ..models.event import Event
    event_count = db.query(Event).filter(
        Event.author_id == user.id,
        Event.is_published == True,
        Event.is_deleted == False
    ).count()

    # Count followers and following (only accepted)
    follower_count = db.query(Follow).filter(
        Follow.following_id == user.id,
        Follow.status == "accepted"
    ).count()
    following_count = db.query(Follow).filter(
        Follow.follower_id == user.id,
        Follow.status == "accepted"
    ).count()

    return {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "bio": user.bio,
        "avatar_url": user.avatar_url,
        "banner_url": user.banner_url,
        "event_count": event_count,
        "follower_count": follower_count,
        "following_count": following_count,
        "created_at": user.created_at
    }

@router.post("/{username}/follow")
def follow_user(
    username: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Follow a user"""
    # Get the user to follow
    user_to_follow = db.query(User).filter(User.username == username).first()

    if not user_to_follow:
        raise HTTPException(status_code=404, detail="User not found")

    if user_to_follow.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    # Check if already following
    existing_follow = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.following_id == user_to_follow.id
    ).first()

    if existing_follow:
        return {"message": "Already following this user"}

    # Create follow request (pending by default)
    follow = Follow(
        follower_id=current_user.id,
        following_id=user_to_follow.id,
        status="pending"
    )

    db.add(follow)
    db.commit()

    # Send email notification to user being followed
    if user_to_follow.email:
        # Check notification preferences
        should_notify = (
            (user_to_follow.email_notifications_enabled is None or user_to_follow.email_notifications_enabled) and
            (user_to_follow.notify_new_follower is None or user_to_follow.notify_new_follower)
        )
        if should_notify:
            requester_name = current_user.display_name or current_user.full_name or current_user.username
            background_tasks.add_task(
                send_follow_request_email,
                to_email=user_to_follow.email,
                username=user_to_follow.username,
                requester_name=requester_name
            )

    return {"message": f"Follow request sent to {username}", "status": "pending"}

@router.delete("/{username}/follow")
def unfollow_user(
    username: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unfollow a user"""
    # Get the user to unfollow
    user_to_unfollow = db.query(User).filter(User.username == username).first()

    if not user_to_unfollow:
        raise HTTPException(status_code=404, detail="User not found")

    # Find and delete the follow relationship
    follow = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.following_id == user_to_unfollow.id
    ).first()

    if not follow:
        return {"message": "Not following this user"}

    db.delete(follow)
    db.commit()

    return {"message": f"Unfollowed {username}"}

@router.get("/me/following")
def get_following(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of users the current user is following"""
    follows = db.query(Follow).filter(Follow.follower_id == current_user.id).all()

    following_list = []
    for follow in follows:
        user = follow.following
        following_list.append({
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url
        })

    return following_list

@router.get("/me/followers")
def get_followers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of users following the current user"""
    follows = db.query(Follow).filter(
        Follow.following_id == current_user.id,
        Follow.status == "accepted"
    ).all()

    followers_list = []
    for follow in follows:
        user = follow.follower
        followers_list.append({
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
            "is_close_family": follow.is_close_family,
            "status": follow.status
        })

    return followers_list

@router.patch("/me/followers/{user_id}/close-family")
def toggle_close_family(
    user_id: int,
    close_family: bool,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark or unmark a follower as close family"""
    # Find the follow relationship where user_id is following current_user
    follow = db.query(Follow).filter(
        Follow.follower_id == user_id,
        Follow.following_id == current_user.id,
        Follow.status == "accepted"
    ).first()

    if not follow:
        raise HTTPException(status_code=404, detail="Follower relationship not found")

    follow.is_close_family = close_family
    db.commit()

    return {"message": "Close family status updated", "is_close_family": close_family}

@router.get("/{username}/is-following")
def check_if_following(
    username: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if current user is following a specific user"""
    user = db.query(User).filter(User.username == username).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    follow = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.following_id == user.id
    ).first()

    if not follow:
        return {"is_following": False, "status": None}

    return {
        "is_following": follow.status == "accepted",
        "status": follow.status  # 'pending', 'accepted', or 'rejected'
    }

@router.get("/{username}/followers")
def get_user_followers(
    username: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user, use_cache=False)
):
    """Get list of users following a specific user"""
    user = db.query(User).filter(User.username == username).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    follows = db.query(Follow).filter(
        Follow.following_id == user.id,
        Follow.status == "accepted"
    ).all()

    followers_list = []
    for follow in follows:
        follower = follow.follower

        # Check if current user is following this follower (for mutual follow indicator)
        is_following = False
        if current_user:
            follow_check = db.query(Follow).filter(
                Follow.follower_id == current_user.id,
                Follow.following_id == follower.id
            ).first()
            is_following = follow_check and follow_check.status == "accepted"

        # Check if this follower follows current user back
        follows_you = False
        if current_user:
            follow_check = db.query(Follow).filter(
                Follow.follower_id == follower.id,
                Follow.following_id == current_user.id
            ).first()
            follows_you = follow_check and follow_check.status == "accepted"

        followers_list.append({
            "id": follower.id,
            "username": follower.username,
            "full_name": follower.full_name,
            "avatar_url": follower.avatar_url,
            "is_following": is_following,
            "follows_you": follows_you
        })

    return followers_list

@router.get("/{username}/following")
def get_user_following(
    username: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user, use_cache=False)
):
    """Get list of users a specific user is following"""
    user = db.query(User).filter(User.username == username).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    follows = db.query(Follow).filter(
        Follow.follower_id == user.id,
        Follow.status == "accepted"
    ).all()

    following_list = []
    for follow in follows:
        followed_user = follow.following

        # Check if current user is following this user (for mutual follow indicator)
        is_following = False
        if current_user:
            follow_check = db.query(Follow).filter(
                Follow.follower_id == current_user.id,
                Follow.following_id == followed_user.id
            ).first()
            is_following = follow_check and follow_check.status == "accepted"

        # Check if this user follows current user back
        follows_you = False
        if current_user:
            follow_check = db.query(Follow).filter(
                Follow.follower_id == followed_user.id,
                Follow.following_id == current_user.id
            ).first()
            follows_you = follow_check and follow_check.status == "accepted"

        following_list.append({
            "id": followed_user.id,
            "username": followed_user.username,
            "full_name": followed_user.full_name,
            "avatar_url": followed_user.avatar_url,
            "is_following": is_following,
            "follows_you": follows_you
        })

    return following_list

@router.get("/me/follow-requests")
def get_follow_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get incoming follow requests for the current user"""
    requests = db.query(Follow).filter(
        Follow.following_id == current_user.id,
        Follow.status == "pending"
    ).all()

    request_list = []
    for request in requests:
        requester = request.follower
        request_list.append({
            "request_id": request.id,
            "user_id": requester.id,
            "username": requester.username,
            "full_name": requester.full_name,
            "avatar_url": requester.avatar_url,
            "created_at": request.created_at
        })

    return request_list

@router.post("/me/follow-requests/{request_id}/accept")
def accept_follow_request(
    request_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Accept a follow request"""
    follow = db.query(Follow).filter(
        Follow.id == request_id,
        Follow.following_id == current_user.id,
        Follow.status == "pending"
    ).first()

    if not follow:
        raise HTTPException(status_code=404, detail="Follow request not found")

    follow.status = "accepted"
    db.commit()

    # Send email notification to the follower that their request was accepted
    follower = db.query(User).filter(User.id == follow.follower_id).first()
    if follower and follower.email:
        # Check notification preferences
        should_notify = (
            (follower.email_notifications_enabled is None or follower.email_notifications_enabled) and
            (follower.notify_new_follower is None or follower.notify_new_follower)
        )
        if should_notify:
            followed_name = current_user.display_name or current_user.full_name or current_user.username
            background_tasks.add_task(
                send_new_follower_email,
                to_email=follower.email,
                username=follower.username,
                follower_name=followed_name  # The person they're now following
            )

    return {"message": "Follow request accepted", "status": "accepted"}

@router.post("/me/follow-requests/{request_id}/reject")
def reject_follow_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject a follow request"""
    follow = db.query(Follow).filter(
        Follow.id == request_id,
        Follow.following_id == current_user.id,
        Follow.status == "pending"
    ).first()

    if not follow:
        raise HTTPException(status_code=404, detail="Follow request not found")

    # Option 1: Mark as rejected
    follow.status = "rejected"
    db.commit()

    # Option 2: Delete the request (uncomment if preferred)
    # db.delete(follow)
    # db.commit()

    return {"message": "Follow request rejected", "status": "rejected"}

@router.get("/me/follow-requests/sent")
def get_sent_follow_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get outgoing follow requests (pending requests sent by current user)"""
    requests = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.status == "pending"
    ).all()

    request_list = []
    for request in requests:
        requested_user = request.following
        request_list.append({
            "request_id": request.id,
            "user_id": requested_user.id,
            "username": requested_user.username,
            "full_name": requested_user.full_name,
            "avatar_url": requested_user.avatar_url,
            "created_at": request.created_at
        })

    return request_list

@router.get("/me/follow-requests/count")
def get_follow_request_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get count of pending incoming follow requests"""
    count = db.query(Follow).filter(
        Follow.following_id == current_user.id,
        Follow.status == "pending"
    ).count()

    return {"count": count}

@router.put("/me/profile")
def update_profile(
    profile_data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's profile"""
    print(f"🔵 PROFILE UPDATE: User {current_user.username} (ID: {current_user.id})")
    print(f"🔵 Incoming data: full_name={profile_data.full_name}, bio={profile_data.bio}, avatar={profile_data.avatar_url}, banner={profile_data.banner_url}")
    print(f"🔵 Current values: full_name={current_user.full_name}, bio={current_user.bio}, avatar={current_user.avatar_url}, banner={current_user.banner_url}")

    # Update only provided fields
    if profile_data.full_name is not None:
        current_user.full_name = profile_data.full_name
        print(f"🔵 Updated full_name to: {profile_data.full_name}")
    if profile_data.bio is not None:
        current_user.bio = profile_data.bio
        print(f"🔵 Updated bio to: {profile_data.bio}")
    if profile_data.avatar_url is not None:
        current_user.avatar_url = profile_data.avatar_url
        print(f"🔵 Updated avatar_url to: {profile_data.avatar_url}")
    if profile_data.banner_url is not None:
        current_user.banner_url = profile_data.banner_url
        print(f"🔵 Updated banner_url to: {profile_data.banner_url}")

    db.commit()
    print(f"🟢 Committed to database")

    db.refresh(current_user)
    print(f"🟢 After refresh: full_name={current_user.full_name}, bio={current_user.bio}, avatar={current_user.avatar_url}, banner={current_user.banner_url}")

    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "bio": current_user.bio,
        "avatar_url": current_user.avatar_url,
        "banner_url": current_user.banner_url,
        "created_at": current_user.created_at
    }


@router.get("/me/notification-preferences")
def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's email notification preferences"""
    return {
        "email_notifications_enabled": current_user.email_notifications_enabled if current_user.email_notifications_enabled is not None else True,
        "notify_new_follower": current_user.notify_new_follower if current_user.notify_new_follower is not None else True,
        "notify_new_comment": current_user.notify_new_comment if current_user.notify_new_comment is not None else True,
        "notify_trial_reminder": current_user.notify_trial_reminder if current_user.notify_trial_reminder is not None else True,
        "notify_event_shared": current_user.notify_event_shared if current_user.notify_event_shared is not None else True,
        "notify_new_event_from_followed": current_user.notify_new_event_from_followed if current_user.notify_new_event_from_followed is not None else True
    }


@router.put("/me/notification-preferences")
def update_notification_preferences(
    preferences: NotificationPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's email notification preferences"""
    if preferences.email_notifications_enabled is not None:
        current_user.email_notifications_enabled = preferences.email_notifications_enabled
    if preferences.notify_new_follower is not None:
        current_user.notify_new_follower = preferences.notify_new_follower
    if preferences.notify_new_comment is not None:
        current_user.notify_new_comment = preferences.notify_new_comment
    if preferences.notify_trial_reminder is not None:
        current_user.notify_trial_reminder = preferences.notify_trial_reminder
    if preferences.notify_event_shared is not None:
        current_user.notify_event_shared = preferences.notify_event_shared
    if preferences.notify_new_event_from_followed is not None:
        current_user.notify_new_event_from_followed = preferences.notify_new_event_from_followed

    db.commit()
    db.refresh(current_user)

    return {
        "email_notifications_enabled": current_user.email_notifications_enabled,
        "notify_new_follower": current_user.notify_new_follower,
        "notify_new_comment": current_user.notify_new_comment,
        "notify_trial_reminder": current_user.notify_trial_reminder,
        "notify_event_shared": current_user.notify_event_shared,
        "notify_new_event_from_followed": current_user.notify_new_event_from_followed
    }


@router.get("/{username}/events")
def get_user_events(
    username: str,
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """Get a user's published events by username"""
    from ..models.event import Event
    from ..schemas.event import EventResponse
    from sqlalchemy.orm import selectinload

    # Get the user
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get their published events
    events = db.query(Event).options(
        selectinload(Event.author)
    ).filter(
        Event.author_id == user.id,
        Event.is_published == True,
        Event.is_deleted == False
    ).order_by(Event.created_at.desc()).offset(skip).limit(limit).all()

    # Build response
    response = []
    for event in events:
        event_dict = {
            "id": event.id,
            "title": event.title,
            "summary": event.summary,
            "description": event.description,
            "start_date": event.start_date,
            "end_date": event.end_date,
            "location_name": event.location_name,
            "latitude": event.latitude,
            "longitude": event.longitude,
            "cover_image_url": event.cover_image_url,
            "has_multiple_locations": event.has_multiple_locations,
            "author_id": event.author_id,
            "author_username": event.author.username,
            "author_full_name": event.author.full_name,
            "view_count": event.view_count,
            "is_published": event.is_published,
            "created_at": event.created_at,
            "updated_at": event.updated_at,
            "like_count": 0,
            "comment_count": 0,
            "content_blocks": [],
            "locations": []
        }
        response.append(EventResponse.model_validate(event_dict))

    return response
