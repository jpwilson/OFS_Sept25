import resend
from typing import Optional
from ..core.config import settings

# Initialize Resend
resend.api_key = settings.RESEND_API_KEY

FROM_EMAIL = "Our Family Socials <notifications@ourfamilysocials.com>"


def send_email(
    to: str,
    subject: str,
    html: str,
    from_email: str = FROM_EMAIL
) -> dict:
    """Send an email using Resend"""
    if not settings.RESEND_API_KEY:
        print(f"Email not sent (no API key): {subject} to {to}")
        return {"id": "test", "error": "No API key configured"}

    try:
        params = {
            "from": from_email,
            "to": [to],
            "subject": subject,
            "html": html
        }
        response = resend.Emails.send(params)
        print(f"Email sent: {subject} to {to}")
        return response
    except Exception as e:
        print(f"Email error: {e}")
        return {"error": str(e)}


def send_event_share_email(
    to_email: str,
    from_name: str,
    event_title: str,
    share_url: str,
    personal_message: Optional[str] = None
) -> dict:
    """Send an event share invitation email"""

    message_html = ""
    if personal_message:
        message_html = f"""
        <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #555; font-style: italic;">"{personal_message}"</p>
            <p style="margin: 8px 0 0 0; color: #888; font-size: 14px;">— {from_name}</p>
        </div>
        """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Our Family Socials</h1>
            </div>

            <!-- Content -->
            <div style="padding: 32px;">
                <h2 style="color: #333; margin: 0 0 16px 0; font-size: 20px;">
                    {from_name} shared a family moment with you!
                </h2>

                <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    You've been invited to view <strong>"{event_title}"</strong>
                </p>

                {message_html}

                <div style="text-align: center; margin: 32px 0;">
                    <a href="{share_url}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        View Event
                    </a>
                </div>

                <p style="color: #888; font-size: 14px; text-align: center; margin: 0;">
                    This link will expire in 7 days
                </p>
            </div>

            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                <p style="color: #888; font-size: 13px; margin: 0;">
                    <a href="https://www.ourfamilysocials.com" style="color: #667eea; text-decoration: none;">Our Family Socials</a>
                    — Share your family's story
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    return send_email(
        to=to_email,
        subject=f"{from_name} shared \"{event_title}\" with you",
        html=html
    )


def send_welcome_email(to_email: str, username: str) -> dict:
    """Send welcome email to new users"""

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to Our Family Socials! 🎉</h1>
            </div>

            <!-- Content -->
            <div style="padding: 32px;">
                <h2 style="color: #333; margin: 0 0 16px 0; font-size: 20px;">
                    Hi {username}!
                </h2>

                <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Welcome to Our Family Socials — the private space for sharing your family's adventures, milestones, and everyday moments.
                </p>

                <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Your <strong>30-day free trial</strong> has started. Here's what you can do:
                </p>

                <ul style="color: #555; font-size: 15px; line-height: 1.8; margin: 0 0 24px 0; padding-left: 20px;">
                    <li>Create events with photos, videos, and stories</li>
                    <li>Map your family's journeys with multiple locations</li>
                    <li>Share privately with specific family members</li>
                    <li>Build a timeline of your family's memories</li>
                </ul>

                <div style="background: linear-gradient(135deg, rgba(240, 147, 251, 0.1) 0%, rgba(245, 87, 108, 0.1) 100%); border: 1px solid rgba(240, 147, 251, 0.3); border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <p style="color: #e84393; font-size: 14px; margin: 0;">
                        <strong>🎁 Early Bird Bonus:</strong> Subscribe within 5 days and get your first month FREE (60 days total)!
                    </p>
                </div>

                <div style="text-align: center; margin: 32px 0;">
                    <a href="https://www.ourfamilysocials.com" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        Start Creating
                    </a>
                </div>
            </div>

            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                <p style="color: #888; font-size: 13px; margin: 0;">
                    Questions? Reply to this email or visit our <a href="https://www.ourfamilysocials.com/contact" style="color: #667eea; text-decoration: none;">contact page</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    return send_email(
        to=to_email,
        subject="Welcome to Our Family Socials! 🎉",
        html=html
    )


