ALTER TABLE subscriptions ADD COLUMN price_id TEXT;
ALTER TABLE subscriptions ADD COLUMN billing_interval TEXT;
ALTER TABLE subscriptions ADD COLUMN cancel_at_period_end INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN livemode INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN last_event_id TEXT;
ALTER TABLE subscriptions ADD COLUMN last_event_created INTEGER;

CREATE TABLE IF NOT EXISTS billing_checkout_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  plan TEXT NOT NULL,
  billing_interval TEXT NOT NULL,
  price_id TEXT NOT NULL,
  seat_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'created',
  livemode INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS billing_webhook_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  livemode INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TEXT
);

CREATE INDEX IF NOT EXISTS subscriptions_user_status_idx ON subscriptions (user_id, status);
CREATE INDEX IF NOT EXISTS subscriptions_customer_idx ON subscriptions (provider_customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_provider_id_idx ON subscriptions (provider_subscription_id) WHERE provider_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS billing_checkout_user_idx ON billing_checkout_sessions (user_id, created_at);
CREATE INDEX IF NOT EXISTS billing_webhook_processed_idx ON billing_webhook_events (processed_at);
