"""
Response and request shapes for /api/v1/admin/analytics (docs/app/ADMIN-ANALYTICS.md).
The keys are the contract with the admin page: frontend/scripts/daylight/fixtures/admin-contract.json.
Times are strings that always carry Z or an offset.
"""
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------- overview

class OverviewSources(BaseModel):
    auth: bool
    signins: Optional[Literal["audit_log", "sessions"]] = None


class SignupPoint(BaseModel):
    t: str
    partial: bool
    started: Optional[int] = None
    profiles: int
    email: Optional[int] = None
    google: Optional[int] = None
    other: int
    invited: int
    organic: int


class SignupTotals(BaseModel):
    started: Optional[int] = None
    profiles: int
    email: Optional[int] = None
    google: Optional[int] = None
    other: int
    invited: int
    organic: int


class Signups(BaseModel):
    series: List[SignupPoint]
    totals: SignupTotals


class FunnelSteps(BaseModel):
    accounts: Optional[int] = None
    confirmed: Optional[int] = None
    profiles: Optional[int] = None
    with_story: Optional[int] = None
    with_published: Optional[int] = None


class FunnelByMethod(BaseModel):
    email: FunnelSteps
    google: FunnelSteps


class Funnel(BaseModel):
    steps: FunnelSteps
    by_method: FunnelByMethod
    unfinished: Optional[int] = None


class SigninPoint(BaseModel):
    t: str
    partial: bool
    signins: Optional[int] = None
    members: Optional[int] = None
    google: Optional[int] = None
    email: Optional[int] = None
    active: Optional[int] = None


class SigninTotals(BaseModel):
    signins: Optional[int] = None
    members: Optional[int] = None
    active: Optional[int] = None


class Signins(BaseModel):
    series: List[SigninPoint]
    totals: SigninTotals
    note: Optional[str] = None


class Activity(BaseModel):
    members: int
    active_24h: int
    active_7d: int
    active_30d: int
    signed_in_24h: Optional[int] = None
    signed_in_7d: Optional[int] = None
    last_login_rows: int
    last_login_latest: Optional[str] = None


class Overview(BaseModel):
    range: str
    interval: str
    tz: str
    start: str
    end: str
    generated_at: str
    sources: OverviewSources
    signups: Signups
    funnel: Funnel
    signins: Signins
    activity: Activity


# ---------------------------------------------------------------- members

class MembersQuery(BaseModel):
    """POST body, so search text stays out of URLs and logs."""
    q: Optional[str] = Field(None, max_length=200)
    method: Optional[Literal["email", "google", "legacy"]] = None
    source: Optional[Literal["invited", "organic"]] = None
    plan: Optional[Literal["trial", "trial_ended", "paid", "canceled", "viewer", "legacy"]] = None
    activity: Optional[Literal["active_7d", "quiet_30d"]] = None
    stories: Optional[Literal["has", "none"]] = None
    confirmed: Optional[bool] = None
    joined: Literal["24h", "7d", "30d", "90d", "all"] = "all"
    include_staff: bool = False
    sort: Literal["joined", "last_active", "last_sign_in", "stories", "name"] = "joined"
    order: Literal["desc", "asc"] = "desc"
    page: int = Field(1, ge=1)
    page_size: int = Field(25, ge=1)

    @field_validator("q")
    @classmethod
    def _blank_is_none(cls, v):
        v = (v or "").strip()
        return v or None

    @field_validator("page_size")
    @classmethod
    def _at_most_100(cls, v):
        return min(v, 100)


class MemberSources(BaseModel):
    auth: bool


class InvitedBy(BaseModel):
    id: int
    username: str
    display_name: Optional[str] = None


class Plan(BaseModel):
    state: Literal["viewer", "paid", "canceled", "legacy", "trial", "trial_ended"]
    tier: Optional[str] = None
    status: Optional[str] = None
    trial_ends_at: Optional[str] = None


class Member(BaseModel):
    id: int
    username: str
    display_name: Optional[str] = None
    email: str
    avatar_url: Optional[str] = None
    joined_at: Optional[str] = None
    last_sign_in_at: Optional[str] = None
    last_active_at: Optional[str] = None
    email_confirmed: Optional[bool] = None
    method: Optional[Literal["email", "google", "other", "legacy"]] = None
    invited_by: Optional[InvitedBy] = None
    plan: Plan
    stories: int
    published: int
    is_superuser: bool


class MembersPage(BaseModel):
    total: int
    page: int
    page_size: int
    sources: MemberSources
    members: List[Member]


# ---------------------------------------------------------------- unfinished

class UnfinishedAccount(BaseModel):
    created_at: Optional[str] = None
    confirmed: bool
    method: Literal["email", "google", "other"]
    email: Optional[str] = None


class Unfinished(BaseModel):
    available: bool
    accounts: List[UnfinishedAccount]


# ---------------------------------------------------------------- visitors (three shapes)

class VisitorLinks(BaseModel):
    posthog: str
    vercel_analytics: str


class VisitorsNotConfigured(BaseModel):
    configured: Literal[False] = False
    missing: List[str]
    links: VisitorLinks


class VisitorsFailed(BaseModel):
    configured: Literal[True] = True
    ok: Literal[False] = False
    error: str


class VisitorPoint(BaseModel):
    t: str
    partial: bool
    visitors: int
    pageviews: int


class VisitorTotals(BaseModel):
    visitors: int
    pageviews: int
    landing_cta: int
    signed_up: int


class Referrer(BaseModel):
    domain: str
    label: str
    visitors: int


class UtmSource(BaseModel):
    source: str
    visitors: int


class Visitors(BaseModel):
    configured: Literal[True] = True
    ok: Literal[True] = True
    interval: str
    cached_at: str
    series: List[VisitorPoint]
    totals: VisitorTotals
    referrers: List[Referrer]
    utm_sources: List[UtmSource]
