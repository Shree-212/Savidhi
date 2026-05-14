-- 020 — Re-add temples.is_active.
--
-- Migration 009 dropped this column under the (then-current) rule that temples
-- could only be deleted, not disabled. The 14-May-2026 spec reverses that:
-- admins now expect a status toggle in the temple list/edit forms that hides
-- inactive temples from the website without deleting them. Bookings for an
-- already-inactive temple keep processing — only new bookings are blocked
-- (the public listing endpoints filter by is_active = true).
--
-- All existing rows default to active so the change is invisible on apply.

ALTER TABLE temples
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
