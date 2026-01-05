from pydantic import BaseModel
from datetime import datetime
from typing import Optional


# Available relationship types
RELATIONSHIP_TYPES = [
    "wife", "husband",
    "daughter", "son", "child",
    "mother", "father", "parent",
    "sister", "brother", "sibling",
    "grandmother", "grandfather", "grandparent",
    "granddaughter", "grandson", "grandchild",
    "aunt", "uncle",
    "niece", "nephew",
    "cousin",
    "mother-in-law", "father-in-law",
    "daughter-in-law", "son-in-law",
    "sister-in-law", "brother-in-law",
    "stepmother", "stepfather",
    "stepdaughter", "stepson",
    "friend",
]


class RelationshipPropose(BaseModel):
    """Request to propose a relationship to another user."""
    other_user_id: int
    my_relationship_to_them: str  # What I call them (e.g., "wife")
    their_relationship_to_me: str  # What they call me (e.g., "husband")


class RelationshipResponse(BaseModel):
    """Response for a verified relationship."""
    id: int
    other_user_id: int
    other_user_username: str
    other_user_display_name: Optional[str] = None
    other_user_avatar_url: Optional[str] = None
    my_relationship_to_them: str  # What I call them
    their_relationship_to_me: str  # What they call me
    status: str
    proposed_by_me: bool
    created_at: datetime
    accepted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RelationshipRequestResponse(BaseModel):
    """Response for incoming relationship requests (pending)."""
    id: int
    proposer_id: int
    proposer_username: str
    proposer_display_name: Optional[str] = None
    proposer_avatar_url: Optional[str] = None
    they_call_me: str  # How they describe me
    i_would_call_them: str  # How they want me to describe them
    created_at: datetime

    class Config:
        from_attributes = True


class RelationshipSentResponse(BaseModel):
    """Response for outgoing relationship requests (pending)."""
    id: int
    recipient_id: int
    recipient_username: str
    recipient_display_name: Optional[str] = None
    recipient_avatar_url: Optional[str] = None
    i_call_them: str  # How I describe them
    they_would_call_me: str  # How I said they should describe me
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
