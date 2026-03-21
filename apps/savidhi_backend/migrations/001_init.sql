-- ═══════════════════════════════════════════════════════════════════════════════
-- Savidhi Database Schema
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Auth & Users ──────────────────────────────────────────────────────────────

CREATE TABLE admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  name          VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'BOOKING_MANAGER', 'VIEW_ONLY')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_admin_users_email ON admin_users(email);

CREATE TABLE devotees (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  phone         VARCHAR(15) NOT NULL UNIQUE,
  gotra         VARCHAR(100),
  image_url     TEXT,
  level         INT NOT NULL DEFAULT 1,
  gems          INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_devotees_phone ON devotees(phone);

CREATE TABLE refresh_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  user_type     VARCHAR(10) NOT NULL CHECK (user_type IN ('ADMIN', 'DEVOTEE')),
  token_hash    VARCHAR(255) NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked       BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id, user_type);

CREATE TABLE achievements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  image_url     TEXT,
  criteria_type VARCHAR(50) NOT NULL,
  criteria_value INT NOT NULL,
  gems_reward   INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE devotee_achievements (
  devotee_id    UUID NOT NULL REFERENCES devotees(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (devotee_id, achievement_id)
);

CREATE TABLE gems_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devotee_id    UUID NOT NULL REFERENCES devotees(id) ON DELETE CASCADE,
  amount        INT NOT NULL,
  reason        VARCHAR(50) NOT NULL,
  reference_id  UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_gems_txn_devotee ON gems_transactions(devotee_id);

-- ─── Catalog ───────────────────────────────────────────────────────────────────

CREATE TABLE temples (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    VARCHAR(255) NOT NULL,
  address                 TEXT NOT NULL,
  pincode                 VARCHAR(10),
  google_map_link         TEXT,
  about                   TEXT,
  history_and_significance TEXT,
  sample_video_url        TEXT,
  slider_images           TEXT[] DEFAULT '{}',
  is_active               BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE deities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  image_url     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE temple_deities (
  temple_id     UUID NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
  deity_id      UUID NOT NULL REFERENCES deities(id) ON DELETE CASCADE,
  PRIMARY KEY (temple_id, deity_id)
);

CREATE TABLE pujaris (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  temple_id       UUID NOT NULL REFERENCES temples(id),
  designation     VARCHAR(100),
  profile_pic     TEXT,
  aadhar_number   VARCHAR(20),
  pan_number      VARCHAR(20),
  aadhar_pic      TEXT,
  pan_pic         TEXT,
  bank_name       VARCHAR(100),
  ifsc            VARCHAR(20),
  account_number  VARCHAR(30),
  rating          NUMERIC(3,2) NOT NULL DEFAULT 0,
  unsettled_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  start_date      DATE,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pujaris_temple ON pujaris(temple_id);

CREATE TABLE astrologers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  designation     VARCHAR(100) NOT NULL,
  languages       TEXT[] DEFAULT '{}',
  expertise       TEXT,
  about           TEXT,
  profile_pic     TEXT,
  slider_images   TEXT[] DEFAULT '{}',
  aadhar_number   VARCHAR(20),
  pan_number      VARCHAR(20),
  aadhar_pic      TEXT,
  pan_pic         TEXT,
  price_15min     NUMERIC(10,2) NOT NULL,
  price_30min     NUMERIC(10,2) NOT NULL,
  price_1hour     NUMERIC(10,2) NOT NULL,
  price_2hour     NUMERIC(10,2) NOT NULL,
  bank_name       VARCHAR(100),
  ifsc            VARCHAR(20),
  account_number  VARCHAR(30),
  rating          NUMERIC(3,2) NOT NULL DEFAULT 0,
  unsettled_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  start_date      DATE,
  off_days        TEXT[] DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE hampers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(255) NOT NULL,
  content_description   TEXT NOT NULL,
  stock_qty             INT NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pujas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(255) NOT NULL,
  temple_id             UUID NOT NULL REFERENCES temples(id),
  deity_id              UUID REFERENCES deities(id),
  default_pujari_id     UUID REFERENCES pujaris(id),
  schedule_day          VARCHAR(100),
  schedule_time         VARCHAR(50),
  schedule_datetime     TIMESTAMPTZ,
  event_repeats         BOOLEAN NOT NULL DEFAULT false,
  lunar_phase           VARCHAR(50),
  max_bookings_per_event INT NOT NULL DEFAULT 100,
  booking_mode          VARCHAR(20) NOT NULL DEFAULT 'ONE_TIME' CHECK (booking_mode IN ('ONE_TIME', 'SUBSCRIPTION', 'BOTH')),
  price_for_1           NUMERIC(10,2) NOT NULL,
  price_for_2           NUMERIC(10,2) NOT NULL,
  price_for_4           NUMERIC(10,2) NOT NULL,
  price_for_6           NUMERIC(10,2) NOT NULL,
  sample_video_url      TEXT,
  slider_images         TEXT[] DEFAULT '{}',
  benefits              TEXT,
  rituals_included      TEXT,
  hamper_id             UUID REFERENCES hampers(id),
  send_hamper           BOOLEAN NOT NULL DEFAULT false,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pujas_temple ON pujas(temple_id);

CREATE TABLE chadhavas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(255) NOT NULL,
  temple_id             UUID NOT NULL REFERENCES temples(id),
  schedule_day          VARCHAR(100),
  schedule_time         VARCHAR(50),
  max_bookings_per_event INT NOT NULL DEFAULT 100,
  booking_mode          VARCHAR(20) NOT NULL DEFAULT 'ONE_TIME' CHECK (booking_mode IN ('ONE_TIME', 'SUBSCRIPTION', 'BOTH')),
  sample_video_url      TEXT,
  slider_images         TEXT[] DEFAULT '{}',
  benefits              TEXT,
  rituals_included      TEXT,
  hamper_id             UUID REFERENCES hampers(id),
  send_hamper           BOOLEAN NOT NULL DEFAULT false,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chadhavas_temple ON chadhavas(temple_id);

CREATE TABLE chadhava_offerings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chadhava_id   UUID NOT NULL REFERENCES chadhavas(id) ON DELETE CASCADE,
  item_name     VARCHAR(255) NOT NULL,
  benefit       TEXT,
  price         NUMERIC(10,2) NOT NULL,
  images        TEXT[] DEFAULT '{}',
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chadhava_offerings_chadhava ON chadhava_offerings(chadhava_id);

CREATE TABLE app_settings (
  id                      INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  home_puja_slider_ids    UUID[] DEFAULT '{}',
  whatsapp_support_number VARCHAR(20),
  call_support_number     VARCHAR(20),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO app_settings (id) VALUES (1);

-- ─── Bookings ──────────────────────────────────────────────────────────────────

CREATE TABLE puja_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  puja_id         UUID NOT NULL REFERENCES pujas(id),
  pujari_id       UUID REFERENCES pujaris(id),
  start_time      TIMESTAMPTZ NOT NULL,
  max_bookings    INT NOT NULL DEFAULT 100,
  status          VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'INPROGRESS', 'COMPLETED')),
  stage           VARCHAR(30) NOT NULL DEFAULT 'YET_TO_START' CHECK (stage IN ('YET_TO_START', 'LIVE_ADDED', 'SHORT_VIDEO_ADDED', 'SANKALP_VIDEO_ADDED', 'TO_BE_SHIPPED', 'SHIPPED')),
  live_link       TEXT,
  short_video_url TEXT,
  sankalp_video_url TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_puja_events_puja ON puja_events(puja_id);
CREATE INDEX idx_puja_events_status ON puja_events(status);
CREATE INDEX idx_puja_events_start ON puja_events(start_time);

CREATE TABLE puja_bookings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  puja_event_id         UUID NOT NULL REFERENCES puja_events(id),
  devotee_id            UUID NOT NULL REFERENCES devotees(id),
  devotee_count         INT NOT NULL DEFAULT 1,
  cost                  NUMERIC(10,2) NOT NULL,
  sankalp               TEXT,
  prasad_delivery_address TEXT,
  status                VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'INPROGRESS', 'COMPLETED', 'CANCELLED')),
  sankalp_video_timestamp VARCHAR(50),
  payment_id            VARCHAR(100),
  payment_status        VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'REFUNDED', 'FAILED')),
  shipment_id           VARCHAR(100),
  shipment_status       VARCHAR(20),
  booking_type          VARCHAR(20) NOT NULL DEFAULT 'ONE_TIME' CHECK (booking_type IN ('ONE_TIME', 'SUBSCRIPTION')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_puja_bookings_event ON puja_bookings(puja_event_id);
CREATE INDEX idx_puja_bookings_devotee ON puja_bookings(devotee_id);
CREATE INDEX idx_puja_bookings_status ON puja_bookings(status);

CREATE TABLE puja_booking_devotees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  puja_booking_id UUID NOT NULL REFERENCES puja_bookings(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  relation        VARCHAR(100),
  gotra           VARCHAR(100) NOT NULL
);
CREATE INDEX idx_puja_booking_devotees_booking ON puja_booking_devotees(puja_booking_id);

CREATE TABLE chadhava_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chadhava_id     UUID NOT NULL REFERENCES chadhavas(id),
  pujari_id       UUID REFERENCES pujaris(id),
  start_time      TIMESTAMPTZ NOT NULL,
  max_bookings    INT NOT NULL DEFAULT 100,
  status          VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'INPROGRESS', 'COMPLETED')),
  stage           VARCHAR(30) NOT NULL DEFAULT 'YET_TO_START' CHECK (stage IN ('YET_TO_START', 'LIVE_ADDED', 'SHORT_VIDEO_ADDED', 'SANKALP_VIDEO_ADDED', 'TO_BE_SHIPPED', 'SHIPPED')),
  live_link       TEXT,
  short_video_url TEXT,
  sankalp_video_url TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chadhava_events_chadhava ON chadhava_events(chadhava_id);

