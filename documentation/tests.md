# Verification Map

## Existing coverage

| Use case | Rule/negative case | Evidence/status |
| --- | --- | --- |
| Public record contract | Stable public-only schema; English/Chinese copies align | contract tests; CI required |
| Forms/leads/admin | Validation, ticket/admin scope, retention, email state, and duplicate `Idempotency-Key` reuse without a second D1 row | Node tests, including `tests/forms-api.test.mjs`; CI required |
| Reproducible build | Public index uses input commit or `SOURCE_DATE_EPOCH` | build twice plus clean-worktree check proposed below |
| Static/public build | Links, sitemap, record pages and generated output | `npm test`, `npm run build` |

## Proposed tests

- Automated: build twice and require identical `public-record-index.json` plus `git diff --exit-code`.
- Guarded live: submit → ticket lookup → admin reply → retention expiry canary.
- Guarded live: Resend/provider confirmation and admin notice without logging form body.

## Gaps

- Provider delivery, Cloudflare bindings, and scheduled notifications require deployed evidence.
- Local idempotency tests use a D1 mock; concurrent replay against the deployed D1 binding remains a guarded canary.
- Legal/privacy wording and retention durations require compliance-owner approval.
