"""
Email utility functions using Resend
Handles all transactional emails: welcome, payments, notifications, etc.
"""
import resend
from datetime import datetime
from typing import Optional
from ..core.config import settings

# Initialize Resend
resend.api_key = settings.RESEND_API_KEY


def send_email(to_email: str, subject: str, html: str):
    """
    Base email sending function
    """
    try:
        resend.Emails.send({
            "from": settings.RESEND_FROM_EMAIL,
            "to": to_email,
            "subject": subject,
            "html": html
        })
        print(f"[EMAIL] Sent '{subject}' to {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL] ERROR sending to {to_email}: {str(e)}")
        return False


# ============================================================================
# SUBSCRIPTION & PAYMENT EMAILS
# ============================================================================

def send_welcome_email(email: str, name: str, trial_end_date: Optional[datetime] = None):
    """
    Welcome email when user signs up with 90-day trial
    """
    trial_days = 90
    if trial_end_date:
        delta = trial_end_date - datetime.utcnow()
        trial_days = max(0, delta.days)

    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #667eea;">Welcome to Our Family Socials! 🎉</h1>

            <p>Hi {name},</p>

            <p>Thank you for joining Our Family Socials! We're excited to help you preserve and share your family memories privately.</p>

            <h2 style="color: #667eea;">Your 90-Day Free Trial</h2>
            <p>You have <strong>{trial_days} days</strong> to explore all our features with no charge:</p>
            <ul>
                <li>✅ Unlimited events</li>
                <li>✅ Private sharing with custom groups</li>
                <li>✅ Followers-only privacy controls</li>
                <li>✅ Multi-location journey mapping</li>
                <li>✅ Rich media galleries</li>
            </ul>

            <p>Your trial ends on <strong>{trial_end_date.strftime('%B %d, %Y') if trial_end_date else 'in 90 days'}</strong>. We'll remind you before your card is charged.</p>

            <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Quick Tip:</strong> Start by creating your first event and inviting close family to follow you. They can request access, and you control who sees what!</p>
            </div>

            <p>
                <a href="https://www.ourfamilysocials.com/create"
                   style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px;">
                    Create Your First Event
                </a>
            </p>

            <p>Need help? Reply to this email anytime.</p>

            <p>Best regards,<br>
            The Our Family Socials Team</p>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="font-size: 12px; color: #718096;">
                You're receiving this email because you signed up for Our Family Socials.
            </p>
        </div>
    </body>
    </html>
    """

    return send_email(email, "Welcome to Our Family Socials - Your 90-Day Trial Starts Now!", html)


def send_trial_reminder_email(email: str, name: str, days_remaining: int):
    """
    Trial ending reminder (sent at 10, 3, and 1 days before trial ends)
    """
    if days_remaining == 1:
        subject = "Your trial ends tomorrow - Our Family Socials"
        urgency = "tomorrow"
    elif days_remaining <= 3:
        subject = f"{days_remaining} days left in your trial - Our Family Socials"
        urgency = f"in just {days_remaining} days"
    else:
        subject = f"{days_remaining} days left in your trial - Our Family Socials"
        urgency = f"in {days_remaining} days"

    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #667eea;">Your Trial Ends {urgency.title()}</h1>

            <p>Hi {name},</p>

            <p>We hope you're enjoying Our Family Socials! This is a friendly reminder that your 90-day free trial ends <strong>{urgency}</strong>.</p>

            <div style="background: #fff5f5; border-left: 4px solid #f56565; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #c53030;"><strong>What happens next:</strong></p>
                <p style="margin: 10px 0 0 0;">After your trial, we'll charge your card <strong>$9/month</strong> (or $90/year if you chose annual billing). You can cancel anytime before then.</p>
            </div>

            <h3>Want to continue? No action needed!</h3>
            <p>Your subscription will automatically begin, and you'll keep enjoying:</p>
            <ul>
                <li>Unlimited events</li>
                <li>Private sharing</li>
                <li>All premium features</li>
            </ul>

            <h3>Want to cancel?</h3>
            <p>
                <a href="https://www.ourfamilysocials.com/billing"
                   style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px;">
                    Manage Your Subscription
                </a>
            </p>

            <p>You can cancel with one click in your account settings. No questions asked.</p>

            <p>Questions? Just reply to this email.</p>

            <p>Best regards,<br>
            The Our Family Socials Team</p>
        </div>
    </body>
    </html>
    """

    return send_email(email, subject, html)


