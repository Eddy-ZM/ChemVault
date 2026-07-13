# Architecture

ChemVault is the public knowledge/search/product-navigation site and the suite authority for public form intake, lead/newsletter records, private form administration, and related notification email. Static pages and generated public-record JSON are served by Cloudflare Pages; Pages Functions use D1 and server-only provider credentials. Form submissions use a D1-backed unique idempotency key so safe client retries return the original private ticket instead of creating another record.

Public chemistry records are intentionally public. Form bodies, reply emails, leads, admin audit, and replies are private. Administrator identity is resolved through User Center/Access and explicit allowlists; development headers and legacy tokens are not production authority.

Known risks: public content must never include internal paths/private material; commercial plan UI is not entitlement; generated indexes must be reproducible; retention/email failures must stay visible.

There is no embedded AI. Form retention is in `cron.md`, notification mail in `emails.md`, and public indexing in `seo.md`.

## Related documents

- [Flows](flows.md) · [Permissions](permissions.md) · [Variables](variables.md) · [Tests](tests.md)
- [Retention](cron.md) · [Email](emails.md) · [SEO/public data](seo.md)