def send_trial_reminder_email(
    to_email: str,
    username: str,
    days_remaining: int
) -> dict:
    """Send trial expiration reminder"""

    urgency_text = ""
    if days_remaining <= 3:
        urgency_text = "Your trial is almost over!"
    elif days_remaining <= 7:
        urgency_text = "Your trial ends soon"
    else:
        urgency_text = f"You have {days_remaining} days left"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">{urgency_text}</h1>
            </div>

            <!-- Content -->
            <div style="padding: 32px;">
                <h2 style="color: #333; margin: 0 0 16px 0; font-size: 20px;">
                    Hi {username},
                </h2>

                <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Your free trial of Our Family Socials ends in <strong>{days_remaining} days</strong>.
                </p>

                <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Subscribe now to keep access to all your family memories and continue creating new ones.
                </p>

                <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <p style="color: #333; font-size: 15px; margin: 0 0 12px 0; font-weight: 600;">What you'll keep:</p>
                    <ul style="color: #555; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
                        <li>All your created events and photos</li>
                        <li>Your family connections</li>
                        <li>Journey maps and timelines</li>
                        <li>Shared memories with family</li>
                    </ul>
                </div>

                <div style="text-align: center; margin: 32px 0;">
                    <a href="https://www.ourfamilysocials.com/billing" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        Subscribe Now
                    </a>
                </div>

                <p style="color: #888; font-size: 14px; text-align: center; margin: 0;">
                    Plans start at $7.50/month (billed annually)
                </p>
            </div>

            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                <p style="color: #888; font-size: 13px; margin: 0;">
                    <a href="https://www.ourfamilysocials.com" style="color: #667eea; text-decoration: none;">Our Family Socials</a>
                    — Share your family's story
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    return send_email(
        to=to_email,
        subject=f"Your trial ends in {days_remaining} days",
        html=html
    )


def send_new_follower_email(
    to_email: str,
    username: str,
    follower_name: str
) -> dict:
    """Notify user of new follower"""

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; text-align: center;">
                <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Our Family Socials</p>
                <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 600;">New Follower</h1>
            </div>

            <!-- Content -->
            <div style="padding: 32px; text-align: center;">
                <p style="color: #555; font-size: 18px; margin: 0 0 24px 0;">
                    <strong>{follower_name}</strong> is now following you
                </p>

                <a href="https://www.ourfamilysocials.com/profile/{follower_name}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                    View Profile
                </a>
            </div>

            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 16px; text-align: center; border-top: 1px solid #eee;">
                <p style="color: #888; font-size: 12px; margin: 0;">
                    <a href="https://www.ourfamilysocials.com" style="color: #667eea; text-decoration: none;">Our Family Socials</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    return send_email(
        to=to_email,
        subject=f"{follower_name} is now following you",
        html=html
    )


def send_new_comment_email(
    to_email: str,
    event_author_name: str,
    commenter_name: str,
    event_title: str,
    comment_preview: str,
    event_url: str
) -> dict:
    """Notify event author of new comment"""

    # Truncate comment preview if too long
    if len(comment_preview) > 150:
        comment_preview = comment_preview[:147] + "..."

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; text-align: center;">
                <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Our Family Socials</p>
                <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 600;">New Comment</h1>
            </div>

            <!-- Content -->
            <div style="padding: 32px;">
                <p style="color: #555; font-size: 16px; margin: 0 0 16px 0;">
                    <strong>{commenter_name}</strong> commented on your event
                </p>

                <p style="color: #333; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
                    "{event_title}"
                </p>

                <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 16px; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0; color: #555; font-style: italic;">"{comment_preview}"</p>
                </div>

                <div style="text-align: center; margin: 24px 0;">
                    <a href="{event_url}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                        View Comment
                    </a>
                </div>
            </div>

            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 16px; text-align: center; border-top: 1px solid #eee;">
                <p style="color: #888; font-size: 12px; margin: 0;">
                    <a href="https://www.ourfamilysocials.com/settings/notifications" style="color: #667eea; text-decoration: none;">Manage notification settings</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    return send_email(
        to=to_email,
        subject=f"{commenter_name} commented on \"{event_title}\"",
        html=html
    )


def send_follow_request_email(
    to_email: str,
    username: str,
    requester_name: str
) -> dict:
    """Notify user of new follow request"""

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; text-align: center;">
                <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Our Family Socials</p>
                <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 600;">Follow Request</h1>
            </div>

            <!-- Content -->
            <div style="padding: 32px; text-align: center;">
                <p style="color: #555; font-size: 18px; margin: 0 0 24px 0;">
                    <strong>{requester_name}</strong> wants to follow you
                </p>

                <a href="https://www.ourfamilysocials.com/profile/{username}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                    View Request
                </a>
            </div>

            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 16px; text-align: center; border-top: 1px solid #eee;">
                <p style="color: #888; font-size: 12px; margin: 0;">
                    <a href="https://www.ourfamilysocials.com/settings/notifications" style="color: #667eea; text-decoration: none;">Manage notification settings</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    return send_email(
        to=to_email,
        subject=f"{requester_name} wants to follow you",
        html=html
    )


