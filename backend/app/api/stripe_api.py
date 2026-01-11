from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import stripe

from ..core.database import get_db
from ..core.config import settings
from ..core.deps import get_current_user
from ..models.user import User
from ..services.email_service import (
    send_subscription_confirmed_email,
    send_billing_history_email,
    send_payment_receipt_email
)

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


class PaymentHistoryItem(BaseModel):
    date: str
    description: str
    amount: str
    status: str
    invoice_pdf_url: Optional[str] = None


class PaymentHistoryResponse(BaseModel):
    payments: List[PaymentHistoryItem]
    total_spent: str


class ReceiptPreferenceRequest(BaseModel):
    enabled: bool


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
        # Subscription - charge immediately, free days extend next billing
        checkout_params['mode'] = 'subscription'

        # Calculate free days to pass to webhook via metadata
        remaining_trial_days = current_user.get_trial_days_remaining()
        early_bird_bonus = 30 if current_user.is_within_first_5_days() else 0
        total_free_days = remaining_trial_days + early_bird_bonus

        checkout_params['subscription_data'] = {
            'metadata': {
                'user_id': str(current_user.id),
                'price_type': request.price_id,
                'free_days': str(total_free_days),
                'early_bird': str(current_user.is_within_first_5_days())
            }
        }
        # No trial_period_days - charge happens immediately
        # The webhook will extend the billing cycle by free_days

    # Allow promotion codes to be entered on Stripe's checkout page
    # This lets users enter promo codes like "SECRETFIRSTUSERS90OFF" directly on Stripe
    checkout_params['allow_promotion_codes'] = True

    # TEMPORARY DEBUG LOGGING - Remove after promo code issue is resolved
    print(f"[DEBUG] Creating checkout session for user {current_user.id} ({current_user.email})")
    print(f"[DEBUG] Price type: {request.price_id}, Price ID: {price_id}")
    print(f"[DEBUG] Customer ID: {customer_id}")
    print(f"[DEBUG] Checkout params: {checkout_params}")

    try:
        checkout_session = stripe.checkout.Session.create(**checkout_params)
        print(f"[DEBUG] Checkout session created: {checkout_session.id}")
        return CheckoutResponse(checkout_url=checkout_session.url)
    except stripe.error.StripeError as e:
        # TEMPORARY DEBUG LOGGING - Remove after promo code issue is resolved
        print(f"[DEBUG ERROR] Stripe error for user {current_user.id}: {type(e).__name__}: {str(e)}")
        if hasattr(e, 'user_message'):
            print(f"[DEBUG ERROR] User message: {e.user_message}")
        if hasattr(e, 'code'):
            print(f"[DEBUG ERROR] Error code: {e.code}")
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

    # TEMPORARY DEBUG LOGGING - Remove after promo code issue is resolved
    print(f"[DEBUG] Checkout completed - Session ID: {session.get('id')}")
    print(f"[DEBUG] Customer: {customer_id}, User ID: {user_id}, Mode: {mode}")
    total_details = session.get('total_details', {})
    amount_discount = total_details.get('amount_discount', 0)
    if amount_discount > 0:
        print(f"[DEBUG] Discount applied: ${amount_discount / 100:.2f}")
    if session.get('discount'):
        print(f"[DEBUG] Discount info: {session.get('discount')}")

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

    # Send subscription confirmation email
    try:
        send_subscription_confirmed_email(
            to_email=user.email,
            username=user.display_name or user.username,
            plan_type=price_type or 'monthly'
        )
        print(f"Subscription confirmation email sent to {user.email}")
    except Exception as e:
        print(f"Failed to send subscription confirmation email: {e}")


async def handle_subscription_created(subscription, db: Session):
    """Handle new subscription creation"""

    customer_id = subscription.get('customer')
    subscription_id = subscription.get('id')
    status = subscription.get('status')
    metadata = subscription.get('metadata', {})

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
        if metadata.get('early_bird') == 'True' or user.is_within_first_5_days():
            user.subscribed_within_5_days = True

    # Set subscription end date from Stripe
    current_period_end = subscription.get('current_period_end')
    if current_period_end:
        user.subscription_ends_at = datetime.fromtimestamp(current_period_end)

    # Extend billing cycle by free days (remaining trial + early bird bonus)
    free_days = int(metadata.get('free_days', 0))
    if free_days > 0 and current_period_end:
        try:
            # Calculate new trial_end to extend the billing cycle
            new_trial_end = current_period_end + (free_days * 86400)  # 86400 seconds per day

            # Modify the subscription to add the free period
            stripe.Subscription.modify(
                subscription_id,
                trial_end=new_trial_end,
                proration_behavior='none'
            )
            print(f"Extended subscription {subscription_id} by {free_days} days (trial_end set to {datetime.fromtimestamp(new_trial_end)})")

            # Update our end date to reflect the extension
            user.subscription_ends_at = datetime.fromtimestamp(new_trial_end)
        except stripe.error.StripeError as e:
            print(f"Failed to extend subscription billing cycle: {e}")

    db.commit()
    print(f"Subscription created for user {user.id}: status={status}, free_days={free_days}")


