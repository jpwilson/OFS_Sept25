from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List
from datetime import datetime
from ..core.database import get_db
from ..core.deps import get_current_user
from ..models.user import User
from ..models.user_relationship import UserRelationship
from ..models.follow import Follow
from ..schemas.user_relationship import (
    RelationshipPropose,
    RelationshipResponse,
    RelationshipRequestResponse,
    RelationshipSentResponse,
    RELATIONSHIP_TYPES
)

router = APIRouter(prefix="/relationships", tags=["relationships"])


def get_ordered_user_ids(user_a_id: int, user_b_id: int) -> tuple:
    """Ensure user_a_id < user_b_id for consistent storage."""
    if user_a_id < user_b_id:
        return user_a_id, user_b_id
    return user_b_id, user_a_id


def check_mutual_follow(db: Session, user_id_1: int, user_id_2: int) -> bool:
    """Check if two users mutually follow each other."""
    follow_1_to_2 = db.query(Follow).filter(
        Follow.follower_id == user_id_1,
        Follow.following_id == user_id_2,
        Follow.status == "accepted"
    ).first()

    follow_2_to_1 = db.query(Follow).filter(
        Follow.follower_id == user_id_2,
        Follow.following_id == user_id_1,
        Follow.status == "accepted"
    ).first()

    return follow_1_to_2 is not None and follow_2_to_1 is not None


