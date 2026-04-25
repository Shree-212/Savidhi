-- 006: Add SEO-friendly slugs to public-facing catalog entities.
-- Affects: pujas, chadhavas, temples, astrologers
--
-- Strategy:
--   1. Add a TEXT slug column (idempotent ADD COLUMN IF NOT EXISTS).
--   2. Backfill existing rows by slugifying name; suffix -2, -3, ... on collisions.
--   3. Mark NOT NULL and add a UNIQUE index per table.
--   4. Add a BEFORE INSERT trigger so new rows auto-generate a slug if none was
--      provided in the payload (so admin clients don't have to compute one).
--
-- The route layer accepts both UUID and slug for backwards compatibility, so
-- existing bookmarks / mobile-app calls keep working.

-- ── Slugify helper ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION savidhi_slugify(input TEXT) RETURNS TEXT AS $$
BEGIN
  RETURN trim(BOTH '-' FROM regexp_replace(
    regexp_replace(
      regexp_replace(
        lower(coalesce(input, '')),
        '[^a-z0-9\s-]+', '', 'g'    -- drop non-alphanum (keep spaces + hyphens)
      ),
      '\s+', '-', 'g'                -- whitespace → hyphen
    ),
    '-+', '-', 'g'                   -- collapse repeated hyphens
  ));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ── Add slug columns (nullable; backfilled below before NOT NULL is set) ──
ALTER TABLE pujas       ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE chadhavas   ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE temples     ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE astrologers ADD COLUMN IF NOT EXISTS slug TEXT;

-- ── Backfill: slugify(name); on collision append -2, -3, ... ──────────────
DO $$
DECLARE
  rec        RECORD;
  base_slug  TEXT;
  candidate  TEXT;
  attempt    INT;
BEGIN
  -- pujas
  FOR rec IN SELECT id, name FROM pujas WHERE slug IS NULL OR slug = '' ORDER BY created_at LOOP
    base_slug := savidhi_slugify(rec.name);
    IF base_slug = '' THEN base_slug := 'puja'; END IF;
    candidate := base_slug;
    attempt := 1;
    WHILE EXISTS (SELECT 1 FROM pujas WHERE slug = candidate AND id <> rec.id) LOOP
      attempt := attempt + 1;
      candidate := base_slug || '-' || attempt;
    END LOOP;
    UPDATE pujas SET slug = candidate WHERE id = rec.id;
  END LOOP;

  -- chadhavas
  FOR rec IN SELECT id, name FROM chadhavas WHERE slug IS NULL OR slug = '' ORDER BY created_at LOOP
    base_slug := savidhi_slugify(rec.name);
    IF base_slug = '' THEN base_slug := 'chadhava'; END IF;
    candidate := base_slug;
    attempt := 1;
    WHILE EXISTS (SELECT 1 FROM chadhavas WHERE slug = candidate AND id <> rec.id) LOOP
      attempt := attempt + 1;
      candidate := base_slug || '-' || attempt;
    END LOOP;
    UPDATE chadhavas SET slug = candidate WHERE id = rec.id;
  END LOOP;

  -- temples
  FOR rec IN SELECT id, name FROM temples WHERE slug IS NULL OR slug = '' ORDER BY created_at LOOP
    base_slug := savidhi_slugify(rec.name);
    IF base_slug = '' THEN base_slug := 'temple'; END IF;
    candidate := base_slug;
    attempt := 1;
    WHILE EXISTS (SELECT 1 FROM temples WHERE slug = candidate AND id <> rec.id) LOOP
      attempt := attempt + 1;
      candidate := base_slug || '-' || attempt;
    END LOOP;
    UPDATE temples SET slug = candidate WHERE id = rec.id;
  END LOOP;

  -- astrologers
  FOR rec IN SELECT id, name FROM astrologers WHERE slug IS NULL OR slug = '' ORDER BY created_at LOOP
    base_slug := savidhi_slugify(rec.name);
    IF base_slug = '' THEN base_slug := 'astrologer'; END IF;
    candidate := base_slug;
    attempt := 1;
    WHILE EXISTS (SELECT 1 FROM astrologers WHERE slug = candidate AND id <> rec.id) LOOP
      attempt := attempt + 1;
      candidate := base_slug || '-' || attempt;
    END LOOP;
    UPDATE astrologers SET slug = candidate WHERE id = rec.id;
  END LOOP;
END $$;

-- ── Constraints + unique indexes ──────────────────────────────────────────
ALTER TABLE pujas       ALTER COLUMN slug SET NOT NULL;
ALTER TABLE chadhavas   ALTER COLUMN slug SET NOT NULL;
ALTER TABLE temples     ALTER COLUMN slug SET NOT NULL;
ALTER TABLE astrologers ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pujas_slug_idx       ON pujas(slug);
CREATE UNIQUE INDEX IF NOT EXISTS chadhavas_slug_idx   ON chadhavas(slug);
CREATE UNIQUE INDEX IF NOT EXISTS temples_slug_idx     ON temples(slug);
CREATE UNIQUE INDEX IF NOT EXISTS astrologers_slug_idx ON astrologers(slug);

-- ── BEFORE INSERT trigger: auto-generate slug when not provided ──────────
CREATE OR REPLACE FUNCTION savidhi_ensure_slug() RETURNS TRIGGER AS $$
DECLARE
  base_slug    TEXT;
  candidate    TEXT;
  attempt      INT;
  exists_check BOOLEAN;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := savidhi_slugify(NEW.name);
    IF base_slug = '' THEN base_slug := TG_TABLE_NAME; END IF;
    candidate := base_slug;
    attempt := 1;
    LOOP
      EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I WHERE slug = $1 AND id <> $2)', TG_TABLE_NAME)
        INTO exists_check
        USING candidate, COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
      EXIT WHEN NOT exists_check;
      attempt := attempt + 1;
      candidate := base_slug || '-' || attempt;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pujas_slug_trigger       ON pujas;
DROP TRIGGER IF EXISTS chadhavas_slug_trigger   ON chadhavas;
DROP TRIGGER IF EXISTS temples_slug_trigger     ON temples;
DROP TRIGGER IF EXISTS astrologers_slug_trigger ON astrologers;

CREATE TRIGGER pujas_slug_trigger       BEFORE INSERT ON pujas       FOR EACH ROW EXECUTE FUNCTION savidhi_ensure_slug();
CREATE TRIGGER chadhavas_slug_trigger   BEFORE INSERT ON chadhavas   FOR EACH ROW EXECUTE FUNCTION savidhi_ensure_slug();
CREATE TRIGGER temples_slug_trigger     BEFORE INSERT ON temples     FOR EACH ROW EXECUTE FUNCTION savidhi_ensure_slug();
CREATE TRIGGER astrologers_slug_trigger BEFORE INSERT ON astrologers FOR EACH ROW EXECUTE FUNCTION savidhi_ensure_slug();
