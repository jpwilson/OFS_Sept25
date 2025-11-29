from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..core.database import get_db
from ..core.deps import get_current_user
from ..models.user import User
from ..models.custom_group import CustomGroup, CustomGroupMember
from ..models.follow import Follow
from ..schemas.custom_group import (
    CustomGroupCreate,
    CustomGroupUpdate,
    CustomGroup as CustomGroupSchema,
    CustomGroupSummary,
    CustomGroupMember as CustomGroupMemberSchema
)

router = APIRouter()

@router.get("/", response_model=List[CustomGroupSummary])
def get_my_custom_groups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all custom groups owned by current user"""
    groups = db.query(CustomGroup).filter(
        CustomGroup.owner_id == current_user.id
    ).all()

    result = []
    for group in groups:
        member_count = db.query(CustomGroupMember).filter(
            CustomGroupMember.group_id == group.id
        ).count()

        result.append({
            "id": group.id,
            "name": group.name,
            "member_count": member_count
        })

    return result

@router.get("/{group_id}", response_model=CustomGroupSchema)
def get_custom_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific custom group with members"""
    group = db.query(CustomGroup).filter(
        CustomGroup.id == group_id,
        CustomGroup.owner_id == current_user.id
    ).first()

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Get members with user details
    members_data = db.query(
        CustomGroupMember.id,
        CustomGroupMember.group_id,
        CustomGroupMember.user_id,
        CustomGroupMember.added_at,
        User.username,
        User.full_name,
        User.avatar_url
    ).join(
        User, CustomGroupMember.user_id == User.id
    ).filter(
        CustomGroupMember.group_id == group_id
    ).all()

    members = []
    for member_data in members_data:
        members.append({
            "id": member_data[0],
            "group_id": member_data[1],
            "user_id": member_data[2],
            "added_at": member_data[3],
            "username": member_data[4],
            "full_name": member_data[5],
            "avatar_url": member_data[6]
        })

    return {
        "id": group.id,
        "owner_id": group.owner_id,
        "name": group.name,
        "description": group.description,
        "created_at": group.created_at,
        "updated_at": group.updated_at,
        "member_count": len(members),
        "members": members
    }

@router.post("/", response_model=CustomGroupSchema)
def create_custom_group(
    group_data: CustomGroupCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new custom group"""
    # Check if group with same name already exists for this user
    existing = db.query(CustomGroup).filter(
        CustomGroup.owner_id == current_user.id,
        CustomGroup.name == group_data.name
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Group with this name already exists")

    # Create the group
    new_group = CustomGroup(
        owner_id=current_user.id,
        name=group_data.name,
        description=group_data.description
    )
    db.add(new_group)
    db.commit()
    db.refresh(new_group)

    # Add members if provided
    members = []
    if group_data.member_ids:
        for user_id in group_data.member_ids:
            # Verify user exists and current user follows them
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                continue

            # Check if current user follows this person
            follow = db.query(Follow).filter(
                Follow.follower_id == current_user.id,
                Follow.following_id == user_id,
                Follow.status == "accepted"
            ).first()

            if not follow:
                continue  # Skip non-followers

            member = CustomGroupMember(
                group_id=new_group.id,
                user_id=user_id
            )
            db.add(member)
            members.append({
                "id": None,  # Will be set after commit
                "group_id": new_group.id,
                "user_id": user_id,
                "added_at": member.added_at,
                "username": user.username,
                "full_name": user.full_name,
                "avatar_url": user.avatar_url
            })

        db.commit()

    return {
        "id": new_group.id,
        "owner_id": new_group.owner_id,
        "name": new_group.name,
        "description": new_group.description,
        "created_at": new_group.created_at,
        "updated_at": new_group.updated_at,
        "member_count": len(members),
        "members": members
    }

@router.patch("/{group_id}", response_model=CustomGroupSchema)
def update_custom_group(
    group_id: int,
    group_data: CustomGroupUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a custom group"""
    group = db.query(CustomGroup).filter(
        CustomGroup.id == group_id,
        CustomGroup.owner_id == current_user.id
    ).first()

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if group_data.name is not None:
        # Check if new name conflicts with another group
        existing = db.query(CustomGroup).filter(
            CustomGroup.owner_id == current_user.id,
            CustomGroup.name == group_data.name,
            CustomGroup.id != group_id
        ).first()

        if existing:
            raise HTTPException(status_code=400, detail="Group with this name already exists")

        group.name = group_data.name

    if group_data.description is not None:
        group.description = group_data.description

    db.commit()
    db.refresh(group)

    # Get member count
    member_count = db.query(CustomGroupMember).filter(
        CustomGroupMember.group_id == group_id
    ).count()

    return {
        "id": group.id,
        "owner_id": group.owner_id,
        "name": group.name,
        "description": group.description,
        "created_at": group.created_at,
        "updated_at": group.updated_at,
        "member_count": member_count,
        "members": []
    }

@router.delete("/{group_id}")
def delete_custom_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a custom group"""
    group = db.query(CustomGroup).filter(
        CustomGroup.id == group_id,
        CustomGroup.owner_id == current_user.id
    ).first()

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    db.delete(group)
    db.commit()

    return {"message": "Group deleted successfully"}

@router.post("/{group_id}/members/{user_id}")
def add_group_member(
    group_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a member to a custom group"""
    # Verify group ownership
    group = db.query(CustomGroup).filter(
        CustomGroup.id == group_id,
        CustomGroup.owner_id == current_user.id
    ).first()

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Verify user exists and current user follows them
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    follow = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.following_id == user_id,
        Follow.status == "accepted"
    ).first()

    if not follow:
        raise HTTPException(status_code=400, detail="Can only add followers to groups")

    # Check if already a member
    existing = db.query(CustomGroupMember).filter(
        CustomGroupMember.group_id == group_id,
        CustomGroupMember.user_id == user_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="User is already a member")

    # Add member
    member = CustomGroupMember(
        group_id=group_id,
        user_id=user_id
    )
    db.add(member)
    db.commit()

    return {"message": "Member added successfully"}

@router.delete("/{group_id}/members/{user_id}")
def remove_group_member(
    group_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a member from a custom group"""
    # Verify group ownership
    group = db.query(CustomGroup).filter(
        CustomGroup.id == group_id,
        CustomGroup.owner_id == current_user.id
    ).first()

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Remove member
    member = db.query(CustomGroupMember).filter(
        CustomGroupMember.group_id == group_id,
        CustomGroupMember.user_id == user_id
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found in group")

    db.delete(member)
    db.commit()

    return {"message": "Member removed successfully"}
