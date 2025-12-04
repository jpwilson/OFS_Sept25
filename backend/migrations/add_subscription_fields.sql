-- Add subscription and trial tracking fields to users table
-- Run this in Supabase SQL Editor

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS subscribed_within_5_days BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'trial';

-- Add index for faster subscription lookups
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);

-- Subscription status values: 'trial', 'active', 'canceled', 'expired'
-- subscription_tier values remain: 'free', 'premium', 'family'

-- Set trial dates for existing users (30 days from account creation)
UPDATE users
SET
  trial_start_date = created_at,
  trial_end_date = created_at + INTERVAL '30 days',
  subscription_status = CASE
    WHEN subscription_tier IN ('premium', 'family') THEN 'active'
    ELSE 'trial'
  END
WHERE trial_start_date IS NULL;
