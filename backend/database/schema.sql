-- GetYourGuide-like travel booking platform schema (PostgreSQL)
-- Baseline: cost-optimized modular monolith, scalable to high traffic

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- =========================
-- ENUMS
-- =========================
CREATE TYPE user_role AS ENUM ('customer', 'supplier_admin', 'supplier_staff', 'operator', 'admin');
CREATE TYPE user_status AS ENUM ('pending', 'active', 'suspended', 'deleted');
CREATE TYPE supplier_status AS ENUM ('pending', 'active', 'suspended');
CREATE TYPE tour_status AS ENUM ('draft', 'published', 'paused', 'archived');
CREATE TYPE media_type AS ENUM ('image', 'video', 'document');
CREATE TYPE price_component_type AS ENUM ('base', 'addon', 'tax', 'fee', 'discount');
CREATE TYPE inventory_mode AS ENUM ('shared', 'per_option', 'per_departure');
CREATE TYPE booking_status AS ENUM (
  'initiated',
  'pending_payment',
  'confirmed',
  'failed',
  'cancelled_by_customer',
  'cancelled_by_operator',
  'expired',
  'refunded_partial',
  'refunded_full'
);
CREATE TYPE payment_status AS ENUM ('created', 'authorized', 'captured', 'failed', 'cancelled', 'refunded', 'partially_refunded');
CREATE TYPE refund_status AS ENUM ('requested', 'approved', 'rejected', 'processing', 'succeeded', 'failed');
CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'paid', 'failed');
CREATE TYPE review_status AS ENUM ('pending', 'published', 'hidden', 'rejected');
CREATE TYPE promo_type AS ENUM ('percent', 'fixed_amount');
CREATE TYPE promo_scope AS ENUM ('global', 'supplier', 'tour', 'option');
CREATE TYPE webhook_event_status AS ENUM ('received', 'processed', 'failed', 'ignored');
CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'push', 'in_app');
CREATE TYPE departure_slot_status AS ENUM ('active', 'sold_out', 'cancelled', 'completed');
CREATE TYPE blog_post_status AS ENUM ('draft', 'review', 'published', 'archived');
CREATE TYPE conversation_type AS ENUM ('support', 'booking', 'supplier_customer', 'system');
CREATE TYPE conversation_status AS ENUM ('open', 'pending', 'resolved', 'closed', 'spam');
CREATE TYPE message_type AS ENUM ('text', 'system', 'image', 'file');
CREATE TYPE cms_page_status AS ENUM ('draft', 'published', 'archived');

-- =========================
-- REFERENCE DATA
-- =========================
CREATE TABLE countries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iso2                CHAR(2) NOT NULL UNIQUE,
  iso3                CHAR(3) NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  currency_code       CHAR(3) NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cities (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id          UUID NOT NULL REFERENCES countries(id),
  name                TEXT NOT NULL,
  normalized_name     CITEXT NOT NULL,
  latitude            NUMERIC(9,6),
  longitude           NUMERIC(9,6),
  timezone            TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_id, normalized_name)
);
CREATE INDEX idx_cities_normalized_name ON cities (normalized_name);

CREATE TABLE languages (
  code                VARCHAR(10) PRIMARY KEY,
  name                TEXT NOT NULL
);

CREATE TABLE currencies (
  code                CHAR(3) PRIMARY KEY,
  name                TEXT NOT NULL,
  symbol              TEXT,
  decimals            SMALLINT NOT NULL DEFAULT 2 CHECK (decimals BETWEEN 0 AND 4)
);

CREATE TABLE exchange_rates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency       CHAR(3) NOT NULL REFERENCES currencies(code),
  quote_currency      CHAR(3) NOT NULL REFERENCES currencies(code),
  rate                NUMERIC(20,10) NOT NULL CHECK (rate > 0),
  effective_at        TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (base_currency, quote_currency, effective_at)
);

-- =========================
-- IAM / USERS
-- =========================
CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               CITEXT NOT NULL UNIQUE,
  password_hash       TEXT,
  first_name          TEXT,
  last_name           TEXT,
  phone_e164          TEXT,
  preferred_language  VARCHAR(10) REFERENCES languages(code),
  preferred_currency  CHAR(3) REFERENCES currencies(code),
  status              user_status NOT NULL DEFAULT 'pending',
  email_verified_at   TIMESTAMPTZ,
  last_login_at       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ,
  CHECK (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  CHECK (phone_e164 IS NULL OR phone_e164 ~ '^\+[1-9][0-9]{6,14}$')
);
CREATE INDEX idx_users_status ON users (status);
CREATE INDEX idx_users_created_at ON users (created_at DESC);

