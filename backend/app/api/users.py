from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..core.database import get_db
from ..core.deps import get_current_user
from ..models.user import User
from ..models.follow import Follow

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/{username}")
def get_user_profile(
    username: str,
    db: Session = Depends(get_db)
):
    """Get a user's profile by username"""
    user = db.query(User).filter(User.username == username).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Count events by this user
    from ..models.event import Event
    event_count = db.query(Event).filter(Event.author_id == user.id).count()

    # Count followers and following
    follower_count = db.query(Follow).filter(Follow.following_id == user.id).count()
    following_count = db.query(Follow).filter(Follow.follower_id == user.id).count()

    return {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "bio": user.bio,
        "avatar_url": user.avatar_url,
        "event_count": event_count,
        "follower_count": follower_count,
        "following_count": following_count,
        "created_at": user.created_at
    }

@router.post("/{username}/follow")
def follow_user(
    username: str,
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

    # Create follow relationship
    follow = Follow(
        follower_id=current_user.id,
        following_id=user_to_follow.id
    )

    db.add(follow)
    db.commit()

    return {"message": f"Now following {username}"}

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
    follows = db.query(Follow).filter(Follow.following_id == current_user.id).all()

    followers_list = []
    for follow in follows:
        user = follow.follower
        followers_list.append({
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url
        })

    return followers_list

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

    is_following = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.following_id == user.id
    ).first() is not None

    return {"is_following": is_following}
