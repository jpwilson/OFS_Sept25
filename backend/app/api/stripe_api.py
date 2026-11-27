from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import stripe

from ..core.database import get_db
from ..core.config import settings
from ..core.deps import require_not_demo
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


def _stripe_http_error(e: Exception, fallback: str) -> HTTPException:
    """Log a Stripe error without personal data and return a client-safe message.
    Stripe's user_message is written for end users; the raw error text is not."""
    print(f"Stripe error: {type(e).__name__} code={getattr(e, 'code', None)}")
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=getattr(e, 'user_message', None) or fallback
    )


@router.post("/create-checkout-session", response_model=CheckoutResponse)
def create_checkout_session(
    request: CheckoutRequest,
    current_user: User = Depends(require_not_demo),
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
        'success_url': request.success_url + ('&' if '?' in request.success_url else '?') + 'session_id={CHECKOUT_SESSION_ID}',
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
    checkout_params['allow_promotion_codes'] = True

    try:
        checkout_session = stripe.checkout.Session.create(**checkout_params)
        return CheckoutResponse(checkout_url=checkout_session.url)
    except stripe.error.StripeError as e:
        raise _stripe_http_error(e, "Could not start checkout. Please try again.")


@router.post("/create-portal-session", response_model=PortalResponse)
def create_portal_session(
    return_url: str,
    current_user: User = Depends(require_not_demo),
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
        raise _stripe_http_error(e, "Could not open billing management. Please try again.")


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe webhook events"""

    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')

    # Always verify the webhook signature. Without a secret anyone could post
    # a fake "checkout completed" event and grant themselves a paid plan.
    if not settings.STRIPE_WEBHOOK_SECRET:
        print("Stripe webhook rejected: STRIPE_WEBHOOK_SECRET is not configured")
        raise HTTPException(status_code=503, detail="Webhook not configured")
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event.get('type') if isinstance(event, dict) else event.type
    data = event.get('data', {}).get('object', {}) if isinstance(event, dict) else event.data.object

    print(f"Stripe webhook received: {event_type}")

    handler = WEBHOOK_HANDLERS.get(event_type)
    if handler:
        await handler(data, db)

    return {"status": "ok"}


# --- Webhook helpers ---

# Subscription statuses after which a subscription can never become active again.
ENDED_SUBSCRIPTION_STATUSES = ('canceled', 'incomplete_expired')


def _ts(value) -> Optional[datetime]:
    """Stripe Unix timestamp -> naive UTC datetime (how the users table stores times)."""
    return datetime.utcfromtimestamp(value) if value else None


def _object_id(value):
    """Stripe sends related objects either as an id string or as an expanded object."""
    if isinstance(value, dict):
        return value.get('id')
    return value


def is_lifetime_member(user: User) -> bool:
    """A Lifetime member is premium and active with no end date and no subscription.

    Lifetime grants clear stripe_subscription_id, and every subscriber has one, so a
    subscriber is never mistaken for a Lifetime member.
    """
    return (
        user.subscription_tier == 'premium'
        and user.subscription_status == 'active'
        and user.subscription_ends_at is None
        and not user.stripe_subscription_id
    )


def _period_end(subscription):
    """current_period_end lives on the subscription in older Stripe API versions
    and on its items in newer ones."""
    end = subscription.get('current_period_end')
    if not end:
        items = (subscription.get('items') or {}).get('data') or []
        if items:
            end = items[0].get('current_period_end')
    return end


def _invoice_subscription_id(invoice):
    """The invoice's subscription id (older API: invoice.subscription; newer API:
    invoice.parent.subscription_details.subscription)."""
    sub = invoice.get('subscription')
    if not sub:
        parent = invoice.get('parent') or {}
        sub = (parent.get('subscription_details') or {}).get('subscription')
    return _object_id(sub)


def _user_for_customer(customer_id, db: Session) -> Optional[User]:
    if not customer_id:
        return None
    return db.query(User).filter(User.stripe_customer_id == customer_id).first()


def _live_subscription(subscription):
    """Fetch the subscription's current state from Stripe.

    Stripe does not deliver events in order, and an event payload is a snapshot from
    when the event happened. Acting on the live object means a late or replayed event
    can never bring back a state the subscription has already left.
    """
    return stripe.Subscription.retrieve(subscription.get('id'))


def _apply_subscription_state(user: User, subscription):
    """Copy a (live) subscription's status and paid-until date onto the user."""
    status = subscription.get('status')
    if status in ('trialing', 'active'):
        # A scheduled cancellation keeps access until the period ends
        if subscription.get('cancel_at_period_end', False):
            user.subscription_status = 'canceled'
        else:
            user.subscription_status = 'active'
        user.subscription_tier = 'premium'
    elif status == 'past_due':
        user.subscription_status = 'active'  # Keep active, payment will retry
    elif status in ('canceled', 'unpaid', 'incomplete_expired'):
        user.subscription_status = 'canceled'

    # Paid until the later of the trial end (our free-days extension) and the period end
    ends = [t for t in (subscription.get('trial_end'), _period_end(subscription)) if t]
    if ends:
        user.subscription_ends_at = _ts(max(ends))


# --- Webhook handlers ---

async def handle_checkout_completed(session, db: Session):
    """Checkout finished. Lifetime is granted only for a paid Lifetime checkout;
    subscriptions are handled by the customer.subscription.* events."""

    customer_id = session.get('customer')
    metadata = session.get('metadata') or {}
    user_id = metadata.get('user_id')
    price_type = metadata.get('price_type')
    mode = session.get('mode')

    if not user_id:
        user = _user_for_customer(customer_id, db)
    else:
        user = db.query(User).filter(User.id == int(user_id)).first()

    if not user:
        print(f"Webhook error: User not found for checkout session {session.get('id')}")
        return

    # Update user's Stripe customer ID if not set
    if not user.stripe_customer_id:
        user.stripe_customer_id = customer_id

    if mode == 'payment':
        granted = _grant_lifetime_if_paid(user, session)
        db.commit()
        if not granted:
            return
    else:
        db.commit()

    print(f"Checkout completed for user {user.id}")

    # Send subscription confirmation email
    try:
        send_subscription_confirmed_email(
            to_email=user.email,
            username=user.display_name or user.username,
            plan_type=price_type or 'monthly'
        )
        print(f"Subscription confirmation email sent to user {user.id}")
    except Exception as e:
        print(f"Failed to send subscription confirmation email: {type(e).__name__}")


def _grant_lifetime_if_paid(user: User, session) -> bool:
    """Grant Lifetime for a one-time Checkout session, but only if it was our Lifetime
    checkout and Stripe says it is paid. Returns True when Lifetime was granted.

    'no_payment_required' means a valid promotion code took the total to zero.
    Delayed payment methods complete the session as 'unpaid'; they are granted by
    checkout.session.async_payment_succeeded once the money arrives.
    """
    metadata = session.get('metadata') or {}
    payment_status = session.get('payment_status')
    if metadata.get('price_type') != 'lifetime' or payment_status not in ('paid', 'no_payment_required'):
        print(
            f"Checkout {session.get('id')}: Lifetime not granted "
            f"(price_type={metadata.get('price_type')}, payment_status={payment_status})"
        )
        return False

    if user.stripe_subscription_id:
        # Lifetime replaces the subscription in our records. The old subscription keeps
        # billing in Stripe until it is cancelled there; its events are ignored from now on.
        print(f"User {user.id} bought Lifetime while subscription {user.stripe_subscription_id} was on record")

    user.subscription_tier = 'premium'
    user.subscription_status = 'active'
    user.subscription_started_at = datetime.utcnow()
    user.subscription_ends_at = None  # Never expires
    user.stripe_subscription_id = None

    # Check early bird bonus
    if user.is_within_first_5_days():
        user.subscribed_within_5_days = True
    return True


async def handle_subscription_created(subscription, db: Session):
    """Handle new subscription creation"""

    customer_id = subscription.get('customer')
    subscription_id = subscription.get('id')

    user = _user_for_customer(customer_id, db)
    if not user:
        print(f"Webhook error: User not found for customer {customer_id}")
        return

    if is_lifetime_member(user):
        print(f"Subscription {subscription_id} ignored: user {user.id} is a Lifetime member")
        return

    live = _live_subscription(subscription)
    status = live.get('status')

    if status in ENDED_SUBSCRIPTION_STATUSES:
        print(f"Subscription {subscription_id} ignored: already {status}")
        return

    if user.stripe_subscription_id and user.stripe_subscription_id != subscription_id:
        # Another subscription is on record. Only a newer one takes over, so a late
        # "created" event for an old subscription cannot replace the current one.
        started = user.subscription_started_at
        created = _ts(live.get('created'))
        if started and created and created <= started:
            print(f"Subscription {subscription_id} ignored: older than the current subscription")
            return

    metadata = live.get('metadata') or {}
    user.stripe_subscription_id = subscription_id
    user.subscription_started_at = _ts(live.get('created')) or datetime.utcnow()
    if status in ('trialing', 'active'):
        # Check early bird bonus
        if metadata.get('early_bird') == 'True' or user.is_within_first_5_days():
            user.subscribed_within_5_days = True
    _apply_subscription_state(user, live)

    # Extend billing cycle by free days (remaining trial + early bird bonus).
    # Skipped when a trial end is already set, so a replayed event cannot extend twice.
    free_days = int(metadata.get('free_days', 0) or 0)
    current_period_end = _period_end(live)
    if free_days > 0 and current_period_end and not live.get('trial_end') and status in ('trialing', 'active'):
        try:
            new_trial_end = current_period_end + (free_days * 86400)  # 86400 seconds per day
            stripe.Subscription.modify(
                subscription_id,
                trial_end=new_trial_end,
                proration_behavior='none'
            )
            print(f"Extended subscription {subscription_id} by {free_days} days")
            user.subscription_ends_at = _ts(new_trial_end)
        except stripe.error.StripeError as e:
            print(f"Failed to extend subscription billing cycle: {type(e).__name__}")

    db.commit()
    print(f"Subscription created for user {user.id}: status={status}, free_days={free_days}")


async def handle_subscription_updated(subscription, db: Session):
    """Handle subscription updates (status changes, renewals)"""

    customer_id = subscription.get('customer')
    subscription_id = subscription.get('id')

    user = _user_for_customer(customer_id, db)
    if not user:
        print(f"Webhook error: User not found for customer {customer_id}")
        return

    if user.stripe_subscription_id != subscription_id:
        print(f"Subscription {subscription_id} update ignored: not the current subscription of user {user.id}")
        return

    live = _live_subscription(subscription)
    _apply_subscription_state(user, live)

    db.commit()
    print(f"Subscription updated for user {user.id}: status={live.get('status')}, "
          f"cancel_at_period_end={live.get('cancel_at_period_end', False)}")


async def handle_subscription_deleted(subscription, db: Session):
    """Handle subscription cancellation/deletion"""

    customer_id = subscription.get('customer')
    subscription_id = subscription.get('id')

    user = _user_for_customer(customer_id, db)
    if not user:
        print(f"Webhook error: User not found for customer {customer_id}")
        return

    # Only the current subscription ending removes premium. This also protects Lifetime
    # members, who have no current subscription.
    if user.stripe_subscription_id != subscription_id:
        print(f"Subscription {subscription_id} deletion ignored: not the current subscription of user {user.id}")
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
    subscription_id = _invoice_subscription_id(invoice)

    user = _user_for_customer(customer_id, db)
    if not user:
        return

    if subscription_id and subscription_id == user.stripe_subscription_id:
        # Re-sync from the live subscription rather than assuming "active"
        _apply_subscription_state(user, _live_subscription({'id': subscription_id}))
        db.commit()
        print(f"Payment succeeded for user {user.id}")
    else:
        print(f"Payment succeeded for user {user.id} on a subscription that is not current; status unchanged")

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
            print(f"Payment receipt email sent to user {user.id}")
        except Exception as e:
            print(f"Failed to send payment receipt email: {type(e).__name__}")


async def handle_payment_failed(invoice, db: Session):
    """Handle failed recurring payment"""

    customer_id = invoice.get('customer')

    user = _user_for_customer(customer_id, db)
    if not user:
        return

    # Don't immediately revoke access - Stripe will retry
    # Just log it for now
    print(f"Payment failed for user {user.id}")


async def handle_charge_refunded(charge, db: Session):
    """A fully refunded Lifetime payment removes Lifetime. Partial refunds change nothing."""
    if not charge.get('refunded'):
        print(f"Charge {charge.get('id')} partially refunded; access unchanged")
        return
    _revoke_lifetime_for_charge(charge, db, reason='refund')


async def handle_dispute_created(dispute, db: Session):
    """A chargeback on a Lifetime payment removes Lifetime straight away.
    If the dispute is later won, restore the member by hand."""
    charge_id = _object_id(dispute.get('charge'))
    if not charge_id:
        return
    charge = stripe.Charge.retrieve(charge_id)  # disputes do not carry the customer
    _revoke_lifetime_for_charge(charge, db, reason='dispute')


def _revoke_lifetime_for_charge(charge, db: Session, reason: str):
    # Subscription payments are billed through invoices; their access follows the
    # subscription events. Lifetime is a one-time payment without an invoice.
    if _object_id(charge.get('invoice')):
        print(f"Charge {charge.get('id')} {reason}: subscription payment, access follows the subscription")
        return

    user = _user_for_customer(charge.get('customer'), db)
    if not user or not is_lifetime_member(user):
        print(f"Charge {charge.get('id')} {reason}: no Lifetime member to update")
        return

    user.subscription_tier = 'free'
    user.subscription_status = 'expired'
    user.subscription_ends_at = datetime.utcnow()
    db.commit()
    print(f"Lifetime removed for user {user.id} after {reason} of charge {charge.get('id')}")


# Events this endpoint acts on. Each must also be enabled on the webhook in Stripe.
WEBHOOK_HANDLERS = {
    'checkout.session.completed': handle_checkout_completed,
    'checkout.session.async_payment_succeeded': handle_checkout_completed,
    'customer.subscription.created': handle_subscription_created,
    'customer.subscription.updated': handle_subscription_updated,
    'customer.subscription.deleted': handle_subscription_deleted,
    'invoice.payment_succeeded': handle_payment_succeeded,
    'invoice.payment_failed': handle_payment_failed,
    'charge.refunded': handle_charge_refunded,
    'charge.dispute.created': handle_dispute_created,
}


@router.get("/subscription-status")
def get_subscription_status(
    current_user: User = Depends(require_not_demo),
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
    current_user: User = Depends(require_not_demo),
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
        raise _stripe_http_error(e, "Could not load payment history. Please try again.")


@router.post("/email-billing-history")
def email_billing_history(
    current_user: User = Depends(require_not_demo),
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
    current_user: User = Depends(require_not_demo),
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
    current_user: User = Depends(require_not_demo)
):
    """Get user's payment receipt email preference"""

    return {
        "notify_payment_receipts": current_user.notify_payment_receipts
    }
