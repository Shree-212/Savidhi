-- 015_shlok.sql — Add Shlok (read-only Sankalp text shown to devotees on booking flow)
-- The website replaces the user-typed "sankalp" textbox with a read-only block
-- driven by these columns. Hindi columns mirror migration 013's pattern.

ALTER TABLE pujas     ADD COLUMN IF NOT EXISTS shlok    TEXT;
ALTER TABLE pujas     ADD COLUMN IF NOT EXISTS shlok_hi TEXT;
ALTER TABLE chadhavas ADD COLUMN IF NOT EXISTS shlok    TEXT;
ALTER TABLE chadhavas ADD COLUMN IF NOT EXISTS shlok_hi TEXT;
