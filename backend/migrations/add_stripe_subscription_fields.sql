-- ============================================================================
-- Migration: Add Stripe Subscription Fields to Users Table
-- Date: 2025-12-01
-- Purpose: Add columns needed for Stripe subscription integration with 90-day trial
-- ============================================================================

-- Add Stripe subscription columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMP,
  ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN DEFAULT FALSE;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription ON users(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);

-- ============================================================================
-- subscription_status values:
--   'inactive'  - No subscription yet (new users before checkout)
--   'trialing'  - In 90-day trial period
--   'active'    - Paying customer (trial ended or manually activated)
--   'past_due'  - Payment failed but subscription still active
--   'canceled'  - User canceled subscription
-- ============================================================================

-- Set existing users (founders/test accounts) to active with no expiration
-- IMPORTANT: Replace the email addresses below with your actual founder emails
UPDATE users
SET subscription_status = 'active',
    subscription_period_end = NULL,
    trial_end_date = NULL
WHERE email IN (
  'jpwilson@example.com'  -- REPLACE WITH YOUR EMAIL
  -- Add more founder emails as needed:
  -- , 'founder2@example.com'
  -- , 'founder3@example.com'
);

-- Verify the migration
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name LIKE '%stripe%' OR column_name LIKE '%subscription%' OR column_name LIKE '%trial%'
ORDER BY ordinal_position;
