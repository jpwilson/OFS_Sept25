# PostHog Analytics Setup

This document explains how to set up PostHog analytics for Our Family Socials.

## Overview

PostHog analytics has been integrated with the following privacy-first features:
- **Session recording**: Disabled
- **Text masking**: All text and input fields are masked
- **No PII tracking**: Only anonymous user IDs are used (no emails, names, or family details)
- **Sanitized URLs**: All paths are sanitized to remove usernames, tokens, and event IDs
- **Privacy-safe events**: No photo content, captions, or family information is sent

## Environment Variables

Add these environment variables to Vercel:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add the following variables:

```
VITE_POSTHOG_KEY=<your-posthog-project-api-key>
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

**Important**: If `VITE_POSTHOG_KEY` is not set, analytics will be automatically disabled and the app will function normally. No errors will occur.

## Getting Your PostHog API Key

1. Sign up for PostHog Cloud (US): https://app.posthog.com/signup
2. Select "US Cloud" when prompted
3. Create a new project or use an existing one
4. Go to Project Settings → API keys
5. Copy the "Project API Key"

## Tracked Events

The following events are tracked:

### Pageviews
- Automatically tracked on all route changes
- URLs are sanitized to remove usernames, event IDs, and tokens

### User Events
- `sign_up` - When a user creates an account
- `start_checkout` - When a user starts the Stripe checkout process
- `purchase_success` - When a user completes a subscription purchase
- `create_family` - When a user publishes a new event (not drafts)
- `invite_member` - When a user sends an email invitation
- `upload_photo` - When a user uploads a photo (event-level, not every image)

### Properties Tracked
All events only include:
- `user_id` - Anonymous numeric ID (e.g., `user_123`)
- Context properties (category, billing period, method)
- **NO PII**: No emails, names, usernames, photo URLs, or family details

## Privacy Compliance

PostHog has been configured for maximum privacy:

1. **Session Recording**: Completely disabled
2. **Text Masking**: All text content and form inputs are masked
3. **URL Sanitization**: Removes usernames, event IDs, share tokens, and join tokens
4. **Property Blacklisting**: Blocks fields like email, name, username, photo URLs
5. **Do Not Track**: Respects browser DNT settings
6. **Autocapture**: Disabled to prevent accidental PII collection

This configuration is appropriate for a private family social network with children's content.

## Testing

To verify analytics are working:

1. Set the environment variables in Vercel
2. Deploy to production
3. Open PostHog dashboard: https://app.posthog.com
4. Go to Activity → Live Events
5. Perform actions (sign up, navigate pages, create event)
6. Verify events appear in real-time

## Disabling Analytics

To disable analytics:
1. Remove or unset `VITE_POSTHOG_KEY` in Vercel environment variables
2. Redeploy the application
3. PostHog will not initialize and no tracking will occur

## Support

PostHog Documentation: https://posthog.com/docs
Support: support@posthog.com
