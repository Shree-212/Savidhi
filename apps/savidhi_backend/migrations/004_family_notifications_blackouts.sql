-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 004 — family_members, notifications, astrologer_blackout_dates
-- Adds three tables needed by wireframes that were missing from 001_init.
-- Idempotent: uses IF NOT EXISTS.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── family_members ─────────────────────────────────────────────────────────
-- Links two devotees with a named relationship. A row per direction is NOT
-- created automatically — the inviter owns the row; `status` tracks the
-- invitee's response. The invitee sees the row via the reverse-lookup index.
CREATE TABLE IF NOT EXISTS family_members (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devotee_id         UUID NOT NULL REFERENCES devotees(id) ON DELETE CASCADE,
  linked_devotee_id  UUID NOT NULL REFERENCES devotees(id) ON DELETE CASCADE,
  relation           VARCHAR(50) NOT NULL,         -- Father, Mother, Spouse, Son, Daughter, Brother, Sister, Other
  status             VARCHAR(10) NOT NULL DEFAULT 'PENDING'
                       CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (devotee_id, linked_devotee_id),
  CHECK (devotee_id != linked_devotee_id)
);
CREATE INDEX IF NOT EXISTS idx_family_devotee ON family_members(devotee_id);
CREATE INDEX IF NOT EXISTS idx_family_linked  ON family_members(linked_devotee_id);
CREATE INDEX IF NOT EXISTS idx_family_status  ON family_members(status);

-- ─── notifications ──────────────────────────────────────────────────────────
-- Targeted or broadcast notifications shown in the mobile inbox screen.
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devotee_id    UUID REFERENCES devotees(id) ON DELETE CASCADE,   -- NULL = broadcast
  type          VARCHAR(50) NOT NULL,                              -- BOOKING_UPDATE, LIVE_STARTED, PRASAD_SHIPPED, REMINDER, FAMILY_REQUEST, GENERIC
  title         VARCHAR(255) NOT NULL,
  body          TEXT NOT NULL,
  deep_link     TEXT,                                              -- e.g. savidhi://booking/<id>
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  read          BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_devotee        ON notifications(devotee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_devotee_unread ON notifications(devotee_id) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notif_type           ON notifications(type);

-- ─── astrologer_blackout_dates ──────────────────────────────────────────────
-- Explicit date-level blocks (holidays, emergencies) — a stricter companion to
-- astrologers.off_days (day-of-week) that already exists.
CREATE TABLE IF NOT EXISTS astrologer_blackout_dates (
  astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  blackout_date DATE NOT NULL,
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (astrologer_id, blackout_date)
);
CREATE INDEX IF NOT EXISTS idx_blackout_date ON astrologer_blackout_dates(blackout_date);

-- ─── payment idempotency key (for create-order retry safety) ────────────────
-- Ensures repeated create-order calls for the same booking return the same
-- Razorpay order rather than creating duplicates.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency
  ON payments(idempotency_key) WHERE idempotency_key IS NOT NULL;
