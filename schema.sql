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
  source TEXT,
  page TEXT,
  form_id TEXT,
  consent INTEGER NOT NULL DEFAULT 0,
  ip_hash TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notified_at TEXT,
  subscribed_at TEXT
);

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

CREATE TABLE IF NOT EXISTS forms_submissions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'waiting_user', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  name TEXT,
  email TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  source_url TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  assigned_to TEXT,
  internal_notes TEXT,
  public_tracking_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS forms_replies (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  admin_user TEXT,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  FOREIGN KEY (submission_id) REFERENCES forms_submissions(id)
);

CREATE INDEX IF NOT EXISTS leads_type_idx ON leads (type);
CREATE INDEX IF NOT EXISTS leads_email_idx ON leads (email);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (status);
CREATE INDEX IF NOT EXISTS leads_created_idx ON leads (created_at);
CREATE INDEX IF NOT EXISTS newsletter_subscribers_email_idx ON newsletter_subscribers (email);
CREATE INDEX IF NOT EXISTS newsletter_subscribers_status_idx ON newsletter_subscribers (status);
CREATE INDEX IF NOT EXISTS newsletter_subscribers_token_idx ON newsletter_subscribers (unsubscribe_token_hash);
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
CREATE INDEX IF NOT EXISTS forms_submissions_created_idx ON forms_submissions (created_at);
CREATE INDEX IF NOT EXISTS forms_submissions_status_idx ON forms_submissions (status);
CREATE INDEX IF NOT EXISTS forms_submissions_type_idx ON forms_submissions (type);
CREATE INDEX IF NOT EXISTS forms_submissions_priority_idx ON forms_submissions (priority);
CREATE INDEX IF NOT EXISTS forms_submissions_email_idx ON forms_submissions (email);
CREATE UNIQUE INDEX IF NOT EXISTS forms_submissions_tracking_idx ON forms_submissions (public_tracking_id);
CREATE INDEX IF NOT EXISTS forms_replies_submission_idx ON forms_replies (submission_id);
CREATE INDEX IF NOT EXISTS forms_replies_created_idx ON forms_replies (created_at);
