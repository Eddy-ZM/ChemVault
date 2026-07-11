ALTER TABLE forms_submissions ADD COLUMN closed_at TEXT;
CREATE INDEX IF NOT EXISTS forms_submissions_closed_idx ON forms_submissions (closed_at);