def send_new_event_notification_email(
    to_email: str,
    follower_username: str,
    author_name: str,
    event_title: str,
    event_url: str,
    cover_image_url: Optional[str] = None
) -> dict:
    """Notify follower when someone they follow posts a new event"""

    image_html = ""
    if cover_image_url:
        image_html = f"""
        <div style="margin: 20px 0; border-radius: 8px; overflow: hidden;">
            <img src="{cover_image_url}" alt="{event_title}" style="width: 100%; height: auto; display: block;" />
        </div>
        """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; text-align: center;">
                <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Our Family Socials</p>
                <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 600;">New Event</h1>
            </div>

            <!-- Content -->
            <div style="padding: 32px;">
                <p style="color: #555; font-size: 16px; margin: 0 0 16px 0;">
                    Hi {follower_username}! <strong>{author_name}</strong> just shared a new family moment:
                </p>

                <h2 style="color: #333; font-size: 20px; margin: 0 0 16px 0;">
                    {event_title}
                </h2>

                {image_html}

                <div style="text-align: center; margin: 24px 0;">
                    <a href="{event_url}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        View Event
                    </a>
                </div>
            </div>

            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 16px; text-align: center; border-top: 1px solid #eee;">
                <p style="color: #888; font-size: 12px; margin: 0;">
                    <a href="https://www.ourfamilysocials.com/settings/notifications" style="color: #667eea; text-decoration: none;">Manage notification settings</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    return send_email(
        to=to_email,
        subject=f"{author_name} shared \"{event_title}\"",
        html=html
    )


def send_viewer_invitation_email(
    to_email: str,
    inviter_name: str,
    invited_name: str,
    invite_token: str,
    personal_message: Optional[str] = None
) -> dict:
    """
    Send invitation email to non-user.
    Includes signup link with invite token.
    """
    signup_url = f"https://www.ourfamilysocials.com/join/{invite_token}"

    message_html = ""
    if personal_message:
        message_html = f"""
        <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #555; font-style: italic;">"{personal_message}"</p>
            <p style="margin: 8px 0 0 0; color: #888; font-size: 14px;">— {inviter_name}</p>
        </div>
        """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; text-align: center;">
                <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Our Family Socials</p>
                <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 600;">You're Invited!</h1>
            </div>

            <!-- Content -->
            <div style="padding: 32px;">
                <p style="color: #333; font-size: 18px; margin: 0 0 16px 0;">
                    Hi {invited_name}!
                </p>

                <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    <strong>{inviter_name}</strong> wants to share their family moments with you on Our Family Socials.
                </p>

                {message_html}

                <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Join to see their photos, stories, and adventures. <strong>You'll always have free access to {inviter_name}'s events</strong> — no subscription needed to stay connected with their memories.
                </p>

                <div style="text-align: center; margin: 32px 0;">
                    <a href="{signup_url}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        Accept Invitation
                    </a>
                </div>

                <div style="background: #f0f7ff; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <p style="color: #555; font-size: 14px; margin: 0; line-height: 1.6;">
                        <strong>What you'll get:</strong><br>
                        • View {inviter_name}'s events forever, completely free<br>
                        • 30-day free trial to create your own events<br>
                        • Stay connected with family memories
                    </p>
                </div>
            </div>

            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                <p style="color: #888; font-size: 13px; margin: 0;">
                    <a href="https://www.ourfamilysocials.com" style="color: #667eea; text-decoration: none;">Our Family Socials</a>
                    — Share your family's story
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    return send_email(
        to=to_email,
        subject=f"{inviter_name} invited you to see their family moments",
        html=html
    )


