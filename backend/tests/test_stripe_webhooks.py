"""
Stripe webhook handling: Lifetime is granted only for a paid Lifetime checkout,
refunds and chargebacks remove it, and late or unrelated subscription events can
neither bring premium back nor take Lifetime away. Billing routes refuse the demo
account.

Runs against an in-memory SQLite database with the Stripe library mocked, so no
Postgres, network or Stripe account is needed:
    cd backend && .venv/bin/python -m unittest tests.test_stripe_webhooks -v
"""
import unittest
from datetime import datetime, timedelta
from unittest import mock

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


# Shim: let SQLite create the Postgres-only UUID column on users.
@compiles(UUID, "sqlite")
def _uuid_on_sqlite(type_, compiler, **kw):
    return "CHAR(36)"


from app.core.database import Base, get_db  # noqa: E402
import app.models  # noqa: E402,F401  (registers every table for create_all)
from app.models.user import User  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.core.deps import get_current_user  # noqa: E402
from app.api import stripe_api  # noqa: E402

NOW = int(datetime(2026, 11, 1).timestamp())
DAY = 86400


def sub_payload(sub_id, customer="cus_1", status="active", created=NOW,
                period_end=NOW + 30 * DAY, cancel_at_period_end=False, trial_end=None, metadata=None):
    return {
        "id": sub_id, "object": "subscription", "customer": customer, "status": status,
        "created": created, "current_period_end": period_end,
        "cancel_at_period_end": cancel_at_period_end, "trial_end": trial_end,
        "metadata": metadata or {},
    }