CREATE TABLE user_roles (
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role                user_role NOT NULL,
  assigned_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

CREATE TABLE user_oauth_accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL,
  provider_user_id    TEXT NOT NULL,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_user_id)
);

CREATE TABLE user_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash  TEXT NOT NULL,
  ip_address          INET,
  user_agent          TEXT,
  expires_at          TIMESTAMPTZ NOT NULL,
  revoked_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_sessions_user_id ON user_sessions (user_id, expires_at DESC);

-- =========================
-- SUPPLIER / MERCHANT
-- =========================
CREATE TABLE suppliers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name          TEXT NOT NULL,
  display_name        TEXT NOT NULL,
  slug                CITEXT NOT NULL UNIQUE,
  email               CITEXT,
  phone_e164          TEXT,
  country_id          UUID REFERENCES countries(id),
  city_id             UUID REFERENCES cities(id),
  address_line        TEXT,
  tax_id              TEXT,
  status              supplier_status NOT NULL DEFAULT 'pending',
  rating_avg          NUMERIC(3,2) CHECK (rating_avg BETWEEN 0 AND 5),
  rating_count        INTEGER NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (email IS NULL OR email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  CHECK (phone_e164 IS NULL OR phone_e164 ~ '^\+[1-9][0-9]{6,14}$')
);
CREATE UNIQUE INDEX uq_suppliers_email ON suppliers (email) WHERE email IS NOT NULL;

CREATE TABLE supplier_users (
  supplier_id         UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role                user_role NOT NULL CHECK (role IN ('supplier_admin', 'supplier_staff')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (supplier_id, user_id, role)
);

CREATE TABLE supplier_settlements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id         UUID NOT NULL REFERENCES suppliers(id),
  currency_code       CHAR(3) NOT NULL REFERENCES currencies(code),
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,
  gross_amount        NUMERIC(14,2) NOT NULL DEFAULT 0,
  platform_fee_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_amount          NUMERIC(14,2) NOT NULL DEFAULT 0,
  payout_status       payout_status NOT NULL DEFAULT 'pending',
  paid_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start)
);

