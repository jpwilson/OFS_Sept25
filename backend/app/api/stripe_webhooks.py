"""
Stripe webhook handler
Processes Stripe events (checkout completed, subscription updated, etc.)
"""
from fastapi import APIRouter, Request, HTTPException, Depends, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import stripe
import json

from ..core.database import get_db
from ..core.config import settings
from ..models.user import User

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


@router.post("/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Handle Stripe webhook events
    Stripe sends events for: checkout completion, subscription changes, payment failures, etc.
    """
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')

    try:
        # Verify webhook signature
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        # Invalid payload
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature")

    # Handle the event
    event_type = event['type']
    data_object = event['data']['object']

    print(f"[STRIPE WEBHOOK] Received event: {event_type}")

    try:
        if event_type == 'checkout.session.completed':
            handle_checkout_completed(data_object, db)

        elif event_type == 'customer.subscription.created':
            handle_subscription_created(data_object, db)

        elif event_type == 'customer.subscription.updated':
            handle_subscription_updated(data_object, db)

        elif event_type == 'customer.subscription.deleted':
            handle_subscription_deleted(data_object, db)

        elif event_type == 'invoice.payment_succeeded':
            handle_payment_succeeded(data_object, db)

        elif event_type == 'invoice.payment_failed':
            handle_payment_failed(data_object, db)

        elif event_type == 'customer.subscription.trial_will_end':
            handle_trial_ending_soon(data_object, db)

        else:
            print(f"[STRIPE WEBHOOK] Unhandled event type: {event_type}")

        return {"status": "success"}

    except Exception as e:
        print(f"[STRIPE WEBHOOK] Error processing {event_type}: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return 200 anyway to prevent Stripe from retrying
        # (log the error for debugging but don't fail the webhook)
        return {"status": "error", "message": str(e)}


def handle_checkout_completed(session, db: Session):
    """
    Checkout session completed - user just signed up for subscription
    Save customer ID and subscription ID to user record
    """
    print(f"[STRIPE] Checkout completed for customer: {session.customer}")

    customer_id = session.customer
    subscription_id = session.subscription
    user_id = session.metadata.get('user_id')

    if not user_id:
        print("[STRIPE] WARNING: No user_id in session metadata")
        return

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        print(f"[STRIPE] ERROR: User {user_id} not found")
        return

    # Get subscription details from Stripe
    subscription = stripe.Subscription.retrieve(subscription_id)

    # Update user record
    user.stripe_customer_id = customer_id
    user.stripe_subscription_id = subscription_id
    user.subscription_status = subscription.status  # 'trialing' or 'active'

    # Set trial end date (90 days from now if trial)
    if subscription.trial_end:
        user.trial_end_date = datetime.fromtimestamp(subscription.trial_end)

    # Set subscription period end
    if subscription.current_period_end:
        user.subscription_period_end = datetime.fromtimestamp(subscription.current_period_end)

    db.commit()
    print(f"[STRIPE] User {user.username} subscription activated: {subscription.status}")

    # TODO: Send welcome email with trial information
    # from ..utils.email import send_welcome_email
    # send_welcome_email(user.email, user.full_name or user.username, user.trial_end_date)


def handle_subscription_created(subscription, db: Session):
    """
    Subscription was created (usually happens during checkout)
    """
    print(f"[STRIPE] Subscription created: {subscription.id}")
    # Usually already handled by checkout.session.completed
    # This is a backup/fallback


def handle_subscription_updated(subscription, db: Session):
    """
    Subscription was updated (trial ended, status changed, etc.)
    """
    print(f"[STRIPE] Subscription updated: {subscription.id}, status: {subscription.status}")

    # Find user by subscription ID
    user = db.query(User).filter(User.stripe_subscription_id == subscription.id).first()
    if not user:
        print(f"[STRIPE] WARNING: No user found for subscription {subscription.id}")
        return

    # Update subscription status
    old_status = user.subscription_status
    user.subscription_status = subscription.status

    # Update period end
    if subscription.current_period_end:
        user.subscription_period_end = datetime.fromtimestamp(subscription.current_period_end)

    # Update cancel_at_period_end flag
    user.subscription_cancel_at_period_end = subscription.cancel_at_period_end

    # If trial just ended and now active
    if old_status == 'trialing' and subscription.status == 'active':
        user.trial_end_date = None
        print(f"[STRIPE] User {user.username} trial ended, now active subscriber")
        # TODO: Send email confirming active subscription
        # from ..utils.email import send_subscription_active_email
        # send_subscription_active_email(user.email, user.full_name or user.username)

    db.commit()


def handle_subscription_deleted(subscription, db: Session):
    """
    Subscription was canceled/deleted
    """
    print(f"[STRIPE] Subscription deleted: {subscription.id}")

    user = db.query(User).filter(User.stripe_subscription_id == subscription.id).first()
    if not user:
        print(f"[STRIPE] WARNING: No user found for subscription {subscription.id}")
        return

    # Update user status
    user.subscription_status = 'canceled'
    user.subscription_cancel_at_period_end = False

    db.commit()
    print(f"[STRIPE] User {user.username} subscription canceled")

    # TODO: Send cancellation confirmation email
    # from ..utils.email import send_subscription_canceled_email
    # send_subscription_canceled_email(user.email, user.full_name or user.username)


def handle_payment_succeeded(invoice, db: Session):
    """
    Payment succeeded (first payment or renewal)
    """
    print(f"[STRIPE] Payment succeeded: {invoice.id}, amount: {invoice.amount_paid/100}")

    customer_id = invoice.customer
    user = db.query(User).filter(User.stripe_customer_id == customer_id).first()

    if not user:
        print(f"[STRIPE] WARNING: No user found for customer {customer_id}")
        return

    # Update subscription status to active
    if user.subscription_status != 'active':
        user.subscription_status = 'active'
        db.commit()

    print(f"[STRIPE] User {user.username} payment successful: ${invoice.amount_paid/100}")

    # TODO: Send payment receipt email
    # from ..utils.email import send_payment_success_email
    # send_payment_success_email(
    #     user.email,
    #     user.full_name or user.username,
    #     invoice.amount_paid / 100,
    #     user.subscription_period_end
    # )


def handle_payment_failed(invoice, db: Session):
    """
    Payment failed - card declined, insufficient funds, etc.
    """
    print(f"[STRIPE] Payment failed: {invoice.id}")

    customer_id = invoice.customer
    user = db.query(User).filter(User.stripe_customer_id == customer_id).first()

    if not user:
        print(f"[STRIPE] WARNING: No user found for customer {customer_id}")
        return

    # Update subscription status to past_due
    user.subscription_status = 'past_due'
    db.commit()

    print(f"[STRIPE] User {user.username} payment failed, status: past_due")

    # TODO: Send payment failed email with instructions to update card
    # from ..utils.email import send_payment_failed_email
    # send_payment_failed_email(user.email, user.full_name or user.username)


def handle_trial_ending_soon(subscription, db: Session):
    """
    Trial is ending soon (3 days before trial ends)
    Stripe sends this event automatically
    """
    print(f"[STRIPE] Trial ending soon for subscription: {subscription.id}")

    user = db.query(User).filter(User.stripe_subscription_id == subscription.id).first()
    if not user:
        print(f"[STRIPE] WARNING: No user found for subscription {subscription.id}")
        return

    print(f"[STRIPE] User {user.username} trial ends soon")

    # TODO: Send trial ending reminder email
    # from ..utils.email import send_trial_ending_soon_email
    # send_trial_ending_soon_email(user.email, user.full_name or user.username, user.trial_end_date)
