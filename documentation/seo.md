# SEO And Public Data

| Route/data | Indexable | Public-data rule |
| --- | --- | --- |
| Public home/search/record/product pages | Yes | Generated record projection and repository copy only |
| `data/public-record-index.json` | Yes/API-readable | Explicit allowlisted fields; deterministic `generatedAt` |
| Admin, ticket, API mutation and private form data | No | Never place in sitemap, static output, metadata, or previews |

Sitemap and metadata are build-generated. Dynamic values are escaped. Bot and human requests use the same public classification; no bot route receives privileged data.
