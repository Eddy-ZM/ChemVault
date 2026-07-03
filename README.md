# ChemVault

ChemVault is a chemistry knowledge and research workflow product. The project currently includes a public website and a native Apple app for iOS, iPadOS and macOS.

Current version: `v0.2.4`.

## License

This repository is source-available but not open source. Public visibility is for review and reference only. No rights are granted to use, copy, modify, distribute, host, deploy or create derivative works without prior written permission from Ziwen Mu or the repository owner.

See [LICENSE](./LICENSE). All rights reserved.

## Website

The ChemVault website presents chemistry records, research context and project information through a public web interface.

### Commercial MVP Foundation

The website now includes the first commercial platform layer for turning ChemVault into a unified professional research workbench.

- Unified product navigation and app switcher.
- Pricing page for Free, Pro, Team/Lab and Enterprise/Institution plans.
- Shared product module config and feature entitlement helpers.
- Reusable premium gates, upgrade CTA components, plan badges, pricing cards and comparison tables.
- Dashboard/workbench commercial entry page with safe empty states and quota placeholders.
- D1-backed newsletter, AI Paper Search beta and Enterprise lead collection forms with Resend notifications, user confirmations, unsubscribe-token support and protected admin review.
- Payment provider placeholder routes for future Stripe or equivalent checkout integration.

Commercial implementation details are documented in [docs/commercial-mvp.md](./docs/commercial-mvp.md). Deployment and staging safety checks are documented in [docs/deployment-checklist.md](./docs/deployment-checklist.md).

### Chemistry Search

- Search across compounds, reagents, reactions, mechanisms, materials, methods, dossiers and source records.
- Filter and browse records by type, domain and topic.
- Open record pages with structured summaries, linked context and research-oriented metadata.
- Use public record pages for reference, discovery and navigation across the ChemVault knowledge base.

### Chemistry Workspaces

- Compound and Academic Search: unified entry point for chemistry and academic record lookup.
- Reagent Database: reagent records with scope, conditions, limitations and handling context.
- Materials Atlas: materials-oriented records and related scientific context.
- Spectroscopy Workbench: spectroscopy evidence pages for analytical review.
- Mechanism Atlas: linked reaction-mechanism records and mechanism-oriented navigation.
- Methods and Reproducibility: method records, workflow notes and reproducibility context.
- Research Workbench: workspace-style access to research records and scientific tasks.
- Academic Library: terminology, source references and academic context used across ChemVault.
- Research Dossiers: grouped research dossiers and topic-focused summaries.
- Public Data: public-facing access point for ChemVault record index information.

### Project Information

- Research Directions: overview of ChemVault research areas and priorities.
- Platform Capabilities: summary of major platform functions and user-facing capabilities.
- ChemVault Ecosystem: project-level view of related ChemVault products and initiatives.
- Publications and Notes: public notes, logs and written updates.
- Team: executive profiles, advisors, operations and product contributors.
- Contact: collaboration and inquiry entry point.
- Sitemap: structured navigation across public website pages.

## Apple App

The ChemVault Apple app is a native compound-search experience for iOS, iPadOS and macOS. It provides fast chemical lookup as the primary workflow, with compact supporting tools around it.

### Native Workspace

- Home: compact overview of compound search and supporting ChemVault tools.
- Compound Search: search compounds by name, synonym, formula, identifier or SMILES, then review formula, domain, type, summary, tags and record links.
- Built-in Compound Index: reliable local search results when live API enrichment is unavailable.
- Scientific File Storage: organization area for research files, instrument outputs and project materials.
- Documentation: access to ChemVault documentation, workflow notes and reference materials.
- AI Scientific Data Extraction: workspace for preparing papers, PDFs and instrument files for structured scientific extraction.
- ChemVault Mail: project communication and research correspondence area.
- Account and Permissions: account state, module access and permission visibility.
- Notifications: status center for extraction jobs, deployments and file-processing events.
- Settings: language, region detection, appearance and connection preferences.

### Platform Coverage

- iPhone: compact tab-based workspace.
- iPad: larger-screen workspace layout.
- macOS: desktop-oriented navigation and workspace presentation.
- Language support: English and Simplified Chinese, with automatic region-based selection and manual switching.

## Product Scope

ChemVault is intended for chemistry knowledge access, research organization and scientific workflow support. Website and app features are presented as product capabilities and public project information. This README intentionally focuses on the user-facing website and app experience, not implementation details.

## Local Development

```bash
npm run build
npm run dev
```

The repository does not currently define an `npm test` script. Existing Node tests can be run manually:

```bash
node --test tests/*.test.mjs
```

## Commercial MVP Limitations

- Browser-side plan preview is for local MVP testing only.
- Server-side entitlement checks default to Free until real authentication and subscription state are connected.
- Checkout and billing portal routes are placeholders.
- Production mode disables mock billing and `DEFAULT_USER_PLAN` entitlement elevation.
- AI Paper Search, Molecular Modeling, Mail automation and Team workspace collaboration expose safe UI placeholders only where backends are not yet connected.
