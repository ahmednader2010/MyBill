ALTER TABLE bills ADD COLUMN IF NOT EXISTS session_schedule_start DATE;
UPDATE bills b
SET session_schedule_start=COALESCE(
  (SELECT MIN(s.session_date) FROM bill_sessions s WHERE s.bill_id=b.id AND s.user_id=b.user_id),
  b.session_next_date,
  b.due_date
)
WHERE b.frequency='session_based' AND b.session_schedule_start IS NULL;
ALTER TABLE bill_sessions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
DELETE FROM bill_sessions a USING bill_sessions b
WHERE a.id>b.id AND a.bill_id=b.bill_id AND a.user_id=b.user_id AND a.session_date=b.session_date;
CREATE UNIQUE INDEX IF NOT EXISTS bill_sessions_one_per_day_idx ON bill_sessions(bill_id,user_id,session_date);