def send_invited_viewer_new_event_email(
    to_email: str,
    viewer_name: str,
    author_name: str,
    event_title: str,
    event_url: str,
    cover_image_url: Optional[str] = None
) -> dict:
    """
    Notify invited viewer when their inviter posts a new event.
    Rate-limited to 1 per day per author (handled by caller).
    """
    image_html = ""
    if cover_image_url:
        image_html = f"""
        <div style="margin: 20px 0; border-radius: 8px; overflow: hidden;">
            <img src="{cover_image_url}" alt="{event_title}" style="width: 100%; height: auto; display: block;" />
        </div>
        """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; text-align: center;">
                <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Our Family Socials</p>
                <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 600;">New Family Moment</h1>
            </div>

            <!-- Content -->
            <div style="padding: 32px;">
                <p style="color: #555; font-size: 16px; margin: 0 0 16px 0;">
                    Hi {viewer_name}! <strong>{author_name}</strong> just shared something new:
                </p>

                <h2 style="color: #333; font-size: 20px; margin: 0 0 16px 0;">
                    {event_title}
                </h2>

                {image_html}

                <div style="text-align: center; margin: 24px 0;">
                    <a href="{event_url}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        View Event
                    </a>
                </div>
            </div>

            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 16px; text-align: center; border-top: 1px solid #eee;">
                <p style="color: #888; font-size: 12px; margin: 0;">
                    <a href="https://www.ourfamilysocials.com/settings/notifications" style="color: #667eea; text-decoration: none;">Manage notification settings</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    return send_email(
        to=to_email,
        subject=f"{author_name} shared \"{event_title}\"",
        html=html
    )


def send_subscription_expired_to_follower_email(
    to_email: str,
    follower_name: str,
    expired_user_name: str,
    expired_user_username: str
) -> dict:
    """
    Notify a follower that someone they follow is no longer a paying member.
    Their events are now hidden.
    """
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; text-align: center;">
                <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Our Family Socials</p>
                <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 600;">Account Update</h1>
            </div>

            <!-- Content -->
            <div style="padding: 32px;">
                <p style="color: #333; font-size: 18px; margin: 0 0 16px 0;">
                    Hi {follower_name},
                </p>

                <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    <strong>{expired_user_name}</strong> (@{expired_user_username}) is no longer an active member of Our Family Socials.
                </p>

                <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <p style="color: #666; font-size: 14px; margin: 0; line-height: 1.6;">
                        Their events are currently hidden. If they resubscribe, you'll be able to see their content again.
                    </p>
                </div>

                <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    In the meantime, you can still enjoy events from your other connections!
                </p>

                <div style="text-align: center; margin: 24px 0;">
                    <a href="https://www.ourfamilysocials.com/feed" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                        Browse Events
                    </a>
                </div>
            </div>

            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 16px; text-align: center; border-top: 1px solid #eee;">
                <p style="color: #888; font-size: 12px; margin: 0;">
                    <a href="https://www.ourfamilysocials.com/settings/notifications" style="color: #667eea; text-decoration: none;">Manage notification settings</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    return send_email(
        to=to_email,
        subject=f"{expired_user_name} is no longer an active member",
        html=html
    )


def send_trial_ending_invited_viewer_email(
    to_email: str,
    username: str,
    days_remaining: int,
    inviter_names: list
) -> dict:
    """
    Special trial reminder for invited viewers.
    Explains what they'll still have access to after trial ends.
    """
    inviters_text = ", ".join(inviter_names) if inviter_names else "your inviter"

    urgency_text = ""
    if days_remaining <= 3:
        urgency_text = "Your trial is almost over!"
    elif days_remaining <= 7:
        urgency_text = "Your trial ends soon"
    else:
        urgency_text = f"You have {days_remaining} days left"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 24px; text-align: center;">
                <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Our Family Socials</p>
                <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 600;">{urgency_text}</h1>
            </div>

            <!-- Content -->
            <div style="padding: 32px;">
                <h2 style="color: #333; margin: 0 0 16px 0; font-size: 20px;">
                    Hi {username},
                </h2>

                <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Your free trial of Our Family Socials ends in <strong>{days_remaining} days</strong>.
                </p>

                <div style="background: #e8f5e9; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <p style="color: #2e7d32; font-size: 15px; margin: 0 0 8px 0; font-weight: 600;">
                        Good news! You'll still have access to:
                    </p>
                    <p style="color: #555; font-size: 14px; margin: 0;">
                        Events shared by <strong>{inviters_text}</strong>
                    </p>
                </div>

                <div style="background: #fff3e0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <p style="color: #e65100; font-size: 15px; margin: 0 0 8px 0; font-weight: 600;">
                        After your trial, you won't be able to:
                    </p>
                    <ul style="color: #555; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
                        <li>Create your own events</li>
                        <li>Follow new people</li>
                        <li>See events from others (except {inviters_text})</li>
                    </ul>
                </div>

                <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                    Want full access? Subscribe to keep all features and share your own family moments!
                </p>

                <div style="text-align: center; margin: 32px 0;">
                    <a href="https://www.ourfamilysocials.com/billing" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        Subscribe Now
                    </a>
                </div>

                <p style="color: #888; font-size: 14px; text-align: center; margin: 0;">
                    Plans start at $7.50/month (billed annually)
                </p>
            </div>

            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                <p style="color: #888; font-size: 13px; margin: 0;">
                    <a href="https://www.ourfamilysocials.com" style="color: #667eea; text-decoration: none;">Our Family Socials</a>
                    — Share your family's story
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    return send_email(
        to=to_email,
        subject=f"Your trial ends in {days_remaining} days - here's what happens next",
        html=html
    )


