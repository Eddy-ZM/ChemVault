# Scheduled Work

| Job | Schedule | Credential/limits | Idempotency/evidence |
| --- | --- | --- | --- |
| Forms retention purge | Weekly | Dedicated Forms-retention secret; bounded policy-driven deletion | Re-running finds no already-deleted rows; counts/errors in GitHub Actions history |

Missing credentials fail the workflow. The job deletes only records/attachments whose approved retention deadline has passed; it does not infer a new legal policy.