async def handle_subscription_updated(subscription, db: Session):
    """Handle subscription updates (status changes, renewals)"""

    customer_id = subscription.get('customer')
    subscription_id = subscription.get('id')
    status = subscription.get('status')
    cancel_at_period_end = subscription.get('cancel_at_period_end', False)
    trial_end = subscription.get('trial_end')

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

    # Update subscription end date - prefer trial_end if set (our free days extension)
    if trial_end:
        user.subscription_ends_at = datetime.fromtimestamp(trial_end)
    else:
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
    # Note: We don't notify followers - too harsh. They'll see a message on the profile if they visit.


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

    # Send payment receipt email if user has opted in
    if user.notify_payment_receipts:
        try:
            amount_paid = invoice.get('amount_paid', 0)
            amount_dollars = amount_paid / 100 if amount_paid else 0

            # Get description from invoice lines
            description = "Subscription payment"
            lines = invoice.get('lines', {}).get('data', [])
            if lines:
                first_line = lines[0]
                if first_line.get('description'):
                    description = first_line['description']

            # Get invoice date
            created = invoice.get('created')
            invoice_date = datetime.fromtimestamp(created).strftime("%B %d, %Y") if created else datetime.utcnow().strftime("%B %d, %Y")

            # Get invoice PDF URL
            invoice_url = invoice.get('invoice_pdf')

            send_payment_receipt_email(
                to_email=user.email,
                username=user.display_name or user.username,
                amount=f"{amount_dollars:.2f}",
                description=description,
                date=invoice_date,
                invoice_url=invoice_url
            )
            print(f"Payment receipt email sent to {user.email}")
        except Exception as e:
            print(f"Failed to send payment receipt email: {e}")


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


@router.get("/payment-history", response_model=PaymentHistoryResponse)
def get_payment_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's payment history from Stripe"""

    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe is not configured"
        )

    if not current_user.stripe_customer_id:
        # No payments yet
        return PaymentHistoryResponse(payments=[], total_spent="$0.00")

    try:
        # Fetch invoices from Stripe
        invoices = stripe.Invoice.list(
            customer=current_user.stripe_customer_id,
            limit=100
        )

        # Also fetch charges for one-time payments (lifetime)
        charges = stripe.Charge.list(
            customer=current_user.stripe_customer_id,
            limit=100
        )

        payments = []
        total_cents = 0

        # Process invoices (subscriptions)
        for invoice in invoices.data:
            if invoice.status == 'paid' and invoice.amount_paid > 0:
                amount_dollars = invoice.amount_paid / 100
                total_cents += invoice.amount_paid

                # Get description from line items
                description = "Subscription payment"
                if invoice.lines and invoice.lines.data:
                    first_line = invoice.lines.data[0]
                    if first_line.description:
                        description = first_line.description
                    elif first_line.price and first_line.price.nickname:
                        description = first_line.price.nickname

                payments.append(PaymentHistoryItem(
                    date=datetime.fromtimestamp(invoice.created).strftime("%b %d, %Y"),
                    description=description,
                    amount=f"${amount_dollars:.2f}",
                    status="Paid",
                    invoice_pdf_url=invoice.invoice_pdf
                ))

        # Process charges not associated with invoices (one-time payments)
        for charge in charges.data:
            if charge.paid and not charge.invoice:
                amount_dollars = charge.amount / 100
                total_cents += charge.amount

                description = charge.description or "Lifetime membership"

                payments.append(PaymentHistoryItem(
                    date=datetime.fromtimestamp(charge.created).strftime("%b %d, %Y"),
                    description=description,
                    amount=f"${amount_dollars:.2f}",
                    status="Paid",
                    invoice_pdf_url=charge.receipt_url
                ))

        # Sort by date (most recent first)
        payments.sort(key=lambda x: datetime.strptime(x.date, "%b %d, %Y"), reverse=True)

        total_dollars = total_cents / 100
        return PaymentHistoryResponse(
            payments=payments,
            total_spent=f"${total_dollars:.2f}"
        )

    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/email-billing-history")
def email_billing_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Email the user their billing history (rate limited to once per week)"""

    if not current_user.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No payment history found"
        )

    # Rate limit: once per week
    if current_user.last_billing_email_sent_at:
        days_since_last = (datetime.utcnow() - current_user.last_billing_email_sent_at).days
        if days_since_last < 7:
            days_remaining = 7 - days_since_last
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"You can request another billing email in {days_remaining} day{'s' if days_remaining != 1 else ''}"
            )

    # Get payment history
    history_response = get_payment_history(current_user, db)

    if not history_response.payments:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No payments to include in history"
        )

    # Convert to dict format for email template
    payments_for_email = [
        {
            "date": p.date,
            "description": p.description,
            "amount": p.amount,
            "status": p.status
        }
        for p in history_response.payments
    ]

    # Send the email
    success = send_billing_history_email(
        to_email=current_user.email,
        username=current_user.display_name or current_user.username,
        payments=payments_for_email
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send email"
        )

    # Update rate limit timestamp
    current_user.last_billing_email_sent_at = datetime.utcnow()
    db.commit()

    return {"message": "Billing history sent to your email"}


@router.put("/receipt-preference")
def update_receipt_preference(
    request: ReceiptPreferenceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user's preference for receiving payment receipt emails"""

    current_user.notify_payment_receipts = request.enabled
    db.commit()

    return {
        "message": "Receipt preference updated",
        "notify_payment_receipts": current_user.notify_payment_receipts
    }


@router.get("/receipt-preference")
def get_receipt_preference(
    current_user: User = Depends(get_current_user)
):
    """Get user's payment receipt email preference"""

    return {
        "notify_payment_receipts": current_user.notify_payment_receipts
    }
