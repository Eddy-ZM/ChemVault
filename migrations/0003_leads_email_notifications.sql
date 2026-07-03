ALTER TABLE leads ADD COLUMN source TEXT;
ALTER TABLE leads ADD COLUMN page TEXT;
ALTER TABLE leads ADD COLUMN form_id TEXT;
ALTER TABLE leads ADD COLUMN consent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE leads ADD COLUMN ip_hash TEXT;
ALTER TABLE leads ADD COLUMN user_agent TEXT;
ALTER TABLE leads ADD COLUMN status TEXT NOT NULL DEFAULT 'new';
ALTER TABLE leads ADD COLUMN last_error TEXT;
ALTER TABLE leads ADD COLUMN updated_at TEXT;
ALTER TABLE leads ADD COLUMN notified_at TEXT;
ALTER TABLE leads ADD COLUMN subscribed_at TEXT;

UPDATE leads
SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP),
    status = COALESCE(status, 'new');

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source TEXT,
  consent INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  unsubscribe_token_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at TEXT,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (status);
CREATE INDEX IF NOT EXISTS leads_created_idx ON leads (created_at);
CREATE INDEX IF NOT EXISTS newsletter_subscribers_email_idx ON newsletter_subscribers (email);
CREATE INDEX IF NOT EXISTS newsletter_subscribers_status_idx ON newsletter_subscribers (status);
CREATE INDEX IF NOT EXISTS newsletter_subscribers_token_idx ON newsletter_subscribers (unsubscribe_token_hash);
