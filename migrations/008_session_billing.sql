CREATE TABLE IF NOT EXISTS bill_sessions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id TEXT NOT NULL,
 bill_id UUID NOT NULL,
 session_date DATE NOT NULL,
 status TEXT NOT NULL DEFAULT 'completed',
 note TEXT,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS bill_sessions_bill_idx ON bill_sessions(bill_id,user_id,session_date);
ALTER TABLE bills ADD COLUMN IF NOT EXISTS session_target INTEGER;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS session_count INTEGER DEFAULT 0;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS session_weekdays TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS session_next_date DATE;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS session_cycle INTEGER DEFAULT 1;
ALTER TABLE bill_sessions ADD COLUMN IF NOT EXISTS cycle INTEGER DEFAULT 1;