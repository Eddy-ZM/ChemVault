CREATE INDEX IF NOT EXISTS usage_records_user_period_idx
ON usage_records (user_id, feature_key, period_start);
