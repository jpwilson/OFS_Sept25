"""
Subscription management endpoints using Stripe
Handles checkout sessions, customer portal, and subscription status
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
import stripe

from ..core.database import get_db
from ..core.deps import get_current_user
from ..core.config import settings
from ..models.user import User
from pydantic import BaseModel

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


class CheckoutSessionRequest(BaseModel):
    billing_period: str  # 'monthly' or 'annual'
    success_url: str
    cancel_url: str


class CheckoutSessionResponse(BaseModel):
    checkout_url: str
    session_id: str


class PortalSessionResponse(BaseModel):
    portal_url: str


class SubscriptionStatusResponse(BaseModel):
    subscription_status: str
    trial_end_date: Optional[datetime]
    subscription_period_end: Optional[datetime]
    cancel_at_period_end: bool
    days_until_trial_end: Optional[int]
    days_until_period_end: Optional[int]


@router.post("/create-checkout", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    request: CheckoutSessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a Stripe Checkout session for subscription with 90-day trial
    """
    try:
        # Determine which price ID to use based on billing period
        if request.billing_period == 'monthly':
            price_id = settings.STRIPE_PRO_MONTHLY_PRICE_ID
        elif request.billing_period == 'annual':
            price_id = settings.STRIPE_PRO_ANNUAL_PRICE_ID
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="billing_period must be 'monthly' or 'annual'"
            )

        # Check if user already has a subscription
        if current_user.subscription_status in ['active', 'trialing']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You already have an active subscription"
            )

        # Create or retrieve Stripe customer
        if current_user.stripe_customer_id:
            customer_id = current_user.stripe_customer_id
        else:
            customer = stripe.Customer.create(
                email=current_user.email,
                name=current_user.full_name or current_user.username,
                metadata={
                    'user_id': current_user.id,
                    'username': current_user.username
                }
            )
            customer_id = customer.id

            # Save customer ID to database
            current_user.stripe_customer_id = customer_id
            db.commit()

        # Create Checkout Session with 90-day trial
        checkout_session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=request.success_url,
            cancel_url=request.cancel_url,
            subscription_data={
                'trial_period_days': 90,  # 90-day trial
                'metadata': {
                    'user_id': current_user.id,
                    'username': current_user.username
                }
            },
            metadata={
                'user_id': current_user.id,
                'username': current_user.username
            },
            allow_promotion_codes=True,  # Allow discount codes
        )

        return CheckoutSessionResponse(
            checkout_url=checkout_session.url,
            session_id=checkout_session.id
        )

    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating checkout session: {str(e)}"
        )


@router.post("/create-portal", response_model=PortalSessionResponse)
async def create_portal_session(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a Stripe Customer Portal session for managing subscription
    User can update payment method, view invoices, cancel subscription
    """
    try:
        if not current_user.stripe_customer_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No Stripe customer found. Please subscribe first."
            )

        # Create portal session
        portal_session = stripe.billing_portal.Session.create(
            customer=current_user.stripe_customer_id,
            return_url=f"{settings.CORS_ORIGINS.split(',')[0]}/billing",  # Return to billing page
        )

        return PortalSessionResponse(portal_url=portal_session.url)

    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating portal session: {str(e)}"
        )


@router.get("/status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current subscription status for the user
    """
    # Calculate days until trial/period end
    days_until_trial_end = None
    days_until_period_end = None

    if current_user.trial_end_date:
        delta = current_user.trial_end_date - datetime.utcnow()
        days_until_trial_end = max(0, delta.days)

    if current_user.subscription_period_end:
        delta = current_user.subscription_period_end - datetime.utcnow()
        days_until_period_end = max(0, delta.days)

    return SubscriptionStatusResponse(
        subscription_status=current_user.subscription_status or 'inactive',
        trial_end_date=current_user.trial_end_date,
        subscription_period_end=current_user.subscription_period_end,
        cancel_at_period_end=current_user.subscription_cancel_at_period_end or False,
        days_until_trial_end=days_until_trial_end,
        days_until_period_end=days_until_period_end
    )


@router.post("/cancel")
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel subscription at period end (won't charge again)
    Note: Use Customer Portal for immediate cancellation
    """
    try:
        if not current_user.stripe_subscription_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No active subscription found"
            )

        # Cancel subscription at period end (don't end immediately)
        subscription = stripe.Subscription.modify(
            current_user.stripe_subscription_id,
            cancel_at_period_end=True
        )

        # Update database
        current_user.subscription_cancel_at_period_end = True
        db.commit()

        return {
            "message": "Subscription will be canceled at the end of the billing period",
            "period_end": subscription.current_period_end
        }

    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error canceling subscription: {str(e)}"
        )


@router.post("/reactivate")
async def reactivate_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Reactivate a subscription that was set to cancel at period end
    """
    try:
        if not current_user.stripe_subscription_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No subscription found"
            )

        if not current_user.subscription_cancel_at_period_end:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Subscription is not set to cancel"
            )

        # Remove cancellation
        subscription = stripe.Subscription.modify(
            current_user.stripe_subscription_id,
            cancel_at_period_end=False
        )

        # Update database
        current_user.subscription_cancel_at_period_end = False
        db.commit()

        return {
            "message": "Subscription reactivated successfully",
            "period_end": subscription.current_period_end
        }

    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reactivating subscription: {str(e)}"
        )