-- =========================
-- CATALOG
-- =========================
CREATE TABLE categories (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id           UUID REFERENCES categories(id),
  slug                CITEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tours (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id         UUID NOT NULL REFERENCES suppliers(id),
  city_id             UUID NOT NULL REFERENCES cities(id),
  slug                CITEXT NOT NULL UNIQUE,
  title               TEXT NOT NULL,
  short_description   TEXT,
  full_description    TEXT,
  meeting_point       TEXT,
  latitude            NUMERIC(9,6),
  longitude           NUMERIC(9,6),
  duration_minutes    INTEGER CHECK (duration_minutes > 0),
  max_group_size      INTEGER CHECK (max_group_size > 0),
  status              tour_status NOT NULL DEFAULT 'draft',
  inventory_mode      inventory_mode NOT NULL DEFAULT 'per_departure',
  cancellation_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  included_items      JSONB NOT NULL DEFAULT '[]'::jsonb,
  excluded_items      JSONB NOT NULL DEFAULT '[]'::jsonb,
  highlights          JSONB NOT NULL DEFAULT '[]'::jsonb,
  rating_avg          NUMERIC(3,2) CHECK (rating_avg BETWEEN 0 AND 5),
  rating_count        INTEGER NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
  booking_count       INTEGER NOT NULL DEFAULT 0 CHECK (booking_count >= 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at        TIMESTAMPTZ
);
CREATE INDEX idx_tours_city_status ON tours (city_id, status);
CREATE INDEX idx_tours_supplier_status ON tours (supplier_id, status);
CREATE INDEX idx_tours_created_at ON tours (created_at DESC);

CREATE TABLE tour_translations (
  tour_id             UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  language_code       VARCHAR(10) NOT NULL REFERENCES languages(code),
  title               TEXT NOT NULL,
  short_description   TEXT,
  full_description    TEXT,
  included_items      JSONB,
  excluded_items      JSONB,
  highlights          JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tour_id, language_code)
);

CREATE TABLE tour_categories (
  tour_id             UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  category_id         UUID NOT NULL REFERENCES categories(id),
  PRIMARY KEY (tour_id, category_id)
);

CREATE TABLE tour_media (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id             UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  media_type          media_type NOT NULL,
  url                 TEXT NOT NULL,
  alt_text            TEXT,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  is_cover            BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tour_media_tour_id ON tour_media (tour_id, sort_order);

CREATE TABLE tour_tags (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                CITEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tour_tag_map (
  tour_id             UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  tag_id              UUID NOT NULL REFERENCES tour_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (tour_id, tag_id)
);

CREATE TABLE tour_options (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id             UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  code                TEXT NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT,
  is_default          BOOLEAN NOT NULL DEFAULT false,
  min_participants    INTEGER NOT NULL DEFAULT 1 CHECK (min_participants > 0),
  max_participants    INTEGER CHECK (max_participants > 0),
  duration_minutes    INTEGER CHECK (duration_minutes > 0),
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tour_id, code),
  CHECK (max_participants IS NULL OR max_participants >= min_participants)
);
CREATE INDEX idx_tour_options_tour_id ON tour_options (tour_id, is_active);

CREATE TABLE option_pricing_rules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_option_id      UUID NOT NULL REFERENCES tour_options(id) ON DELETE CASCADE,
  component_type      price_component_type NOT NULL DEFAULT 'base',
  traveler_type       TEXT NOT NULL DEFAULT 'adult',
  currency_code       CHAR(3) NOT NULL REFERENCES currencies(code),
  amount              NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  valid_from          TIMESTAMPTZ NOT NULL,
  valid_to            TIMESTAMPTZ,
  days_of_week        SMALLINT[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6,7],
  min_quantity        INTEGER NOT NULL DEFAULT 1 CHECK (min_quantity > 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (valid_to IS NULL OR valid_to > valid_from),
  CHECK (days_of_week <@ ARRAY[1,2,3,4,5,6,7]::SMALLINT[]),
  CHECK (array_length(days_of_week, 1) > 0)
);
CREATE INDEX idx_option_pricing_rules_lookup
  ON option_pricing_rules (tour_option_id, traveler_type, valid_from, valid_to);

CREATE TABLE departure_slots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_option_id      UUID NOT NULL REFERENCES tour_options(id) ON DELETE CASCADE,
  starts_at           TIMESTAMPTZ NOT NULL,
  ends_at             TIMESTAMPTZ,
  timezone            TEXT,
  status              departure_slot_status NOT NULL DEFAULT 'active',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);
CREATE INDEX idx_departure_slots_option_time
  ON departure_slots (tour_option_id, starts_at);
CREATE INDEX idx_departure_slots_time ON departure_slots (starts_at);

CREATE TABLE inventory_slots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_slot_id   UUID NOT NULL REFERENCES departure_slots(id) ON DELETE CASCADE,
  total_capacity      INTEGER NOT NULL CHECK (total_capacity >= 0),
  held_capacity       INTEGER NOT NULL DEFAULT 0 CHECK (held_capacity >= 0),
  booked_capacity     INTEGER NOT NULL DEFAULT 0 CHECK (booked_capacity >= 0),
  oversell_limit      INTEGER NOT NULL DEFAULT 0 CHECK (oversell_limit >= 0),
  version             BIGINT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (departure_slot_id),
  CHECK (held_capacity + booked_capacity <= total_capacity + oversell_limit)
);

