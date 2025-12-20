from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime
from ..core.database import get_db
from ..core.deps import get_current_user, get_current_user_optional
from ..models.user import User
from ..models.tag_profile import TagProfile
from ..models.tag_profile_claim import TagProfileClaim
from ..models.follow import Follow
from ..models.event_tag import EventTag
from ..schemas.tag_profile import (
    TagProfileCreate,
    TagProfileUpdate,
    TagProfileResponse,
    TagProfileSearchResult,
    TagProfileClaimCreate,
    TagProfileClaimResponse,
    TagProfileClaimSentResponse
)

router = APIRouter(prefix="/tag-profiles", tags=["tag-profiles"])


@router.post("", response_model=TagProfileResponse)
def create_tag_profile(
    profile: TagProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new tag profile for a non-user (pet, child, relative, etc.)"""
    db_profile = TagProfile(
        name=profile.name,
        relationship_to_creator=profile.relationship_to_creator,
        photo_url=profile.photo_url,
        birth_date=profile.birth_date,
        created_by_id=current_user.id
    )
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)

    return TagProfileResponse(
        id=db_profile.id,
        name=db_profile.name,
        relationship_to_creator=db_profile.relationship_to_creator,
        photo_url=db_profile.photo_url,
        birth_date=db_profile.birth_date,
        created_by_id=db_profile.created_by_id,
        created_by_username=current_user.username,
        created_by_display_name=current_user.display_name or current_user.full_name,
        is_merged=db_profile.is_merged,
        merged_user_id=db_profile.merged_user_id,
        created_at=db_profile.created_at
    )


@router.get("/search", response_model=List[TagProfileSearchResult])
def search_tag_profiles(
    q: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search for tag profiles by name.
    Returns profiles with context (who created them, relationship) for deduplication.
    Prioritizes profiles created by people the current user follows.
    """
    if not q or len(q) < 1:
        return []

    search_term = f"%{q}%"

    # Get IDs of users the current user follows
    following_ids = db.query(Follow.following_id).filter(
        Follow.follower_id == current_user.id,
        Follow.status == "accepted"
    ).subquery()

    # Query tag profiles matching the search term
    profiles = db.query(
        TagProfile,
        User.username.label("creator_username"),
        User.display_name.label("creator_display_name"),
        User.full_name.label("creator_full_name"),
        # Subquery to check if current user follows the creator
        following_ids.c.following_id.isnot(None).label("is_following_creator")
    ).join(
        User, TagProfile.created_by_id == User.id
    ).outerjoin(
        following_ids, TagProfile.created_by_id == following_ids.c.following_id
    ).filter(
        TagProfile.name.ilike(search_term),
        TagProfile.is_merged == False  # Don't show merged profiles
    ).order_by(
        # Prioritize profiles from followed users
        following_ids.c.following_id.isnot(None).desc(),
        TagProfile.name
    ).limit(20).all()

    results = []
    for row in profiles:
        profile = row[0]
        creator_username = row.creator_username
        creator_display_name = row.creator_display_name or row.creator_full_name
        is_following = bool(row.is_following_creator)

        results.append(TagProfileSearchResult(
            id=profile.id,
            name=profile.name,
            photo_url=profile.photo_url,
            relationship_to_creator=profile.relationship_to_creator,
            created_by_id=profile.created_by_id,
            created_by_username=creator_username,
            created_by_display_name=creator_display_name,
            is_following_creator=is_following
        ))

    return results


@router.get("/mine", response_model=List[TagProfileResponse])
def get_my_tag_profiles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all tag profiles created by the current user."""
    profiles = db.query(TagProfile).filter(
        TagProfile.created_by_id == current_user.id,
        TagProfile.is_merged == False
    ).order_by(TagProfile.name).all()

    return [
        TagProfileResponse(
            id=p.id,
            name=p.name,
            relationship_to_creator=p.relationship_to_creator,
            photo_url=p.photo_url,
            birth_date=p.birth_date,
            created_by_id=p.created_by_id,
            created_by_username=current_user.username,
            created_by_display_name=current_user.display_name or current_user.full_name,
            is_merged=p.is_merged,
            merged_user_id=p.merged_user_id,
            created_at=p.created_at
        )
        for p in profiles
    ]


@router.get("/{profile_id}", response_model=TagProfileResponse)
def get_tag_profile(
    profile_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get a tag profile by ID."""
    profile = db.query(TagProfile).filter(TagProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag profile not found"
        )

    creator = db.query(User).filter(User.id == profile.created_by_id).first()

    return TagProfileResponse(
        id=profile.id,
        name=profile.name,
        relationship_to_creator=profile.relationship_to_creator,
        photo_url=profile.photo_url,
        birth_date=profile.birth_date,
        created_by_id=profile.created_by_id,
        created_by_username=creator.username if creator else None,
        created_by_display_name=creator.display_name or creator.full_name if creator else None,
        is_merged=profile.is_merged,
        merged_user_id=profile.merged_user_id,
        created_at=profile.created_at
    )


@router.get("/{profile_id}/events")
def get_tag_profile_events(
    profile_id: int,
    skip: int = 0,
    limit: int = 20,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get all events where this tag profile is tagged."""
    from ..models.event import Event
    from ..utils.privacy import filter_events_by_privacy

    profile = db.query(TagProfile).filter(TagProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag profile not found"
        )

    # Get event IDs where this profile is tagged
    tagged_event_ids = db.query(EventTag.event_id).filter(
        EventTag.tag_profile_id == profile_id,
        EventTag.status == "accepted"
    ).subquery()

    # Query events and apply privacy filtering
    query = db.query(Event).filter(
        Event.id.in_(tagged_event_ids),
        Event.is_published == True,
        Event.is_deleted == False
    )

    # Apply privacy filter if we have a viewer
    if current_user:
        query = filter_events_by_privacy(query, current_user, db)

    events = query.order_by(Event.start_date.desc()).offset(skip).limit(limit).all()

    # Build response
    result = []
    for event in events:
        author = event.author
        result.append({
            "id": event.id,
            "title": event.title,
            "summary": event.summary,
            "start_date": event.start_date.isoformat() if event.start_date else None,
            "cover_image_url": event.cover_image_url,
            "author_id": event.author_id,
            "author_username": author.username if author else None,
            "author_display_name": author.display_name or author.full_name if author else None
        })

    return result


@router.put("/{profile_id}", response_model=TagProfileResponse)
def update_tag_profile(
    profile_id: int,
    profile_update: TagProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a tag profile. Only the creator can update their profiles."""
    profile = db.query(TagProfile).filter(TagProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag profile not found"
        )

    if profile.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own tag profiles"
        )

    if profile_update.name is not None:
        profile.name = profile_update.name
    if profile_update.relationship_to_creator is not None:
        profile.relationship_to_creator = profile_update.relationship_to_creator
    if profile_update.photo_url is not None:
        profile.photo_url = profile_update.photo_url
    if profile_update.birth_date is not None:
        profile.birth_date = profile_update.birth_date

    db.commit()
    db.refresh(profile)

    return TagProfileResponse(
        id=profile.id,
        name=profile.name,
        relationship_to_creator=profile.relationship_to_creator,
        photo_url=profile.photo_url,
        birth_date=profile.birth_date,
        created_by_id=profile.created_by_id,
        created_by_username=current_user.username,
        created_by_display_name=current_user.display_name or current_user.full_name,
        is_merged=profile.is_merged,
        merged_user_id=profile.merged_user_id,
        created_at=profile.created_at
    )


@router.delete("/{profile_id}")
def delete_tag_profile(
    profile_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a tag profile. Only the creator can delete their profiles."""
    profile = db.query(TagProfile).filter(TagProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag profile not found"
        )

    if profile.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own tag profiles"
        )

    db.delete(profile)
    db.commit()

    return {"message": "Tag profile deleted"}


# ============================================================================
# Tag Profile Claim Endpoints
# ============================================================================

claims_router = APIRouter(prefix="/me", tags=["tag-profile-claims"])


@router.post("/{profile_id}/claim", response_model=TagProfileClaimSentResponse)
def create_claim_request(
    profile_id: int,
    claim_data: TagProfileClaimCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Request to claim a tag profile as your identity.
    The tag profile creator will need to approve this request.
    """
    profile = db.query(TagProfile).filter(TagProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag profile not found"
        )

    if profile.is_merged:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This tag profile has already been claimed"
        )

    if profile.created_by_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot claim your own tag profile"
        )

    # Check for existing pending claim
    existing_claim = db.query(TagProfileClaim).filter(
        TagProfileClaim.tag_profile_id == profile_id,
        TagProfileClaim.claimant_id == current_user.id,
        TagProfileClaim.status == "pending"
    ).first()

    if existing_claim:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a pending claim for this profile"
        )

    # Create the claim
    claim = TagProfileClaim(
        tag_profile_id=profile_id,
        claimant_id=current_user.id,
        message=claim_data.message
    )
    db.add(claim)
    db.commit()
    db.refresh(claim)

    creator = db.query(User).filter(User.id == profile.created_by_id).first()

    return TagProfileClaimSentResponse(
        id=claim.id,
        tag_profile_id=profile.id,
        tag_profile_name=profile.name,
        tag_profile_photo_url=profile.photo_url,
        tag_profile_relationship=profile.relationship_to_creator,
        profile_creator_id=profile.created_by_id,
        profile_creator_username=creator.username if creator else None,
        profile_creator_display_name=creator.display_name or creator.full_name if creator else None,
        message=claim.message,
        status=claim.status,
        created_at=claim.created_at
    )


