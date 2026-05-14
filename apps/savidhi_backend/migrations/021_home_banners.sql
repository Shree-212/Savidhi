-- 021_home_banners.sql
-- Adds the home_banners JSONB column to app_settings. Each entry is
--   { image_url: string, target_type: 'puja'|'chadhava', target_id: uuid }
-- Admin uploads the image and picks a puja/chadhava; the devotee homepage
-- renders an auto-playing carousel. Inactive targets are filtered at read
-- time so deactivated pujas/chadhavas don't show stale banners.

BEGIN;

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS home_banners JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMIT;