CREATE TABLE inventory_holds (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_slot_id   UUID NOT NULL REFERENCES inventory_slots(id) ON DELETE CASCADE,
  booking_id          UUID,
  quantity            INTEGER NOT NULL CHECK (quantity > 0),
  expires_at          TIMESTAMPTZ NOT NULL,
  released_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inventory_holds_slot_active
  ON inventory_holds (inventory_slot_id, expires_at)
  WHERE released_at IS NULL;

-- =========================
-- BOOKING
-- =========================
CREATE TABLE booking_carts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id),
  currency_code       CHAR(3) NOT NULL REFERENCES currencies(code),
  expires_at          TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE booking_cart_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id             UUID NOT NULL REFERENCES booking_carts(id) ON DELETE CASCADE,
  departure_slot_id   UUID NOT NULL REFERENCES departure_slots(id),
  traveler_mix        JSONB NOT NULL DEFAULT '[]'::jsonb,
  quantity            INTEGER NOT NULL CHECK (quantity > 0),
  unit_price          NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  total_price         NUMERIC(12,2) NOT NULL CHECK (total_price >= 0),
  added_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref         TEXT NOT NULL UNIQUE,
  user_id             UUID REFERENCES users(id),
  supplier_id         UUID REFERENCES suppliers(id),
  status              booking_status NOT NULL DEFAULT 'initiated',
  currency_code       CHAR(3) NOT NULL REFERENCES currencies(code),
  subtotal_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
  fee_amount          NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_amount          NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount        NUMERIC(14,2) NOT NULL DEFAULT 0,
  contact_email       CITEXT,
  contact_phone_e164  TEXT,
  notes               TEXT,
  cancellation_reason TEXT,
  confirmed_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,
  idempotency_key     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (total_amount >= 0),
  CHECK (contact_email IS NULL OR contact_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  CHECK (contact_phone_e164 IS NULL OR contact_phone_e164 ~ '^\+[1-9][0-9]{6,14}$')
);
CREATE INDEX idx_bookings_user_time ON bookings (user_id, created_at DESC);
CREATE INDEX idx_bookings_supplier_time ON bookings (supplier_id, created_at DESC);
CREATE INDEX idx_bookings_status_time ON bookings (status, created_at DESC);
CREATE UNIQUE INDEX uq_bookings_idempotency_key ON bookings (idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE inventory_holds
  ADD CONSTRAINT fk_inventory_holds_booking
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;

CREATE TABLE booking_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  tour_id             UUID NOT NULL REFERENCES tours(id),
  tour_option_id      UUID NOT NULL REFERENCES tour_options(id),
  departure_slot_id   UUID NOT NULL REFERENCES departure_slots(id),
  inventory_slot_id   UUID REFERENCES inventory_slots(id),
  title_snapshot      TEXT NOT NULL,
  option_snapshot     TEXT,
  starts_at_snapshot  TIMESTAMPTZ NOT NULL,
  traveler_mix        JSONB NOT NULL DEFAULT '[]'::jsonb,
  quantity            INTEGER NOT NULL CHECK (quantity > 0),
  unit_price          NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  line_total          NUMERIC(14,2) NOT NULL CHECK (line_total >= 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_booking_items_booking_id ON booking_items (booking_id);
CREATE INDEX idx_booking_items_departure_slot_id ON booking_items (departure_slot_id);

CREATE TABLE booking_travelers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_item_id     UUID NOT NULL REFERENCES booking_items(id) ON DELETE CASCADE,
  traveler_type       TEXT NOT NULL,
  first_name          TEXT,
  last_name           TEXT,
  birth_date          DATE,
  nationality         CHAR(2),
  passport_number     TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE booking_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  event_type          TEXT NOT NULL,
  payload             JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_booking_events_booking_id ON booking_events (booking_id, created_at DESC);

CREATE TABLE booking_vouchers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  voucher_code        TEXT NOT NULL UNIQUE,
  qr_payload          TEXT,
  issued_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  redeemed_at         TIMESTAMPTZ,
  UNIQUE (booking_id)
);

-- =========================
-- PAYMENT / REFUND
-- =========================
CREATE TABLE payment_methods (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
  provider            TEXT NOT NULL,
  provider_method_id  TEXT NOT NULL,
  method_type         TEXT,
  brand               TEXT,
  last4               TEXT,
  exp_month           SMALLINT,
  exp_year            SMALLINT,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_method_id)
);

CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  payment_method_id   UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
  provider            TEXT NOT NULL,
  provider_payment_id TEXT,
  status              payment_status NOT NULL DEFAULT 'created',
  currency_code       CHAR(3) NOT NULL REFERENCES currencies(code),
  amount              NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  authorized_amount   NUMERIC(14,2) NOT NULL DEFAULT 0,
  captured_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
  refunded_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
  failure_code        TEXT,
  failure_message     TEXT,
  idempotency_key     TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  authorized_at       TIMESTAMPTZ,
  captured_at         TIMESTAMPTZ,
  failed_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_payment_id),
  CHECK (authorized_amount >= 0),
  CHECK (captured_amount >= 0),
  CHECK (refunded_amount >= 0),
  CHECK (authorized_amount <= amount),
  CHECK (captured_amount <= amount),
  CHECK (refunded_amount <= captured_amount)
);
CREATE INDEX idx_payments_booking ON payments (booking_id, created_at DESC);
CREATE UNIQUE INDEX uq_payments_idempotency_key ON payments (idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE payment_webhook_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider            TEXT NOT NULL,
  provider_event_id   TEXT NOT NULL,
  event_type          TEXT NOT NULL,
  status              webhook_event_status NOT NULL DEFAULT 'received',
  payload             JSONB NOT NULL,
  received_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at        TIMESTAMPTZ,
  error_message       TEXT,
  UNIQUE (provider, provider_event_id)
);