class StripeWebhookTest(unittest.TestCase):
    def setUp(self):
        engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(engine)
        self.Session = sessionmaker(bind=engine)
        self.db = self.Session()

        self.user = User(email="member@example.test", username="member",
                         stripe_customer_id="cus_1", subscription_tier="free",
                         subscription_status="trial")
        self.db.add(self.user)
        self.db.commit()

        # Live subscriptions as Stripe would return them from Subscription.retrieve
        self.live_subs = {}

        app = FastAPI()
        app.include_router(stripe_api.router)

        def _db():
            db = self.Session()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = _db
        self.app = app
        self.client = TestClient(app)

        patches = [
            mock.patch.object(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test"),
            mock.patch.object(settings, "STRIPE_SECRET_KEY", "sk_test"),
            mock.patch("stripe.Webhook.construct_event", side_effect=lambda p, s, k: self._event),
            mock.patch("stripe.Subscription.retrieve", side_effect=lambda sid: self.live_subs[sid]),
            mock.patch("stripe.Subscription.modify"),
            mock.patch.object(stripe_api, "send_subscription_confirmed_email"),
            mock.patch.object(stripe_api, "send_payment_receipt_email"),
        ]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)

    def tearDown(self):
        self.db.close()

    # --- helpers ---

    def send(self, event_type, obj):
        self._event = {"type": event_type, "data": {"object": obj}}
        response = self.client.post("/stripe/webhook", content=b"{}",
                                    headers={"stripe-signature": "t=1,v1=x"})
        self.assertEqual(response.status_code, 200, response.text)
        self.db.expire_all()
        return self.db.get(User, self.user.id)

    def make_lifetime(self, old_subscription_id=None):
        u = self.db.get(User, self.user.id)
        u.subscription_tier = "premium"
        u.subscription_status = "active"
        u.subscription_ends_at = None
        u.stripe_subscription_id = old_subscription_id
        self.db.commit()

    def make_subscriber(self, sub_id="sub_A"):
        u = self.db.get(User, self.user.id)
        u.subscription_tier = "premium"
        u.subscription_status = "active"
        u.subscription_ends_at = datetime(2026, 12, 1)
        u.subscription_started_at = datetime.utcfromtimestamp(NOW)
        u.stripe_subscription_id = sub_id
        self.db.commit()

    def checkout(self, price_type, payment_status, mode="payment"):
        return {
            "id": "cs_1", "object": "checkout.session", "customer": "cus_1", "mode": mode,
            "payment_status": payment_status,
            "metadata": {"user_id": str(self.user.id), "price_type": price_type},
        }

    # --- Lifetime checkout ---

    def test_paid_lifetime_checkout_grants_lifetime(self):
        u = self.send("checkout.session.completed", self.checkout("lifetime", "paid"))
        self.assertEqual((u.subscription_tier, u.subscription_status), ("premium", "active"))
        self.assertIsNone(u.subscription_ends_at)

    def test_unpaid_lifetime_checkout_grants_nothing_until_payment_arrives(self):
        u = self.send("checkout.session.completed", self.checkout("lifetime", "unpaid"))
        self.assertEqual(u.subscription_tier, "free")
        u = self.send("checkout.session.async_payment_succeeded", self.checkout("lifetime", "paid"))
        self.assertEqual((u.subscription_tier, u.subscription_status), ("premium", "active"))

    def test_one_time_checkout_that_is_not_lifetime_grants_nothing(self):
        u = self.send("checkout.session.completed", self.checkout("monthly", "paid"))
        self.assertEqual(u.subscription_tier, "free")
        u = self.send("checkout.session.completed", self.checkout(None, "paid"))
        self.assertEqual(u.subscription_tier, "free")

    # --- Refunds and chargebacks ---

    def lifetime_charge(self, refunded=True):
        return {"id": "ch_1", "object": "charge", "customer": "cus_1", "invoice": None,
                "refunded": refunded, "amount": 29400,
                "amount_refunded": 29400 if refunded else 1000}

    def test_full_refund_removes_lifetime(self):
        self.make_lifetime()
        u = self.send("charge.refunded", self.lifetime_charge(refunded=True))
        self.assertEqual((u.subscription_tier, u.subscription_status), ("free", "expired"))

    def test_partial_refund_keeps_lifetime(self):
        self.make_lifetime()
        u = self.send("charge.refunded", self.lifetime_charge(refunded=False))
        self.assertEqual((u.subscription_tier, u.subscription_status), ("premium", "active"))

    def test_chargeback_removes_lifetime(self):
        self.make_lifetime()
        with mock.patch("stripe.Charge.retrieve", return_value=self.lifetime_charge(refunded=False)) as retrieve:
            u = self.send("charge.dispute.created",
                          {"id": "dp_1", "object": "dispute", "charge": "ch_1", "amount": 29400})
        retrieve.assert_called_once_with("ch_1")
        self.assertEqual((u.subscription_tier, u.subscription_status), ("free", "expired"))

    def test_refund_of_a_subscription_payment_is_left_to_subscription_events(self):
        self.make_subscriber("sub_A")
        charge = dict(self.lifetime_charge(), invoice="in_1")
        u = self.send("charge.refunded", charge)
        self.assertEqual((u.subscription_tier, u.subscription_status), ("premium", "active"))

    # --- Subscriptions: only the current one counts, Lifetime is never wiped ---

    def test_old_subscription_ending_does_not_wipe_lifetime(self):
        self.make_lifetime(old_subscription_id=None)
        u = self.send("customer.subscription.deleted", sub_payload("sub_old", status="canceled"))
        self.assertEqual((u.subscription_tier, u.subscription_status), ("premium", "active"))
        self.assertIsNone(u.subscription_ends_at)

    def test_lifetime_purchase_detaches_previous_subscription(self):
        self.make_subscriber("sub_A")
        self.send("checkout.session.completed", self.checkout("lifetime", "paid"))
        u = self.send("customer.subscription.deleted", sub_payload("sub_A", status="canceled"))
        self.assertEqual((u.subscription_tier, u.subscription_status), ("premium", "active"))
        self.assertIsNone(u.subscription_ends_at)

    def test_other_subscription_ending_does_not_downgrade_current_subscriber(self):
        self.make_subscriber("sub_B")
        u = self.send("customer.subscription.deleted", sub_payload("sub_A", status="canceled"))
        self.assertEqual((u.subscription_tier, u.subscription_status), ("premium", "active"))
        self.assertEqual(u.stripe_subscription_id, "sub_B")

    def test_late_update_after_deletion_does_not_bring_back_premium(self):
        self.make_subscriber("sub_A")
        self.live_subs["sub_A"] = sub_payload("sub_A", status="canceled")
        self.send("customer.subscription.deleted", sub_payload("sub_A", status="canceled"))
        # An older "active" update arrives late
        u = self.send("customer.subscription.updated", sub_payload("sub_A", status="active"))
        self.assertEqual((u.subscription_tier, u.subscription_status), ("free", "expired"))

    def test_late_created_after_deletion_does_not_bring_back_premium(self):
        self.make_subscriber("sub_A")
        self.live_subs["sub_A"] = sub_payload("sub_A", status="canceled")
        self.send("customer.subscription.deleted", sub_payload("sub_A", status="canceled"))
        u = self.send("customer.subscription.created", sub_payload("sub_A", status="active"))
        self.assertEqual((u.subscription_tier, u.subscription_status), ("free", "expired"))

    def test_out_of_order_update_uses_live_state(self):
        self.make_subscriber("sub_A")
        # The member scheduled a cancellation; an older "not cancelling" update arrives late
        self.live_subs["sub_A"] = sub_payload("sub_A", cancel_at_period_end=True)
        u = self.send("customer.subscription.updated", sub_payload("sub_A", cancel_at_period_end=False))
        self.assertEqual(u.subscription_status, "canceled")

    def test_late_payment_for_old_subscription_does_not_restore_premium(self):
        u = self.db.get(User, self.user.id)
        u.subscription_tier, u.subscription_status = "free", "expired"
        self.db.commit()
        u = self.send("invoice.payment_succeeded",
                      {"id": "in_1", "object": "invoice", "customer": "cus_1",
                       "subscription": "sub_A", "amount_paid": 1200})
        self.assertEqual((u.subscription_tier, u.subscription_status), ("free", "expired"))

    def test_late_created_for_older_subscription_does_not_replace_current(self):
        self.make_subscriber("sub_B")  # sub_B started at NOW
        self.live_subs["sub_A"] = sub_payload("sub_A", created=NOW - 60 * DAY)
        u = self.send("customer.subscription.created", sub_payload("sub_A", created=NOW - 60 * DAY))
        self.assertEqual(u.stripe_subscription_id, "sub_B")

    def test_lifetime_member_ignores_new_subscription_events(self):
        self.make_lifetime()
        self.live_subs["sub_X"] = sub_payload("sub_X")
        u = self.send("customer.subscription.created", sub_payload("sub_X"))
        self.assertIsNone(u.subscription_ends_at)
        self.assertIsNone(u.stripe_subscription_id)

    def test_normal_subscription_lifecycle(self):
        self.live_subs["sub_A"] = sub_payload("sub_A")
        u = self.send("customer.subscription.created", sub_payload("sub_A"))
        self.assertEqual((u.subscription_tier, u.subscription_status, u.stripe_subscription_id),
                         ("premium", "active", "sub_A"))
        self.assertEqual(u.subscription_ends_at, datetime.utcfromtimestamp(NOW + 30 * DAY))

        self.live_subs["sub_A"] = sub_payload("sub_A", cancel_at_period_end=True)
        u = self.send("customer.subscription.updated", sub_payload("sub_A", cancel_at_period_end=True))
        self.assertEqual(u.subscription_status, "canceled")

        u = self.send("customer.subscription.deleted", sub_payload("sub_A", status="canceled"))
        self.assertEqual((u.subscription_tier, u.subscription_status), ("free", "expired"))
        self.assertIsNone(u.stripe_subscription_id)

    def test_renewal_payment_resyncs_current_subscription(self):
        self.make_subscriber("sub_A")
        self.live_subs["sub_A"] = sub_payload("sub_A", period_end=NOW + 60 * DAY)
        u = self.send("invoice.payment_succeeded",
                      {"id": "in_2", "object": "invoice", "customer": "cus_1",
                       "subscription": "sub_A", "amount_paid": 1200})
        self.assertEqual((u.subscription_tier, u.subscription_status), ("premium", "active"))
        self.assertEqual(u.subscription_ends_at, datetime.utcfromtimestamp(NOW + 60 * DAY))

    # --- Demo account ---

    def test_billing_routes_refuse_demo_account(self):
        demo = User(email="demo@example.test", username="demo", is_demo_account=True,
                    stripe_customer_id="cus_demo")
        self.db.add(demo)
        self.db.commit()
        self.app.dependency_overrides[get_current_user] = lambda: demo

        with mock.patch("stripe.checkout.Session.create") as create, \
             mock.patch("stripe.billing_portal.Session.create") as portal, \
             mock.patch("stripe.Invoice.list") as invoices, \
             mock.patch("stripe.Charge.list") as charges:
            calls = [
                ("post", "/stripe/create-checkout-session",
                 {"json": {"price_id": "lifetime", "success_url": "https://x/s", "cancel_url": "https://x/c"}}),
                ("post", "/stripe/create-portal-session?return_url=https://x/r", {}),
                ("get", "/stripe/subscription-status", {}),
                ("get", "/stripe/payment-history", {}),
                ("post", "/stripe/email-billing-history", {}),
                ("put", "/stripe/receipt-preference", {"json": {"enabled": True}}),
                ("get", "/stripe/receipt-preference", {}),
            ]
            for method, path, kwargs in calls:
                response = getattr(self.client, method)(path, **kwargs)
                self.assertEqual(response.status_code, 403, f"{method.upper()} {path}: {response.text}")
            create.assert_not_called()
            portal.assert_not_called()
            invoices.assert_not_called()
            charges.assert_not_called()


if __name__ == "__main__":
    unittest.main()