def send_subscription_confirmed_email(
    to_email: str,
    username: str,
    plan_type: str  # 'monthly', 'annual', or 'lifetime'
) -> dict:
    """
    Send confirmation email when user subscribes.
    Uses percentage-based messaging to build purchase confidence.
    """

    # Plan-specific messaging
    if plan_type == 'annual':
        savings_text = """
        <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="color: #667eea; font-size: 15px; margin: 0; font-weight: 600;">
                💰 Smart choice! You're saving 25% compared to monthly billing.
            </p>
            <p style="color: #555; font-size: 14px; margin: 8px 0 0 0;">
                That's the kind of decision future-you will thank you for.
            </p>
        </div>
        """
    elif plan_type == 'lifetime':
        savings_text = """
        <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="color: #667eea; font-size: 15px; margin: 0; font-weight: 600;">
                🏆 Welcome to the inner circle!
            </p>
            <p style="color: #555; font-size: 14px; margin: 8px 0 0 0;">
                One payment, lifetime access. While others pay monthly, you're set forever. As we add new features and prices increase, you'll always have full access at no extra cost.
            </p>
        </div>
        """
    else:  # monthly
        savings_text = """
        <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="color: #667eea; font-size: 15px; margin: 0; font-weight: 600;">
                ✨ Complete flexibility!
            </p>
            <p style="color: #555; font-size: 14px; margin: 8px 0 0 0;">
                Adjust or cancel anytime. No long-term commitments, no hassle. (Psst... switch to annual anytime to save 25%!)
            </p>
        </div>
        """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to the Family! 🎉</h1>
            </div>

            <!-- Content -->
            <div style="padding: 32px;">
                <h2 style="color: #333; margin: 0 0 16px 0; font-size: 20px;">
                    Hi {username}!
                </h2>

                <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    <strong>You're officially part of Our Family Socials!</strong>
                </p>

                <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Smart move joining today. You've secured your membership at our founding member rate — prices typically increase as we add new features, but yours is locked in.
                </p>

                {savings_text}

                <p style="color: #333; font-size: 16px; font-weight: 600; margin: 24px 0 12px 0;">
                    What's next?
                </p>
                <ul style="color: #555; font-size: 15px; line-height: 1.8; margin: 0 0 24px 0; padding-left: 20px;">
                    <li>Create your first family event</li>
                    <li>Invite loved ones to follow your journey</li>
                    <li>Start building your private family archive</li>
                </ul>

                <div style="text-align: center; margin: 32px 0;">
                    <a href="https://www.ourfamilysocials.com/create" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        Create Your First Event
                    </a>
                </div>

                <p style="color: #888; font-size: 14px; text-align: center; margin: 0;">
                    Questions? Just reply to this email — we're here to help.
                </p>
            </div>

            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                <p style="color: #888; font-size: 13px; margin: 0;">
                    With gratitude,<br>
                    <strong>The Our Family Socials Team</strong>
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    return send_email(
        to=to_email,
        subject="Welcome to the family! Your membership is active 🎉",
        html=html
    )


