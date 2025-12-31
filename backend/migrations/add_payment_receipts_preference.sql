-- Add notify_payment_receipts preference column
-- Default is FALSE (opt-in for payment receipt emails)

ALTER TABLE users
ADD COLUMN IF NOT EXISTS notify_payment_receipts BOOLEAN DEFAULT FALSE;

-- Update existing users to have the default value
UPDATE users SET notify_payment_receipts = FALSE WHERE notify_payment_receipts IS NULL;
