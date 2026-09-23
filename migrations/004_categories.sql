CREATE TABLE IF NOT EXISTS bill_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID NULL REFERENCES bill_categories(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS bill_categories_user_idx ON bill_categories(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS bill_categories_user_name_parent_idx
  ON bill_categories(user_id, name, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid));