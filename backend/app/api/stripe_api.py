from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import stripe

from ..core.database import get_db
from ..core.config import settings
from ..core.deps import get_current_user
from ..models.user import User

router = APIRouter(prefix="/stripe", tags=["stripe"])

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


class CheckoutRequest(BaseModel):
    price_id: str  # 'monthly', 'annual', or 'lifetime'
    success_url: str
    cancel_url: str


class CheckoutResponse(BaseModel):
    checkout_url: str


class PortalResponse(BaseModel):
    portal_url: str


def get_price_id(price_type: str) -> str:
    """Map price type to Stripe price ID"""
    price_map = {
        'monthly': settings.STRIPE_PRICE_MONTHLY,
        'annual': settings.STRIPE_PRICE_ANNUAL,
        'lifetime': settings.STRIPE_PRICE_LIFETIME
    }
    if price_type not in price_map:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid price type: {price_type}. Must be 'monthly', 'annual', or 'lifetime'"
        )
    return price_map[price_type]


@router.post("/create-checkout-session", response_model=CheckoutResponse)
def create_checkout_session(
    request: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a Stripe Checkout session for subscription or one-time purchase"""

    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe is not configured"
        )

    price_id = get_price_id(request.price_id)
    is_lifetime = request.price_id == 'lifetime'

    # Get or create Stripe customer
    if current_user.stripe_customer_id:
        customer_id = current_user.stripe_customer_id
    else:
        # Create a new Stripe customer
        customer = stripe.Customer.create(
            email=current_user.email,
            name=current_user.display_name or current_user.username,
            metadata={
                'user_id': str(current_user.id),
                'username': current_user.username
            }
        )
        customer_id = customer.id

        # Save customer ID to user
        current_user.stripe_customer_id = customer_id
        db.commit()

    # Build checkout session parameters
    checkout_params = {
        'customer': customer_id,
        'line_items': [{
            'price': price_id,
            'quantity': 1
        }],
        'success_url': request.success_url + '?session_id={CHECKOUT_SESSION_ID}',
        'cancel_url': request.cancel_url,
        'metadata': {
            'user_id': str(current_user.id),
            'price_type': request.price_id
        }
    }

    if is_lifetime:
        # One-time payment for lifetime
        checkout_params['mode'] = 'payment'
    else:
        # Subscription with 30-day trial
        checkout_params['mode'] = 'subscription'
        checkout_params['subscription_data'] = {
            'trial_period_days': 30,
            'metadata': {
                'user_id': str(current_user.id),
                'price_type': request.price_id
            }
        }

        # Check for early bird bonus (within first 5 days of trial)
        if current_user.is_within_first_5_days():
            # Give extra 30 days (60 total) for early subscribers
            checkout_params['subscription_data']['trial_period_days'] = 60

    try:
        checkout_session = stripe.checkout.Session.create(**checkout_params)
        return CheckoutResponse(checkout_url=checkout_session.url)
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/create-portal-session", response_model=PortalResponse)
def create_portal_session(
    return_url: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a Stripe Customer Portal session for managing subscription"""

    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe is not configured"
        )

    if not current_user.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No subscription found. Please subscribe first."
        )

    try:
        portal_session = stripe.billing_portal.Session.create(
            customer=current_user.stripe_customer_id,
            return_url=return_url
        )
        return PortalResponse(portal_url=portal_session.url)
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe webhook events"""

    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')

    # Verify webhook signature if secret is configured
    if settings.STRIPE_WEBHOOK_SECRET:
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        # For testing without webhook secret
        import json
        event = json.loads(payload)

    event_type = event.get('type') if isinstance(event, dict) else event.type
    data = event.get('data', {}).get('object', {}) if isinstance(event, dict) else event.data.object

    print(f"Stripe webhook received: {event_type}")

    # Handle different event types
    if event_type == 'checkout.session.completed':
        await handle_checkout_completed(data, db)
    elif event_type == 'customer.subscription.created':
        await handle_subscription_created(data, db)
    elif event_type == 'customer.subscription.updated':
        await handle_subscription_updated(data, db)
    elif event_type == 'customer.subscription.deleted':
        await handle_subscription_deleted(data, db)
    elif event_type == 'invoice.payment_succeeded':
        await handle_payment_succeeded(data, db)
    elif event_type == 'invoice.payment_failed':
        await handle_payment_failed(data, db)

    return {"status": "ok"}


async def handle_checkout_completed(session, db: Session):
    """Handle successful checkout - update user subscription"""

    customer_id = session.get('customer')
    metadata = session.get('metadata', {})
    user_id = metadata.get('user_id')
    price_type = metadata.get('price_type')
    mode = session.get('mode')

    if not user_id:
        # Try to find user by customer ID
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
    else:
        user = db.query(User).filter(User.id == int(user_id)).first()

    if not user:
        print(f"Webhook error: User not found for checkout session")
        return

    # Update user's Stripe customer ID if not set
    if not user.stripe_customer_id:
        user.stripe_customer_id = customer_id

    if mode == 'payment':
        # Lifetime purchase - one-time payment
        user.subscription_tier = 'premium'
        user.subscription_status = 'active'
        user.subscription_started_at = datetime.utcnow()
        user.subscription_ends_at = None  # Never expires

        # Check early bird bonus
        if user.is_within_first_5_days():
            user.subscribed_within_5_days = True

    # For subscriptions, the subscription.created/updated events will handle the rest

    db.commit()
    print(f"Checkout completed for user {user.id} ({user.email})")


async def handle_subscription_created(subscription, db: Session):
    """Handle new subscription creation"""

    customer_id = subscription.get('customer')
    subscription_id = subscription.get('id')
    status = subscription.get('status')

    user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
    if not user:
        print(f"Webhook error: User not found for customer {customer_id}")
        return

    user.stripe_subscription_id = subscription_id

    # Map Stripe status to our status
    if status in ['trialing', 'active']:
        user.subscription_status = 'active'
        user.subscription_tier = 'premium'
        user.subscription_started_at = datetime.utcnow()

        # Check early bird bonus
        if user.is_within_first_5_days():
            user.subscribed_within_5_days = True

    # Set subscription end date from Stripe
    current_period_end = subscription.get('current_period_end')
    if current_period_end:
        user.subscription_ends_at = datetime.fromtimestamp(current_period_end)

    db.commit()
    print(f"Subscription created for user {user.id}: status={status}")


async def handle_subscription_updated(subscription, db: Session):
    """Handle subscription updates (status changes, renewals)"""

    customer_id = subscription.get('customer')
    subscription_id = subscription.get('id')
    status = subscription.get('status')
    cancel_at_period_end = subscription.get('cancel_at_period_end', False)

    user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
    if not user:
        print(f"Webhook error: User not found for customer {customer_id}")
        return

    user.stripe_subscription_id = subscription_id

    # Map Stripe status to our status
    if status in ['trialing', 'active']:
        # Check if user has scheduled cancellation
        if cancel_at_period_end:
            user.subscription_status = 'canceled'  # Will expire at period end
        else:
            user.subscription_status = 'active'
        user.subscription_tier = 'premium'
    elif status == 'past_due':
        user.subscription_status = 'active'  # Keep active, payment will retry
    elif status in ['canceled', 'unpaid']:
        user.subscription_status = 'canceled'

    # Update subscription end date
    current_period_end = subscription.get('current_period_end')
    if current_period_end:
        user.subscription_ends_at = datetime.fromtimestamp(current_period_end)

    db.commit()
    print(f"Subscription updated for user {user.id}: status={status}, cancel_at_period_end={cancel_at_period_end}")


async def handle_subscription_deleted(subscription, db: Session):
    """Handle subscription cancellation/deletion"""

    customer_id = subscription.get('customer')

    user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
    if not user:
        print(f"Webhook error: User not found for customer {customer_id}")
        return

    user.subscription_status = 'expired'
    user.subscription_tier = 'free'
    user.stripe_subscription_id = None

    db.commit()
    print(f"Subscription deleted for user {user.id}")


async def handle_payment_succeeded(invoice, db: Session):
    """Handle successful recurring payment"""

    customer_id = invoice.get('customer')
    subscription_id = invoice.get('subscription')

    user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
    if not user:
        return

    # Ensure subscription is active
    user.subscription_status = 'active'
    user.subscription_tier = 'premium'

    db.commit()
    print(f"Payment succeeded for user {user.id}")


async def handle_payment_failed(invoice, db: Session):
    """Handle failed recurring payment"""

    customer_id = invoice.get('customer')

    user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
    if not user:
        return

    # Don't immediately revoke access - Stripe will retry
    # Just log it for now
    print(f"Payment failed for user {user.id} ({user.email})")


@router.get("/subscription-status")
def get_subscription_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's subscription status"""

    return {
        "subscription_status": current_user.subscription_status,
        "subscription_tier": current_user.subscription_tier,
        "stripe_customer_id": current_user.stripe_customer_id,
        "stripe_subscription_id": current_user.stripe_subscription_id,
        "subscription_started_at": current_user.subscription_started_at,
        "subscription_ends_at": current_user.subscription_ends_at,
        "trial_days_remaining": current_user.get_trial_days_remaining(),
        "is_within_first_5_days": current_user.is_within_first_5_days(),
        "can_access_content": current_user.can_access_content(),
        "has_active_subscription": current_user.has_active_subscription(),
        "subscribed_within_5_days": current_user.subscribed_within_5_days
    }