CREATE TABLE refunds (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id          UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  booking_id          UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  provider_refund_id  TEXT,
  status              refund_status NOT NULL DEFAULT 'requested',
  currency_code       CHAR(3) NOT NULL REFERENCES currencies(code),
  amount              NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  reason              TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by          UUID REFERENCES users(id),
  requested_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ,
  UNIQUE (provider_refund_id)
);
CREATE INDEX idx_refunds_booking ON refunds (booking_id, requested_at DESC);

CREATE TABLE invoices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  invoice_number      TEXT NOT NULL UNIQUE,
  buyer_name          TEXT,
  buyer_tax_id        TEXT,
  billing_address     TEXT,
  currency_code       CHAR(3) NOT NULL REFERENCES currencies(code),
  subtotal_amount     NUMERIC(14,2) NOT NULL,
  tax_amount          NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount        NUMERIC(14,2) NOT NULL,
  issued_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  pdf_url             TEXT
);

-- =========================
-- PROMOTION / LOYALTY
-- =========================
CREATE TABLE promotions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                CITEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  promo_type          promo_type NOT NULL,
  promo_scope         promo_scope NOT NULL,
  value               NUMERIC(12,2) NOT NULL CHECK (value > 0),
  max_discount_amount NUMERIC(12,2),
  min_order_amount    NUMERIC(12,2) DEFAULT 0,
  usage_limit_total   INTEGER,
  usage_limit_per_user INTEGER,
  starts_at           TIMESTAMPTZ NOT NULL,
  ends_at             TIMESTAMPTZ,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at > starts_at),
  CHECK (min_order_amount IS NULL OR min_order_amount >= 0),
  CHECK (max_discount_amount IS NULL OR max_discount_amount >= 0),
  CHECK (usage_limit_total IS NULL OR usage_limit_total >= 0),
  CHECK (usage_limit_per_user IS NULL OR usage_limit_per_user >= 0),
  CHECK (promo_type <> 'percent' OR value <= 100)
);

CREATE TABLE promotion_scopes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id        UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  supplier_id         UUID REFERENCES suppliers(id),
  tour_id             UUID REFERENCES tours(id),
  tour_option_id      UUID REFERENCES tour_options(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (supplier_id IS NOT NULL)::int +
    (tour_id IS NOT NULL)::int +
    (tour_option_id IS NOT NULL)::int <= 1
  )
);

CREATE TABLE promotion_redemptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id        UUID NOT NULL REFERENCES promotions(id),
  booking_id          UUID NOT NULL REFERENCES bookings(id),
  user_id             UUID REFERENCES users(id),
  discount_amount     NUMERIC(12,2) NOT NULL CHECK (discount_amount >= 0),
  redeemed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (promotion_id, booking_id)
);
CREATE INDEX idx_promotion_redemptions_user ON promotion_redemptions (promotion_id, user_id);

-- =========================
-- REVIEW / CONTENT
-- =========================
CREATE TABLE reviews (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id             UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  booking_id          UUID REFERENCES bookings(id) ON DELETE SET NULL,
  user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
  rating              SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title               TEXT,
  body                TEXT,
  language_code       VARCHAR(10) REFERENCES languages(code),
  status              review_status NOT NULL DEFAULT 'pending',
  verified_booking    BOOLEAN NOT NULL DEFAULT false,
  helpful_count       INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id, user_id)
);
CREATE INDEX idx_reviews_tour_status_created ON reviews (tour_id, status, created_at DESC);