CREATE TABLE chadhava_bookings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chadhava_event_id     UUID NOT NULL REFERENCES chadhava_events(id),
  devotee_id            UUID NOT NULL REFERENCES devotees(id),
  cost                  NUMERIC(10,2) NOT NULL,
  sankalp               TEXT,
  prasad_delivery_address TEXT,
  status                VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'INPROGRESS', 'COMPLETED', 'CANCELLED')),
  sankalp_video_timestamp VARCHAR(50),
  payment_id            VARCHAR(100),
  payment_status        VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'REFUNDED', 'FAILED')),
  shipment_id           VARCHAR(100),
  shipment_status       VARCHAR(20),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chadhava_bookings_event ON chadhava_bookings(chadhava_event_id);
CREATE INDEX idx_chadhava_bookings_devotee ON chadhava_bookings(devotee_id);

CREATE TABLE chadhava_booking_devotees (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chadhava_booking_id UUID NOT NULL REFERENCES chadhava_bookings(id) ON DELETE CASCADE,
  name                VARCHAR(255) NOT NULL,
  gotra               VARCHAR(100) NOT NULL
);

CREATE TABLE chadhava_booking_offerings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chadhava_booking_id UUID NOT NULL REFERENCES chadhava_bookings(id) ON DELETE CASCADE,
  offering_id         UUID NOT NULL REFERENCES chadhava_offerings(id),
  quantity            INT NOT NULL DEFAULT 1,
  unit_price          NUMERIC(10,2) NOT NULL,
  devotee_name        VARCHAR(255)
);
CREATE INDEX idx_chadhava_bo_booking ON chadhava_booking_offerings(chadhava_booking_id);

