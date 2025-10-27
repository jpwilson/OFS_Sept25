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

    # Count followers and following (only approved)
    follower_count = db.query(Follow).filter(
        Follow.following_id == user.id,
        Follow.status == "approved"
    ).count()
    following_count = db.query(Follow).filter(
        Follow.follower_id == user.id,
        Follow.status == "approved"
    ).count()

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

    # Create follow request (pending by default)
    follow = Follow(
        follower_id=current_user.id,
        following_id=user_to_follow.id,
        status="pending"
    )

    db.add(follow)
    db.commit()

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

    follow = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.following_id == user.id
    ).first()

    if not follow:
        return {"is_following": False, "status": None}

    return {
        "is_following": follow.status == "approved",
        "status": follow.status  # 'pending', 'approved', or 'rejected'
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
        Follow.status == "approved"
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
            is_following = follow_check and follow_check.status == "approved"

        # Check if this follower follows current user back
        follows_you = False
        if current_user:
            follow_check = db.query(Follow).filter(
                Follow.follower_id == follower.id,
                Follow.following_id == current_user.id
            ).first()
            follows_you = follow_check and follow_check.status == "approved"

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
        Follow.status == "approved"
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
            is_following = follow_check and follow_check.status == "approved"

        # Check if this user follows current user back
        follows_you = False
        if current_user:
            follow_check = db.query(Follow).filter(
                Follow.follower_id == followed_user.id,
                Follow.following_id == current_user.id
            ).first()
            follows_you = follow_check and follow_check.status == "approved"

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

    follow.status = "approved"
    db.commit()

    return {"message": "Follow request accepted", "status": "approved"}

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