CREATE TABLE review_media (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id           UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  media_type          media_type NOT NULL,
  url                 TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE review_votes (
  review_id           UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_helpful          BOOLEAN NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (review_id, user_id)
);

-- =========================
-- NOTIFICATION / COMMUNICATION
-- =========================
CREATE TABLE notification_templates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key           TEXT NOT NULL,
  channel             notification_channel NOT NULL,
  language_code       VARCHAR(10) REFERENCES languages(code),
  subject             TEXT,
  body                TEXT NOT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_key, channel, language_code)
);

CREATE TABLE notifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
  channel             notification_channel NOT NULL,
  recipient           TEXT NOT NULL,
  event_key           TEXT NOT NULL,
  payload             JSONB NOT NULL DEFAULT '{}'::jsonb,
  status              TEXT NOT NULL DEFAULT 'queued',
  sent_at             TIMESTAMPTZ,
  failed_at           TIMESTAMPTZ,
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_status_created ON notifications (status, created_at);

-- =========================
-- BLOG / SEO CONTENT
-- =========================
CREATE TABLE blog_categories (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id           UUID REFERENCES blog_categories(id),
  slug                CITEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  description         TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE blog_tags (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                CITEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE blog_posts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  category_id         UUID REFERENCES blog_categories(id) ON DELETE SET NULL,
  slug                CITEXT NOT NULL UNIQUE,
  title               TEXT NOT NULL,
  excerpt             TEXT,
  content             TEXT NOT NULL,
  cover_image_url     TEXT,
  status              blog_post_status NOT NULL DEFAULT 'draft',
  is_featured         BOOLEAN NOT NULL DEFAULT false,
  seo_title           TEXT,
  seo_description     TEXT,
  seo_keywords        TEXT[],
  canonical_url       TEXT,
  noindex             BOOLEAN NOT NULL DEFAULT false,
  view_count          BIGINT NOT NULL DEFAULT 0,
  read_time_minutes   SMALLINT,
  published_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (view_count >= 0),
  CHECK (read_time_minutes IS NULL OR read_time_minutes > 0)
);
CREATE INDEX idx_blog_posts_status_published_at ON blog_posts (status, published_at DESC);
CREATE INDEX idx_blog_posts_category_status ON blog_posts (category_id, status);

CREATE TABLE blog_post_translations (
  post_id             UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  language_code       VARCHAR(10) NOT NULL REFERENCES languages(code),
  title               TEXT NOT NULL,
  excerpt             TEXT,
  content             TEXT NOT NULL,
  seo_title           TEXT,
  seo_description     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, language_code)
);

CREATE TABLE blog_post_tags (
  post_id             UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id              UUID NOT NULL REFERENCES blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE blog_post_related_tours (
  post_id             UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  tour_id             UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (post_id, tour_id)
);

-- =========================
-- WISHLIST / FAVORITES
-- =========================
CREATE TABLE user_favorite_tours (
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tour_id             UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tour_id)
);
CREATE INDEX idx_user_favorite_tours_tour_id ON user_favorite_tours (tour_id, created_at DESC);

-- =========================
-- MESSAGING / INBOX
-- =========================
CREATE TABLE conversations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                conversation_type NOT NULL,
  status              conversation_status NOT NULL DEFAULT 'open',
  subject             TEXT,
  created_by_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  supplier_id         UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  booking_id          UUID REFERENCES bookings(id) ON DELETE SET NULL,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_message_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_conversations_status_updated ON conversations (status, updated_at DESC);
CREATE INDEX idx_conversations_booking_id ON conversations (booking_id);

CREATE TABLE conversation_participants (
  conversation_id     UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_role    user_role,
  joined_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at        TIMESTAMPTZ,
  muted               BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX idx_conversation_participants_user_id
  ON conversation_participants (user_id, last_read_at);

CREATE TABLE messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  message_type        message_type NOT NULL DEFAULT 'text',
  body                TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at           TIMESTAMPTZ,
  deleted_at          TIMESTAMPTZ
);
CREATE INDEX idx_messages_conversation_created
  ON messages (conversation_id, created_at DESC);

CREATE TABLE message_attachments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id          UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_url            TEXT NOT NULL,
  file_name           TEXT,
  mime_type           TEXT,
  file_size_bytes     BIGINT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0)
);

