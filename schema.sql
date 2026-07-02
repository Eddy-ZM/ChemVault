CREATE TABLE IF NOT EXISTS records (
  record_key TEXT PRIMARY KEY,
  id TEXT NOT NULL,
  type TEXT NOT NULL,
  type_label TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  body TEXT,
  domain TEXT,
  family TEXT,
  risk TEXT,
  maturity INTEGER DEFAULT 0,
  formula TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  href TEXT,
  source_href TEXT,
  image_url TEXT,
  raw_json TEXT NOT NULL DEFAULT '{}',
  search_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS records_type_id_idx ON records (type, id);
CREATE INDEX IF NOT EXISTS records_type_idx ON records (type);
CREATE INDEX IF NOT EXISTS records_title_idx ON records (title);
CREATE INDEX IF NOT EXISTS records_search_idx ON records (search_text);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  organization TEXT,
  role TEXT,
  team_size TEXT,
  interests_json TEXT NOT NULL DEFAULT '[]',
  message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  owner_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  organization_id TEXT,
  provider TEXT,
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_end TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feature_entitlements (
  id TEXT PRIMARY KEY,
  plan TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  usage_limit INTEGER,
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS usage_records (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  organization_id TEXT,
  feature_key TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 1,
  period_start TEXT,
  period_end TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  module TEXT NOT NULL,
  type TEXT NOT NULL,
  access_level TEXT NOT NULL DEFAULT 'free',
  preview TEXT,
  content_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  email TEXT NOT NULL,
  requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'processing', 'completed', 'rejected')),
  reason_optional TEXT,
  admin_notes TEXT,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS data_export_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  email TEXT NOT NULL,
  requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'processing', 'completed', 'rejected')),
  export_scope TEXT NOT NULL DEFAULT 'account',
  admin_notes TEXT,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  actor_email TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS leads_type_idx ON leads (type);
CREATE INDEX IF NOT EXISTS leads_email_idx ON leads (email);
CREATE INDEX IF NOT EXISTS organizations_plan_idx ON organizations (plan);
CREATE INDEX IF NOT EXISTS memberships_user_idx ON memberships (user_id);
CREATE INDEX IF NOT EXISTS subscriptions_plan_idx ON subscriptions (plan);
CREATE INDEX IF NOT EXISTS feature_entitlements_plan_idx ON feature_entitlements (plan);
CREATE INDEX IF NOT EXISTS usage_records_feature_idx ON usage_records (feature_key);
CREATE UNIQUE INDEX IF NOT EXISTS resources_slug_idx ON resources (slug);
CREATE INDEX IF NOT EXISTS account_deletion_requests_email_idx ON account_deletion_requests (email);
CREATE INDEX IF NOT EXISTS account_deletion_requests_status_idx ON account_deletion_requests (status);
CREATE INDEX IF NOT EXISTS data_export_requests_email_idx ON data_export_requests (email);
CREATE INDEX IF NOT EXISTS data_export_requests_status_idx ON data_export_requests (status);
CREATE INDEX IF NOT EXISTS admin_audit_logs_action_idx ON admin_audit_logs (action);
CREATE INDEX IF NOT EXISTS admin_audit_logs_target_idx ON admin_audit_logs (target_type, target_id);