@claims_router.get("/tag-profile-claims", response_model=List[TagProfileClaimResponse])
def get_claims_to_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all pending claims on tag profiles I created."""
    claims = db.query(TagProfileClaim).join(
        TagProfile, TagProfileClaim.tag_profile_id == TagProfile.id
    ).filter(
        TagProfile.created_by_id == current_user.id,
        TagProfileClaim.status == "pending"
    ).order_by(TagProfileClaim.created_at.desc()).all()

    results = []
    for claim in claims:
        profile = claim.tag_profile
        claimant = claim.claimant

        results.append(TagProfileClaimResponse(
            id=claim.id,
            tag_profile_id=profile.id,
            tag_profile_name=profile.name,
            tag_profile_photo_url=profile.photo_url,
            tag_profile_relationship=profile.relationship_to_creator,
            claimant_id=claimant.id,
            claimant_username=claimant.username,
            claimant_display_name=claimant.display_name or claimant.full_name,
            claimant_avatar_url=claimant.avatar_url,
            message=claim.message,
            status=claim.status,
            created_at=claim.created_at
        ))

    return results


@claims_router.get("/tag-profile-claims/count")
def get_claims_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get count of pending claims on my tag profiles for notification badges."""
    count = db.query(TagProfileClaim).join(
        TagProfile, TagProfileClaim.tag_profile_id == TagProfile.id
    ).filter(
        TagProfile.created_by_id == current_user.id,
        TagProfileClaim.status == "pending"
    ).count()

    return {"count": count}


