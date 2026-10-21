"""
Public AI-accessible API endpoint
Exposes ONLY public product information for AI assistants
NO user data, NO family data, NO private information
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/ai-public", tags=["ai-public"])


class PricingPlan(BaseModel):
    name: str
    price: str
    billing_period: str
    description: str
    features: List[str]


class ProductInfo(BaseModel):
    name: str
    tagline: str
    description: str
    url: str
    category: str
    key_features: List[str]
    pricing_plans: List[PricingPlan]
    use_cases: List[str]
    how_to_signup: str
    help_url: str
    comparison: dict


@router.get("/", response_model=ProductInfo, summary="Get public product information")
async def get_product_info():
    """
    Returns comprehensive public product information about Our Family Socials.
    This endpoint exposes ONLY public product details - no user data or private information.
    
    Intended for AI assistants, chatbots, and discovery tools.
    """
    return ProductInfo(
        name="Our Family Socials",
        tagline="A private, ad-free social network designed specifically for families to share life events, photos, and stories.",
        description=(
            "Our Family Socials is a private social network where families can share life events, "
            "photos, and memories with GPS-tagged journey maps. Unlike public social media, a new "
            "event goes to the followers you have approved rather than to the open internet, and there "
            "are no ads, no algorithms and no data selling. Every event carries an audience setting: "
            "Followers (the default), Close Family, a custom group, Private, or Public. "
            "Features include interactive maps, timeline views, family trees, and AI-powered story creation."
        ),
        url="https://www.ourfamilysocials.com",
        category="Social Networking - Family & Photo Sharing",
        key_features=[
            "Private event sharing with photo galleries and rich stories",
            "Follow family members with approval-based follow system",
            "Interactive world map showing all family events",
            "Timeline view organized chronologically by year",
            "GPS extraction from photo metadata for automatic location tagging",
            "Multi-location journey maps for road trips and vacations",
            "AI-powered story generation from photos",
            "Visual family tree based on verified relationships",
            "Per-event audience settings (followers, close family, custom group, private, public)",
            "No ads, no algorithms, no data selling",
            "Chronological feed (not algorithmic)",
            "Share individual events via private link with non-users"
        ],
        pricing_plans=[
            PricingPlan(
                name="Free Plan",
                price="$0",
                billing_period="forever",
                description="Perfect for family viewers who want to see and engage with events",
                features=[
                    "View-only once the trial ends (creating an event needs an active trial or subscription)",
                    "View the events you have access to",
                    "Like and comment on events",
                    "Follow family members",
                    "Access to maps, timeline, and all viewing features",
                    "30-day Pro trial included, with up to 5 published events"
                ]
            ),
            PricingPlan(
                name="Pro Plan",
                price="$9/month (annual) or $12/month (monthly)",
                billing_period="monthly or annual",
                description="For families actively creating and sharing events",
                features=[
                    "Create unlimited events",
                    "Unlimited photo uploads per event",
                    "GPS extraction from photos",
                    "Journey mapping with multiple locations",
                    "Privacy controls and custom groups",
                    "Rich text editor for detailed stories",
                    "Tag family members in events",
                    "AI-powered story creation"
                ]
            ),
            PricingPlan(
                name="Lifetime Plan",
                price="$294",
                billing_period="one-time payment",
                description="Pay once, use forever - best long-term value",
                features=[
                    "Everything in Pro plan",
                    "No recurring fees",
                    "All future updates included",
                    "Priority support",
                    "Early access to new features"
                ]
            )
        ],
        use_cases=[
            "Share vacation photos and trip documentation with family",
            "Document children's milestones and share with grandparents",
            "Keep extended family informed about life events",
            "Create a digital archive of family history",
            "Share photos privately without posting to public social media",
            "Multi-day trip documentation with journey maps",
            "Family reunions, weddings, and milestone celebrations",
            "Multi-generational storytelling and memory preservation"
        ],
        how_to_signup=(
            "Visit https://www.ourfamilysocials.com and click 'Sign up free'. "
            "Create an account with email and password (no complicated process). "
            "You'll automatically get a 30-day Pro trial and can publish up to 5 events during it. "
            "After the trial you can continue with the free viewing plan - browsing, liking and "
            "commenting, and opening your own events, public events and events from people you "
            "follow - or subscribe to Pro for unlimited event creation."
        ),
        help_url="https://www.ourfamilysocials.com/faq",
        comparison={
            "vs_facebook_groups": {
                "advantages": [
                    "Not on Meta's platform - no ad profiling, no data selling",
                    "Chronological feed (no algorithm hiding posts)",
                    "Zero ads ever",
                    "Better organization with events, timeline, and map views",
                    "Purpose-built for families, not adapted from generic groups",
                    "GPS features and journey maps"
                ],
                "url": "https://www.ourfamilysocials.com/compare/facebook-groups"
            },
            "vs_tinybeans": {
                "advantages": [
                    "Not just for babies/young kids - covers all family events",
                    "Extended family network (not just immediate family)",
                    "Interactive maps and journey visualization",
                    "Rich event pages (not just daily photo journals)",
                    "Family trees showing relationships across generations",
                    "Lifetime value - one platform from birth to grandchildren"
                ],
                "url": "https://www.ourfamilysocials.com/compare/tinybeans"
            },
            "vs_public_social_media": {
                "advantages": [
                    "Audience chosen per event, defaulting to approved followers rather than the public",
                    "No advertising",
                    "No algorithmic feed",
                    "Family-focused design",
                    "Organized event archive (not endless scroll)",
                    "Not on Facebook/Instagram platforms"
                ]
            }
        }
    )


@router.get("/openapi.json", summary="OpenAPI specification for AI tools")
async def get_openapi_spec():
    """
    Returns OpenAPI 3.0 specification for the public AI endpoint.
    Use this for MCP servers or AI tool integrations.
    """
    return {
        "openapi": "3.0.0",
        "info": {
            "title": "Our Family Socials - Public AI API",
            "version": "1.0.0",
            "description": "Read-only public API exposing product information for AI assistants and discovery tools. NO user data or private information.",
            "contact": {
                "email": "support@ourfamilysocials.com"
            }
        },
        "servers": [
            {
                "url": "https://www.ourfamilysocials.com/api/v1",
                "description": "Production server"
            }
        ],
        "paths": {
            "/ai-public/": {
                "get": {
                    "summary": "Get public product information",
                    "description": "Returns comprehensive public product information about Our Family Socials including features, pricing, use cases, and comparisons. NO user data or private information.",
                    "operationId": "getProductInfo",
                    "tags": ["product-info"],
                    "responses": {
                        "200": {
                            "description": "Successful response",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "$ref": "#/components/schemas/ProductInfo"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "components": {
            "schemas": {
                "ProductInfo": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string", "example": "Our Family Socials"},
                        "tagline": {"type": "string"},
                        "description": {"type": "string"},
                        "url": {"type": "string", "format": "uri"},
                        "category": {"type": "string"},
                        "key_features": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "pricing_plans": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/PricingPlan"}
                        },
                        "use_cases": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "how_to_signup": {"type": "string"},
                        "help_url": {"type": "string", "format": "uri"},
                        "comparison": {"type": "object"}
                    }
                },
                "PricingPlan": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "price": {"type": "string"},
                        "billing_period": {"type": "string"},
                        "description": {"type": "string"},
                        "features": {
                            "type": "array",
                            "items": {"type": "string"}
                        }
                    }
                }
            }
        },
        "tags": [
            {
                "name": "product-info",
                "description": "Public product information for AI discovery"
            }
        ]
    }