def send_payment_success_email(email: str, name: str, amount: float, period_end: Optional[datetime] = None):
    """
    Payment successful confirmation
    """
    period_text = period_end.strftime('%B %d, %Y') if period_end else "your next billing date"

    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #48bb78;">Payment Received ✓</h1>

            <p>Hi {name},</p>

            <p>Thank you! We've successfully processed your payment.</p>

            <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <table style="width: 100%;">
                    <tr>
                        <td style="padding: 8px 0;"><strong>Amount:</strong></td>
                        <td style="text-align: right;">${amount:.2f}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0;"><strong>Next billing date:</strong></td>
                        <td style="text-align: right;">{period_text}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0;"><strong>Status:</strong></td>
                        <td style="text-align: right; color: #48bb78;"><strong>Active</strong></td>
                    </tr>
                </table>
            </div>

            <p>Your subscription is active and all features are available.</p>

            <p>
                <a href="https://www.ourfamilysocials.com/billing"
                   style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px;">
                    View Billing Details
                </a>
            </p>

            <p>Thank you for being part of Our Family Socials!</p>

            <p>Best regards,<br>
            The Our Family Socials Team</p>
        </div>
    </body>
    </html>
    """

    return send_email(email, "Payment Received - Our Family Socials", html)


def send_payment_failed_email(email: str, name: str):
    """
    Payment failed - need to update card
    """
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #f56565;">Payment Failed</h1>

            <p>Hi {name},</p>

            <p>We were unable to process your most recent payment. This could be due to:</p>
            <ul>
                <li>Expired or declined card</li>
                <li>Insufficient funds</li>
                <li>Bank security hold</li>
            </ul>

            <div style="background: #fff5f5; border-left: 4px solid #f56565; padding: 15px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Action Required:</strong> Update your payment method to keep your account active.</p>
            </div>

            <p>
                <a href="https://www.ourfamilysocials.com/billing"
                   style="display: inline-block; padding: 12px 24px; background: #f56565; color: white; text-decoration: none; border-radius: 6px;">
                    Update Payment Method
                </a>
            </p>

            <p>Your account will remain active for a few more days while we retry the payment. Update your card to avoid any service interruption.</p>

            <p>Questions? Reply to this email and we'll help you out.</p>

            <p>Best regards,<br>
            The Our Family Socials Team</p>
        </div>
    </body>
    </html>
    """

    return send_email(email, "Payment Failed - Update Your Card", html)


def send_subscription_canceled_email(email: str, name: str):
    """
    Subscription canceled confirmation
    """
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #667eea;">Subscription Canceled</h1>

            <p>Hi {name},</p>

            <p>We've confirmed that your subscription has been canceled. We're sorry to see you go!</p>

            <p>Your access will continue until the end of your current billing period. After that, your account will be downgraded.</p>

            <h3>We'd love your feedback</h3>
            <p>What could we have done better? Your feedback helps us improve for everyone.</p>

            <p>
                <a href="https://www.ourfamilysocials.com/contact"
                   style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px;">
                    Share Feedback
                </a>
            </p>

            <p>Want to come back? You can reactivate anytime from your account settings.</p>

            <p>Thank you for being part of Our Family Socials.</p>

            <p>Best regards,<br>
            The Our Family Socials Team</p>
        </div>
    </body>
    </html>
    """

    return send_email(email, "Subscription Canceled - We'll Miss You", html)


# ============================================================================
# SOCIAL NOTIFICATION EMAILS
# ============================================================================

def send_follow_request_email(email: str, name: str, requester_name: str, requester_username: str):
    """
    Notification when someone requests to follow you
    """
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #667eea;">New Follow Request</h1>

            <p>Hi {name},</p>

            <p><strong>{requester_name}</strong> (@{requester_username}) wants to follow you on Our Family Socials.</p>

            <p>
                <a href="https://www.ourfamilysocials.com/profile/{requester_username}"
                   style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px;">
                    View Profile & Respond
                </a>
            </p>

            <p>If you accept, they'll be able to see your events shared with followers.</p>

            <p style="font-size: 12px; color: #718096;">
                You can manage follow requests in your profile settings.
            </p>
        </div>
    </body>
    </html>
    """

    return send_email(email, f"{requester_name} wants to follow you", html)