@claims_router.get("/tag-profile-claims/sent", response_model=List[TagProfileClaimSentResponse])
def get_claims_by_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all claims I have sent."""
    claims = db.query(TagProfileClaim).filter(
        TagProfileClaim.claimant_id == current_user.id
    ).order_by(TagProfileClaim.created_at.desc()).all()

    results = []
    for claim in claims:
        profile = claim.tag_profile
        creator = db.query(User).filter(User.id == profile.created_by_id).first()

        results.append(TagProfileClaimSentResponse(
            id=claim.id,
            tag_profile_id=profile.id,
            tag_profile_name=profile.name,
            tag_profile_photo_url=profile.photo_url,
            tag_profile_relationship=profile.relationship_to_creator,
            profile_creator_id=profile.created_by_id,
            profile_creator_username=creator.username if creator else None,
            profile_creator_display_name=creator.display_name or creator.full_name if creator else None,
            message=claim.message,
            status=claim.status,
            created_at=claim.created_at
        ))

    return results


@claims_router.post("/tag-profile-claims/{claim_id}/approve")
def approve_claim(
    claim_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Approve a claim request. This merges the tag profile with the claimant's account.
    All event tags pointing to this profile will now reference the user directly.
    """
    claim = db.query(TagProfileClaim).filter(TagProfileClaim.id == claim_id).first()
    if not claim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Claim not found"
        )

    profile = claim.tag_profile
    if profile.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only approve claims on your own tag profiles"
        )

    if claim.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This claim has already been processed"
        )

    # Update the claim
    claim.status = "approved"
    claim.resolved_at = datetime.utcnow()

    # Merge the profile with the user
    profile.merged_user_id = claim.claimant_id
    profile.is_merged = True

    # Transfer all event tags from this profile to the user
    # Note: We keep the tag_profile_id and add tagged_user_id for history
    # Actually, for simplicity, let's update the event tags to point to the user
    event_tags = db.query(EventTag).filter(
        EventTag.tag_profile_id == profile.id
    ).all()

    for tag in event_tags:
        # Check if user is already tagged in this event
        existing_user_tag = db.query(EventTag).filter(
            EventTag.event_id == tag.event_id,
            EventTag.tagged_user_id == claim.claimant_id
        ).first()

        if existing_user_tag:
            # User already tagged, delete the profile tag
            db.delete(tag)
        else:
            # Transfer the tag to the user
            tag.tagged_user_id = claim.claimant_id
            tag.tag_profile_id = None
            tag.status = "accepted"  # Auto-accept since they claimed it

    # Reject all other pending claims for this profile
    other_claims = db.query(TagProfileClaim).filter(
        TagProfileClaim.tag_profile_id == profile.id,
        TagProfileClaim.id != claim_id,
        TagProfileClaim.status == "pending"
    ).all()

    for other_claim in other_claims:
        other_claim.status = "rejected"
        other_claim.resolved_at = datetime.utcnow()

    db.commit()

    return {"message": "Claim approved and profile merged"}


@claims_router.post("/tag-profile-claims/{claim_id}/reject")
def reject_claim(
    claim_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject a claim request."""
    claim = db.query(TagProfileClaim).filter(TagProfileClaim.id == claim_id).first()
    if not claim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Claim not found"
        )

    profile = claim.tag_profile
    if profile.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only reject claims on your own tag profiles"
        )

    if claim.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This claim has already been processed"
        )

    claim.status = "rejected"
    claim.resolved_at = datetime.utcnow()
    db.commit()

    return {"message": "Claim rejected"}
