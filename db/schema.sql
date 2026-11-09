-- Restaurant ordering app schema (PostgreSQL / Neon)
-- Money is stored as integer cents (USD).

CREATE TABLE IF NOT EXISTS settings (
  id                  integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  restaurant_name     text    NOT NULL DEFAULT 'Saltbox Kitchen',
  tagline             text    NOT NULL DEFAULT 'Scratch-made American comfort food',
  phone               text    NOT NULL DEFAULT '(555) 012-3456',
  email               text    NOT NULL DEFAULT 'hello@example.com',
  address             text    NOT NULL DEFAULT '123 Main Street, Austin, TX 78701',
  is_open             boolean NOT NULL DEFAULT true,
  pickup_enabled      boolean NOT NULL DEFAULT true,
  delivery_enabled    boolean NOT NULL DEFAULT true,
  tax_rate_bps        integer NOT NULL DEFAULT 825,   -- 8.25%
  delivery_fee_cents  integer NOT NULL DEFAULT 399,
  min_order_cents     integer NOT NULL DEFAULT 1000,
  prep_time_minutes   integer NOT NULL DEFAULT 20,
  updated_at          timestamptz NOT NULL DEFAULT now()
);
INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS admin_users (
  id             serial PRIMARY KEY,
  email          text NOT NULL UNIQUE,
  name           text NOT NULL,
  password_hash  text NOT NULL,
  role           text NOT NULL DEFAULT 'staff' CHECK (role IN ('owner','staff')),
  is_active      boolean NOT NULL DEFAULT true,
  last_login_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id          serial PRIMARY KEY,
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id                    serial PRIMARY KEY,
  category_id           integer REFERENCES categories(id) ON DELETE SET NULL,
  name                  text NOT NULL,
  description           text NOT NULL DEFAULT '',
  image_url             text,
  price_cents           integer NOT NULL CHECK (price_cents >= 0),
  discount_price_cents  integer CHECK (discount_price_cents IS NULL OR discount_price_cents >= 0),
  track_stock           boolean NOT NULL DEFAULT true,
  stock_quantity        integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold   integer NOT NULL DEFAULT 5,
  is_available          boolean NOT NULL DEFAULT true,
  is_featured           boolean NOT NULL DEFAULT false,
  tags                  text[] NOT NULL DEFAULT '{}',
  calories              integer,
  sort_order            integer NOT NULL DEFAULT 0,
  deleted_at            timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS menu_items_category_idx ON menu_items(category_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS orders (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number              text NOT NULL UNIQUE,
  status                    text NOT NULL DEFAULT 'pending_payment'
                            CHECK (status IN ('pending_payment','new','preparing','ready','out_for_delivery','completed','cancelled')),
  payment_status            text NOT NULL DEFAULT 'unpaid'
                            CHECK (payment_status IN ('unpaid','paid','refunded','partially_refunded','failed','expired')),
  fulfillment_type          text NOT NULL CHECK (fulfillment_type IN ('pickup','delivery')),
  customer_name             text NOT NULL,
  customer_email            text NOT NULL,
  customer_phone            text NOT NULL,
  address_line1             text,
  address_line2             text,
  city                      text,
  state                     text,
  zip                       text,
  notes                     text,
  subtotal_cents            integer NOT NULL,
  savings_cents             integer NOT NULL DEFAULT 0,
  tax_cents                 integer NOT NULL DEFAULT 0,
  delivery_fee_cents        integer NOT NULL DEFAULT 0,
  tip_cents                 integer NOT NULL DEFAULT 0,
  total_cents               integer NOT NULL,
  refunded_cents            integer NOT NULL DEFAULT 0,
  stripe_session_id         text UNIQUE,
  stripe_payment_intent_id  text,
  stock_released            boolean NOT NULL DEFAULT false,
  paid_at                   timestamptz,
  completed_at              timestamptz,
  cancelled_at              timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders(created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id                    serial PRIMARY KEY,
  order_id              uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id          integer REFERENCES menu_items(id) ON DELETE SET NULL,
  name                  text NOT NULL,
  unit_price_cents      integer NOT NULL,
  original_price_cents  integer NOT NULL,
  quantity              integer NOT NULL CHECK (quantity > 0),
  line_total_cents      integer NOT NULL
);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);

CREATE TABLE IF NOT EXISTS payments (
  id                        serial PRIMARY KEY,
  order_id                  uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  stripe_payment_intent_id  text UNIQUE,
  stripe_charge_id          text,
  amount_cents              integer NOT NULL,
  refunded_cents            integer NOT NULL DEFAULT 0,
  status                    text NOT NULL,
  card_brand                text,
  card_last4                text,
  receipt_url               text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_events (
  id          serial PRIMARY KEY,
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type        text NOT NULL,
  message     text NOT NULL,
  actor       text NOT NULL DEFAULT 'system',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_events_order_idx ON order_events(order_id, created_at);

CREATE TABLE IF NOT EXISTS inventory_logs (
  id            serial PRIMARY KEY,
  menu_item_id  integer NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  change        integer NOT NULL,
  stock_after   integer NOT NULL,
  reason        text NOT NULL CHECK (reason IN ('order','order_released','restock','adjustment','initial')),
  order_id      uuid REFERENCES orders(id) ON DELETE SET NULL,
  note          text,
  actor         text NOT NULL DEFAULT 'system',
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_logs_item_idx ON inventory_logs(menu_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_logs_created_idx ON inventory_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS stripe_events (
  id          text PRIMARY KEY,
  type        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
