CREATE TABLE IF NOT EXISTS bill_payment_methods (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id TEXT NOT NULL,
 name TEXT NOT NULL,
 type TEXT NOT NULL DEFAULT 'other',
 card_last4 TEXT,
 is_default BOOLEAN DEFAULT false,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS bill_payment_methods_user_idx ON bill_payment_methods(user_id);
ALTER TABLE bills ADD COLUMN IF NOT EXISTS payment_method_id UUID;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS payment_method_name TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS payment_card_last4 TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS subscription_id TEXT;