def send_billing_history_email(
    to_email: str,
    username: str,
    payments: list  # List of dicts with: date, description, amount, status
) -> dict:
    """
    Send billing history/spending summary email.
    """

    # Build payments table rows
    payments_html = ""
    total_spent = 0
    for payment in payments:
        status_color = "#22c55e" if payment.get('status') == 'paid' else "#f59e0b"
        status_text = payment.get('status', 'paid').capitalize()
        amount = payment.get('amount', 0)
        total_spent += amount if payment.get('status') == 'paid' else 0

        payments_html += f"""
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee; color: #555;">{payment.get('date', 'N/A')}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; color: #555;">{payment.get('description', 'Subscription')}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; color: #333; font-weight: 500;">${amount:.2f}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee;"><span style="color: {status_color}; font-weight: 500;">{status_text}</span></td>
        </tr>
        """

    if not payments:
        payments_html = """
        <tr>
            <td colspan="4" style="padding: 24px; text-align: center; color: #888;">No payment history found</td>
        </tr>
        """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; text-align: center;">
                <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Our Family Socials</p>
                <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 600;">Your Billing History</h1>
            </div>

            <!-- Content -->
            <div style="padding: 24px;">
                <p style="color: #555; font-size: 16px; margin: 0 0 20px 0;">
                    Hi {username}, here's a summary of your billing history:
                </p>

                <!-- Summary -->
                <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 0 0 24px 0; text-align: center;">
                    <p style="color: #888; font-size: 14px; margin: 0 0 4px 0;">Total spent</p>
                    <p style="color: #333; font-size: 28px; font-weight: 700; margin: 0;">${total_spent:.2f}</p>
                </div>

                <!-- Payments table -->
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="padding: 12px; text-align: left; color: #666; font-weight: 600;">Date</th>
                            <th style="padding: 12px; text-align: left; color: #666; font-weight: 600;">Description</th>
                            <th style="padding: 12px; text-align: left; color: #666; font-weight: 600;">Amount</th>
                            <th style="padding: 12px; text-align: left; color: #666; font-weight: 600;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payments_html}
                    </tbody>
                </table>

                <div style="text-align: center; margin: 32px 0 16px 0;">
                    <a href="https://www.ourfamilysocials.com/billing" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                        Manage Subscription
                    </a>
                </div>
            </div>

            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 16px; text-align: center; border-top: 1px solid #eee;">
                <p style="color: #888; font-size: 12px; margin: 0;">
                    Questions about billing? Reply to this email or visit our <a href="https://www.ourfamilysocials.com/contact" style="color: #667eea; text-decoration: none;">help center</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    return send_email(
        to=to_email,
        subject="Your Our Family Socials billing history",
        html=html
    )


def send_payment_receipt_email(
    to_email: str,
    username: str,
    amount: float,
    description: str,
    date: str,
    invoice_url: Optional[str] = None
) -> dict:
    """
    Send payment receipt for a single transaction.
    Only sent if user has opted in to payment receipts.
    """

    invoice_button = ""
    if invoice_url:
        invoice_button = f"""
        <div style="text-align: center; margin: 24px 0;">
            <a href="{invoice_url}" style="display: inline-block; border: 2px solid #667eea; color: #667eea; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                Download Invoice (PDF)
            </a>
        </div>
        """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; text-align: center;">
                <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Our Family Socials</p>
                <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 600;">Payment Receipt</h1>
            </div>

            <!-- Content -->
            <div style="padding: 32px;">
                <p style="color: #555; font-size: 16px; margin: 0 0 24px 0;">
                    Hi {username}, thanks for your continued support!
                </p>

                <!-- Receipt box -->
                <div style="background: #f8f9fa; border-radius: 8px; padding: 24px; margin: 0 0 24px 0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e5e5e5;">
                        <span style="color: #888;">Date</span>
                        <span style="color: #333; font-weight: 500;">{date}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e5e5e5;">
                        <span style="color: #888;">Description</span>
                        <span style="color: #333; font-weight: 500;">{description}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #888;">Amount</span>
                        <span style="color: #333; font-size: 20px; font-weight: 700;">${amount:.2f}</span>
                    </div>
                </div>

                <p style="color: #22c55e; font-size: 14px; text-align: center; margin: 0 0 16px 0;">
                    ✓ Payment successful
                </p>

                {invoice_button}

                <p style="color: #888; font-size: 13px; text-align: center; margin: 24px 0 0 0;">
                    This receipt was sent because you have payment notifications enabled.<br>
                    <a href="https://www.ourfamilysocials.com/billing" style="color: #667eea; text-decoration: none;">Manage preferences</a>
                </p>
            </div>

            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 16px; text-align: center; border-top: 1px solid #eee;">
                <p style="color: #888; font-size: 12px; margin: 0;">
                    <a href="https://www.ourfamilysocials.com" style="color: #667eea; text-decoration: none;">Our Family Socials</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    return send_email(
        to=to_email,
        subject=f"Payment receipt: ${amount:.2f} - Our Family Socials",
        html=html
    )
