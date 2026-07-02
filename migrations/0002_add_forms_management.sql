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

CREATE INDEX IF NOT EXISTS forms_submissions_created_idx ON forms_submissions (created_at);
CREATE INDEX IF NOT EXISTS forms_submissions_status_idx ON forms_submissions (status);
CREATE INDEX IF NOT EXISTS forms_submissions_type_idx ON forms_submissions (type);
CREATE INDEX IF NOT EXISTS forms_submissions_priority_idx ON forms_submissions (priority);
CREATE INDEX IF NOT EXISTS forms_submissions_email_idx ON forms_submissions (email);
CREATE UNIQUE INDEX IF NOT EXISTS forms_submissions_tracking_idx ON forms_submissions (public_tracking_id);
CREATE INDEX IF NOT EXISTS forms_replies_submission_idx ON forms_replies (submission_id);
CREATE INDEX IF NOT EXISTS forms_replies_created_idx ON forms_replies (created_at);