@router.post("/propose", response_model=RelationshipResponse)
def propose_relationship(
    data: RelationshipPropose,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Propose a relationship to another user.
    Both users must mutually follow each other.
    The proposer specifies both sides of the relationship.
    """
    other_user_id = data.other_user_id

    # Can't propose to yourself
    if other_user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot propose a relationship with yourself"
        )

    # Check other user exists
    other_user = db.query(User).filter(User.id == other_user_id).first()
    if not other_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check mutual follow
    if not check_mutual_follow(db, current_user.id, other_user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must mutually follow each other to propose a relationship"
        )

    # Check for existing relationship
    user_a_id, user_b_id = get_ordered_user_ids(current_user.id, other_user_id)
    existing = db.query(UserRelationship).filter(
        UserRelationship.user_a_id == user_a_id,
        UserRelationship.user_b_id == user_b_id
    ).first()

    if existing:
        if existing.status == "accepted":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A relationship already exists with this user"
            )
        elif existing.status == "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A relationship request is already pending with this user"
            )
        else:  # rejected - allow re-proposal
            db.delete(existing)
            db.flush()

    # Validate relationship types
    if data.my_relationship_to_them not in RELATIONSHIP_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid relationship type: {data.my_relationship_to_them}"
        )
    if data.their_relationship_to_me not in RELATIONSHIP_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid relationship type: {data.their_relationship_to_me}"
        )

    # Create relationship with proper ordering
    # relationship_a_to_b = how user_a describes user_b
    # relationship_b_to_a = how user_b describes user_a
    if current_user.id < other_user_id:
        # current_user is user_a
        relationship_a_to_b = data.my_relationship_to_them
        relationship_b_to_a = data.their_relationship_to_me
    else:
        # current_user is user_b
        relationship_a_to_b = data.their_relationship_to_me
        relationship_b_to_a = data.my_relationship_to_them

    relationship = UserRelationship(
        user_a_id=user_a_id,
        user_b_id=user_b_id,
        relationship_a_to_b=relationship_a_to_b,
        relationship_b_to_a=relationship_b_to_a,
        status="pending",
        proposed_by_id=current_user.id
    )

    db.add(relationship)
    db.commit()
    db.refresh(relationship)

    return RelationshipResponse(
        id=relationship.id,
        other_user_id=other_user.id,
        other_user_username=other_user.username,
        other_user_display_name=other_user.display_name or other_user.full_name,
        other_user_avatar_url=other_user.avatar_url,
        my_relationship_to_them=data.my_relationship_to_them,
        their_relationship_to_me=data.their_relationship_to_me,
        status=relationship.status,
        proposed_by_me=True,
        created_at=relationship.created_at,
        accepted_at=relationship.accepted_at
    )


@router.get("/pending", response_model=List[RelationshipRequestResponse])
def get_pending_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get incoming relationship requests (pending)."""
    # Find relationships where current user is NOT the proposer and status is pending
    relationships = db.query(UserRelationship).filter(
        or_(
            UserRelationship.user_a_id == current_user.id,
            UserRelationship.user_b_id == current_user.id
        ),
        UserRelationship.proposed_by_id != current_user.id,
        UserRelationship.status == "pending"
    ).order_by(UserRelationship.created_at.desc()).all()

    results = []
    for rel in relationships:
        # Get the proposer (the other user)
        proposer_id = rel.proposed_by_id
        proposer = db.query(User).filter(User.id == proposer_id).first()

        if not proposer:
            continue

        # Determine what they call me and what I would call them
        if current_user.id == rel.user_a_id:
            they_call_me = rel.relationship_a_to_b  # How they (B) describe me (A) - wait, no
            # If I'm user_a, proposer is user_b
            # relationship_a_to_b = how A describes B
            # relationship_b_to_a = how B describes A
            # Proposer (B) calls me (A): relationship_b_to_a
            # I (A) would call them (B): relationship_a_to_b
            they_call_me = rel.relationship_b_to_a
            i_would_call_them = rel.relationship_a_to_b
        else:
            # I'm user_b, proposer is user_a
            they_call_me = rel.relationship_a_to_b
            i_would_call_them = rel.relationship_b_to_a

        results.append(RelationshipRequestResponse(
            id=rel.id,
            proposer_id=proposer.id,
            proposer_username=proposer.username,
            proposer_display_name=proposer.display_name or proposer.full_name,
            proposer_avatar_url=proposer.avatar_url,
            they_call_me=they_call_me,
            i_would_call_them=i_would_call_them,
            created_at=rel.created_at
        ))

    return results


@router.get("/pending/count")
def get_pending_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get count of pending relationship requests."""
    count = db.query(UserRelationship).filter(
        or_(
            UserRelationship.user_a_id == current_user.id,
            UserRelationship.user_b_id == current_user.id
        ),
        UserRelationship.proposed_by_id != current_user.id,
        UserRelationship.status == "pending"
    ).count()

    return {"count": count}


@router.get("/sent", response_model=List[RelationshipSentResponse])
def get_sent_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get outgoing relationship requests (sent by me)."""
    relationships = db.query(UserRelationship).filter(
        UserRelationship.proposed_by_id == current_user.id,
        UserRelationship.status == "pending"
    ).order_by(UserRelationship.created_at.desc()).all()

    results = []
    for rel in relationships:
        # Get the recipient (the other user)
        recipient_id = rel.user_a_id if rel.user_b_id == current_user.id else rel.user_b_id
        recipient = db.query(User).filter(User.id == recipient_id).first()

        if not recipient:
            continue

        # Determine what I call them and what they would call me
        if current_user.id == rel.user_a_id:
            i_call_them = rel.relationship_a_to_b
            they_would_call_me = rel.relationship_b_to_a
        else:
            i_call_them = rel.relationship_b_to_a
            they_would_call_me = rel.relationship_a_to_b

        results.append(RelationshipSentResponse(
            id=rel.id,
            recipient_id=recipient.id,
            recipient_username=recipient.username,
            recipient_display_name=recipient.display_name or recipient.full_name,
            recipient_avatar_url=recipient.avatar_url,
            i_call_them=i_call_them,
            they_would_call_me=they_would_call_me,
            status=rel.status,
            created_at=rel.created_at
        ))

    return results


@router.get("", response_model=List[RelationshipResponse])
def get_my_relationships(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all accepted relationships for the current user."""
    relationships = db.query(UserRelationship).filter(
        or_(
            UserRelationship.user_a_id == current_user.id,
            UserRelationship.user_b_id == current_user.id
        ),
        UserRelationship.status == "accepted"
    ).order_by(UserRelationship.accepted_at.desc()).all()

    results = []
    for rel in relationships:
        # Get the other user
        other_user_id = rel.user_a_id if rel.user_b_id == current_user.id else rel.user_b_id
        other_user = db.query(User).filter(User.id == other_user_id).first()

        if not other_user:
            continue

        # Determine relationships from current user's perspective
        if current_user.id == rel.user_a_id:
            my_relationship_to_them = rel.relationship_a_to_b
            their_relationship_to_me = rel.relationship_b_to_a
        else:
            my_relationship_to_them = rel.relationship_b_to_a
            their_relationship_to_me = rel.relationship_a_to_b

        results.append(RelationshipResponse(
            id=rel.id,
            other_user_id=other_user.id,
            other_user_username=other_user.username,
            other_user_display_name=other_user.display_name or other_user.full_name,
            other_user_avatar_url=other_user.avatar_url,
            my_relationship_to_them=my_relationship_to_them,
            their_relationship_to_me=their_relationship_to_me,
            status=rel.status,
            proposed_by_me=(rel.proposed_by_id == current_user.id),
            created_at=rel.created_at,
            accepted_at=rel.accepted_at
        ))

    return results


@router.get("/with/{user_id}", response_model=RelationshipResponse)
def get_relationship_with_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get relationship with a specific user (if any)."""
    user_a_id, user_b_id = get_ordered_user_ids(current_user.id, user_id)

    relationship = db.query(UserRelationship).filter(
        UserRelationship.user_a_id == user_a_id,
        UserRelationship.user_b_id == user_b_id
    ).first()

    if not relationship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No relationship found with this user"
        )

    other_user = db.query(User).filter(User.id == user_id).first()
    if not other_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Determine relationships from current user's perspective
    if current_user.id == relationship.user_a_id:
        my_relationship_to_them = relationship.relationship_a_to_b
        their_relationship_to_me = relationship.relationship_b_to_a
    else:
        my_relationship_to_them = relationship.relationship_b_to_a
        their_relationship_to_me = relationship.relationship_a_to_b

    return RelationshipResponse(
        id=relationship.id,
        other_user_id=other_user.id,
        other_user_username=other_user.username,
        other_user_display_name=other_user.display_name or other_user.full_name,
        other_user_avatar_url=other_user.avatar_url,
        my_relationship_to_them=my_relationship_to_them,
        their_relationship_to_me=their_relationship_to_me,
        status=relationship.status,
        proposed_by_me=(relationship.proposed_by_id == current_user.id),
        created_at=relationship.created_at,
        accepted_at=relationship.accepted_at
    )


@router.post("/{relationship_id}/accept", response_model=RelationshipResponse)
def accept_relationship(
    relationship_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Accept a pending relationship request."""
    relationship = db.query(UserRelationship).filter(
        UserRelationship.id == relationship_id
    ).first()

    if not relationship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Relationship request not found"
        )

    # Verify current user is the recipient (not the proposer)
    if relationship.proposed_by_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot accept your own relationship request"
        )

    # Verify current user is part of this relationship
    if current_user.id not in [relationship.user_a_id, relationship.user_b_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to accept this request"
        )

    if relationship.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Relationship is already {relationship.status}"
        )

    relationship.status = "accepted"
    relationship.accepted_at = datetime.utcnow()
    db.commit()
    db.refresh(relationship)

    # Get the other user for response
    other_user_id = relationship.user_a_id if relationship.user_b_id == current_user.id else relationship.user_b_id
    other_user = db.query(User).filter(User.id == other_user_id).first()

    if current_user.id == relationship.user_a_id:
        my_relationship_to_them = relationship.relationship_a_to_b
        their_relationship_to_me = relationship.relationship_b_to_a
    else:
        my_relationship_to_them = relationship.relationship_b_to_a
        their_relationship_to_me = relationship.relationship_a_to_b

    return RelationshipResponse(
        id=relationship.id,
        other_user_id=other_user.id,
        other_user_username=other_user.username,
        other_user_display_name=other_user.display_name or other_user.full_name,
        other_user_avatar_url=other_user.avatar_url,
        my_relationship_to_them=my_relationship_to_them,
        their_relationship_to_me=their_relationship_to_me,
        status=relationship.status,
        proposed_by_me=False,
        created_at=relationship.created_at,
        accepted_at=relationship.accepted_at
    )


@router.post("/{relationship_id}/reject")
def reject_relationship(
    relationship_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject a pending relationship request."""
    relationship = db.query(UserRelationship).filter(
        UserRelationship.id == relationship_id
    ).first()

    if not relationship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Relationship request not found"
        )

    # Verify current user is the recipient (not the proposer)
    if relationship.proposed_by_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot reject your own relationship request"
        )

    # Verify current user is part of this relationship
    if current_user.id not in [relationship.user_a_id, relationship.user_b_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to reject this request"
        )

    if relationship.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Relationship is already {relationship.status}"
        )

    relationship.status = "rejected"
    db.commit()

    return {"message": "Relationship request rejected"}


@router.delete("/{relationship_id}")
def delete_relationship(
    relationship_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a relationship (either party can do this)."""
    relationship = db.query(UserRelationship).filter(
        UserRelationship.id == relationship_id
    ).first()

    if not relationship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Relationship not found"
        )

    # Verify current user is part of this relationship
    if current_user.id not in [relationship.user_a_id, relationship.user_b_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this relationship"
        )

    db.delete(relationship)
    db.commit()

    return {"message": "Relationship deleted"}


@router.get("/types")
def get_relationship_types():
    """Get list of available relationship types."""
    return {"types": RELATIONSHIP_TYPES}