CREATE TABLE appointments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  astrologer_id   UUID NOT NULL REFERENCES astrologers(id),
  devotee_id      UUID NOT NULL REFERENCES devotees(id),
  duration        VARCHAR(10) NOT NULL CHECK (duration IN ('15min', '30min', '1hour', '2hour')),
  scheduled_at    TIMESTAMPTZ NOT NULL,
  cost            NUMERIC(10,2) NOT NULL,
  status          VARCHAR(30) NOT NULL DEFAULT 'LINK_YET_TO_BE_GENERATED' CHECK (status IN ('LINK_YET_TO_BE_GENERATED', 'INPROGRESS', 'COMPLETED', 'CANCELLED')),
  meet_link       TEXT,
  payment_id      VARCHAR(100),
  payment_status  VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'REFUNDED', 'FAILED')),
  devotee_name    VARCHAR(255),
  devotee_gotra   VARCHAR(100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_appointments_astrologer ON appointments(astrologer_id);
CREATE INDEX idx_appointments_devotee ON appointments(devotee_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_at);

CREATE TABLE ledger_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id        UUID NOT NULL,
  party_type      VARCHAR(15) NOT NULL CHECK (party_type IN ('PUJARI', 'ASTROLOGER')),
  event_type      VARCHAR(15) NOT NULL CHECK (event_type IN ('PUJA', 'CHADHAVA', 'APPOINTMENT')),
  event_id        UUID NOT NULL,
  fee             NUMERIC(10,2) NOT NULL,
  settled         BOOLEAN NOT NULL DEFAULT false,
  settled_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ledger_party ON ledger_entries(party_id, party_type);
CREATE INDEX idx_ledger_settled ON ledger_entries(settled);

CREATE TABLE payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_type      VARCHAR(15) NOT NULL CHECK (booking_type IN ('PUJA', 'CHADHAVA', 'APPOINTMENT')),
  booking_id        UUID NOT NULL,
  devotee_id        UUID NOT NULL REFERENCES devotees(id),
  amount            NUMERIC(10,2) NOT NULL,
  currency          VARCHAR(3) NOT NULL DEFAULT 'INR',
  gateway           VARCHAR(20) NOT NULL DEFAULT 'RAZORPAY',
  gateway_order_id  VARCHAR(100),
  gateway_payment_id VARCHAR(100),
  gateway_signature VARCHAR(255),
  status            VARCHAR(20) NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payments_booking ON payments(booking_type, booking_id);
CREATE INDEX idx_payments_devotee ON payments(devotee_id);

-- ─── Seed default admin ────────────────────────────────────────────────────────
-- Password: admin123 (bcrypt hash)
INSERT INTO admin_users (email, name, password_hash, role)
VALUES ('admin@savidhi.in', 'Super Admin', '$2b$10$rQZ8K5H5GzZxJf5YzFKIguOIwXJcE5.qjV7vL0VXwC1wD5xK3qDfK', 'ADMIN');
