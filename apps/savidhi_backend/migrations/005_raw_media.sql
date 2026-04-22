-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 005 — Raw (unedited) media retention for audit & re-edit
-- ═══════════════════════════════════════════════════════════════════════════
--
-- The Admin Panel Data Entry CSVs distinguish between:
--   - "Unedited" raw media uploaded by the temple staff
--   - "Post Edit" polished assets served to devotees
--
-- Before this migration, only the post-edit versions were stored. These new
-- columns preserve the originals so the ops team can re-produce edits, audit
-- what was captured on the day, or regenerate assets after a rebrand.
--
-- All columns are optional — UIs handle null gracefully.

ALTER TABLE temples
  ADD COLUMN IF NOT EXISTS sample_video_url_raw TEXT,
  ADD COLUMN IF NOT EXISTS slider_images_raw    TEXT[] DEFAULT '{}';

ALTER TABLE pujas
  ADD COLUMN IF NOT EXISTS sample_video_url_raw TEXT,
  ADD COLUMN IF NOT EXISTS slider_images_raw    TEXT[] DEFAULT '{}';

ALTER TABLE chadhavas
  ADD COLUMN IF NOT EXISTS sample_video_url_raw TEXT,
  ADD COLUMN IF NOT EXISTS slider_images_raw    TEXT[] DEFAULT '{}';

ALTER TABLE astrologers
  ADD COLUMN IF NOT EXISTS profile_pic_raw    TEXT,
  ADD COLUMN IF NOT EXISTS slider_images_raw  TEXT[] DEFAULT '{}';

ALTER TABLE pujaris
  ADD COLUMN IF NOT EXISTS profile_pic_raw    TEXT;

-- Optional audit note: who uploaded each batch (free-text, e.g. "Uploaded by
-- Sahayak on 2026-05-03 via admin").
ALTER TABLE temples     ADD COLUMN IF NOT EXISTS raw_media_audit_note TEXT;
ALTER TABLE pujas       ADD COLUMN IF NOT EXISTS raw_media_audit_note TEXT;
ALTER TABLE chadhavas   ADD COLUMN IF NOT EXISTS raw_media_audit_note TEXT;
ALTER TABLE astrologers ADD COLUMN IF NOT EXISTS raw_media_audit_note TEXT;
ALTER TABLE pujaris     ADD COLUMN IF NOT EXISTS raw_media_audit_note TEXT;