def send_follow_accepted_email(email: str, name: str, accepter_name: str, accepter_username: str):
    """
    Notification when your follow request is accepted
    """
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #48bb78;">Follow Request Accepted! ✓</h1>

            <p>Hi {name},</p>

            <p><strong>{accepter_name}</strong> (@{accepter_username}) accepted your follow request!</p>

            <p>You can now see their events and stay updated with their memories.</p>

            <p>
                <a href="https://www.ourfamilysocials.com/profile/{accepter_username}"
                   style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px;">
                    View Their Profile
                </a>
            </p>
        </div>
    </body>
    </html>
    """

    return send_email(email, f"{accepter_name} accepted your follow request", html)


def send_event_like_email(email: str, name: str, liker_name: str, liker_username: str, event_title: str, event_id: int):
    """
    Notification when someone likes your event
    """
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #667eea;">♥ New Like on Your Event</h1>

            <p>Hi {name},</p>

            <p><strong>{liker_name}</strong> (@{liker_username}) liked your event <strong>"{event_title}"</strong></p>

            <p>
                <a href="https://www.ourfamilysocials.com/event/{event_id}"
                   style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px;">
                    View Event
                </a>
            </p>
        </div>
    </body>
    </html>
    """

    return send_email(email, f"{liker_name} liked your event", html)


def send_event_comment_email(email: str, name: str, commenter_name: str, commenter_username: str, comment_text: str, event_title: str, event_id: int):
    """
    Notification when someone comments on your event
    """
    # Truncate long comments
    comment_preview = comment_text if len(comment_text) <= 100 else comment_text[:100] + "..."

    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #667eea;">💬 New Comment on Your Event</h1>

            <p>Hi {name},</p>

            <p><strong>{commenter_name}</strong> (@{commenter_username}) commented on <strong>"{event_title}"</strong>:</p>

            <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                <p style="margin: 0; font-style: italic;">"{comment_preview}"</p>
            </div>

            <p>
                <a href="https://www.ourfamilysocials.com/event/{event_id}#comments"
                   style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px;">
                    View & Reply
                </a>
            </p>
        </div>
    </body>
    </html>
    """

    return send_email(email, f"{commenter_name} commented on your event", html)


def send_new_event_published_email(email: str, name: str, author_name: str, author_username: str, event_title: str, event_id: int):
    """
    Notification when someone you follow publishes a new event
    """
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #667eea;">📸 New Event from {author_name}</h1>

            <p>Hi {name},</p>

            <p><strong>{author_name}</strong> (@{author_username}) just shared a new event:</p>

            <h2 style="color: #2d3748;">{event_title}</h2>

            <p>
                <a href="https://www.ourfamilysocials.com/event/{event_id}"
                   style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px;">
                    View Event
                </a>
            </p>

            <p style="font-size: 12px; color: #718096;">
                You're receiving this because you follow {author_name}. Manage email preferences in your account settings.
            </p>
        </div>
    </body>
    </html>
    """

    return send_email(email, f"New event from {author_name}: {event_title}", html)