-- =========================
-- CMS / SYSTEM CONFIG
-- =========================
CREATE TABLE cms_pages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                CITEXT NOT NULL UNIQUE,
  title               TEXT NOT NULL,
  content             TEXT NOT NULL,
  page_group          TEXT NOT NULL DEFAULT 'general',
  status              cms_page_status NOT NULL DEFAULT 'draft',
  seo_title           TEXT,
  seo_description     TEXT,
  noindex             BOOLEAN NOT NULL DEFAULT false,
  published_at        TIMESTAMPTZ,
  created_by          UUID REFERENCES users(id),
  updated_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cms_pages_status_published_at ON cms_pages (status, published_at DESC);

CREATE TABLE cms_page_translations (
  page_id             UUID NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,
  language_code       VARCHAR(10) NOT NULL REFERENCES languages(code),
  title               TEXT NOT NULL,
  content             TEXT NOT NULL,
  seo_title           TEXT,
  seo_description     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (page_id, language_code)
);

CREATE TABLE support_faq_categories (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                CITEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE support_faq_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id         UUID REFERENCES support_faq_categories(id) ON DELETE SET NULL,
  slug                CITEXT NOT NULL UNIQUE,
  question            TEXT NOT NULL,
  answer              TEXT NOT NULL,
  language_code       VARCHAR(10) REFERENCES languages(code),
  sort_order          INTEGER NOT NULL DEFAULT 0,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  view_count          BIGINT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (view_count >= 0)
);
CREATE INDEX idx_support_faq_items_category_active
  ON support_faq_items (category_id, is_active, sort_order);

CREATE TABLE system_settings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key         TEXT NOT NULL UNIQUE,
  setting_value       JSONB NOT NULL DEFAULT '{}'::jsonb,
  value_type          TEXT NOT NULL DEFAULT 'json',
  is_public           BOOLEAN NOT NULL DEFAULT false,
  description         TEXT,
  updated_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (value_type IN ('json', 'string', 'number', 'boolean'))
);

ALTER TABLE countries
  ADD CONSTRAINT fk_countries_currency
  FOREIGN KEY (currency_code) REFERENCES currencies(code);

-- =========================
-- PLATFORM / OPS
-- =========================
CREATE TABLE idempotency_keys (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key                 TEXT NOT NULL UNIQUE,
  scope               TEXT NOT NULL,
  request_hash        TEXT NOT NULL,
  response_code       INTEGER,
  response_body       JSONB,
  expires_at          TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_idempotency_scope_key ON idempotency_keys (scope, key);

CREATE TABLE outbox_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type      TEXT NOT NULL,
  aggregate_id        UUID NOT NULL,
  event_type          TEXT NOT NULL,
  payload             JSONB NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending',
  retry_count         INTEGER NOT NULL DEFAULT 0,
  available_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at        TIMESTAMPTZ
);
CREATE INDEX idx_outbox_pending ON outbox_events (status, available_at);

CREATE TABLE api_keys (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type          TEXT NOT NULL,
  owner_id            UUID NOT NULL,
  key_prefix          TEXT NOT NULL,
  key_hash            TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  scopes              TEXT[] NOT NULL DEFAULT '{}',
  is_active           BOOLEAN NOT NULL DEFAULT true,
  last_used_at        TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id       UUID REFERENCES users(id),
  actor_role          user_role,
  action              TEXT NOT NULL,
  entity_type         TEXT NOT NULL,
  entity_id           UUID,
  changes             JSONB,
  ip_address          INET,
  user_agent          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_user_id, created_at DESC);

-- Optional: materialized search projection for simple scale phase
CREATE MATERIALIZED VIEW tour_search_projection AS
SELECT
  t.id AS tour_id,
  t.slug,
  t.title,
  t.status,
  t.city_id,
  c.name AS city_name,
  t.rating_avg,
  t.rating_count,
  COALESCE(MIN(opr.amount) FILTER (WHERE opr.component_type = 'base'), 0) AS min_price,
  MIN(opr.currency_code) FILTER (WHERE opr.component_type = 'base') AS currency_code,
  t.updated_at
FROM tours t
JOIN cities c ON c.id = t.city_id
LEFT JOIN tour_options o ON o.tour_id = t.id AND o.is_active = true
LEFT JOIN option_pricing_rules opr ON opr.tour_option_id = o.id
GROUP BY t.id, c.name;

CREATE INDEX idx_tour_search_projection_city_status
  ON tour_search_projection (city_id, status, min_price);

COMMIT;
