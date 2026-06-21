# ChemVault Native v1 Design

## Objective

Create a native, read-focused ChemVault application in the existing multiplatform SwiftUI Xcode project. The app will replace the website's primary discovery flow with native screens while consuming the public ChemVault API over the network.

## Product scope

Native v1 covers four destinations:

- **Library**: searchable API-backed chemistry records, type filtering, paginated loading, and native record detail.
- **Explore**: type-led browsing for reagents, materials, methods, mechanisms, dossiers, and sources.
- **Workspace**: a read-only research launch surface with continuation cards and links into scoped Library searches. It does not include a notebook, editor, or account state in v1.
- **Saved**: device-local record bookmarks, available without an account.

The existing website's specialist pages and editing workflows are intentionally outside native v1. They remain available through their external source links rather than an embedded WebView.

## Navigation and adaptive layout

On compact devices, the root is a `TabView` with Library, Explore, Workspace, and Saved tabs. Each tab owns a `NavigationStack`.

On regular-width iPad, macOS, and visionOS, the same destinations appear in a `NavigationSplitView` sidebar. Library results occupy the content column and a selected record opens in the detail column where the platform supports it.

The visual system uses ChemVault blue, quiet slate metadata, rounded material cards, compact scientific typography, and clear online/offline status. It follows platform controls instead of recreating the website's navigation, footer, or browser chrome.

## Data and state

`ChemVaultAPI` is a `URLSession` client with a configurable base URL. Its production default is `https://chemvault.pages.dev/api`, with an app configuration override for development or future domains.

The client models and calls these endpoints:

- `GET /health` for visible service status.
- `GET /records?q=&type=&limit=&offset=` for Library search and pagination.
- `GET /records/:type/:id` for record detail.
- `GET /facets` for Explore categories and filtering metadata.

A `LibraryStore` owns query text, selected type, records, pagination state, loading state, and human-readable API errors. Search is debounced and cancels an obsolete request before starting the next one. A refresh action reloads the active query.

`SavedStore` writes a stable `type:id` bookmark key to local `UserDefaults`. Its protocol boundary exposes `contains`, `toggle`, and `allKeys`, so a later authenticated cloud implementation can replace the store without changing Library or detail UI.

Recent successfully loaded Library records remain visible for the active app session when a refresh fails. The interface labels the condition as unavailable and offers retry; it does not silently embed the website or claim the result is newly synchronized.

## Native screens

### Library

The default screen shows API health, a native searchable field, type chips, and record cards. Cards expose type, title, formula where available, short context, tags, and a bookmark affordance. Selecting a card opens a detail screen.

### Record detail

The detail screen shows a record header, type/domain metadata, summary, tags, safety and evidence data when present, and an external source link. Bookmarking is available from the toolbar. Missing optional API fields are omitted rather than replaced with placeholder claims.

### Explore

Explore reads API facets and presents the available record types as a native grid or list. Selecting a category opens Library with its corresponding type filter.

### Workspace

Workspace is a lightweight native start surface. It provides research prompts and source-backed entry actions such as carbonyl reduction, materials characterization, and claim audit. Each action opens a matching Library query. There is no mutable project model in v1.

### Saved

Saved fetches bookmark details from the API on appearance and supports removal locally. If a remote record is unavailable, its bookmark remains and is marked unavailable rather than deleted automatically.

## Error handling and accessibility

All network states have an explicit loading, empty, retry, or unavailable UI. API decoding and HTTP failures are converted to short user-facing messages while retaining technical diagnostics for development logs. The app uses Dynamic Type-compatible text, semantic labels for bookmark and retry controls, sufficient color contrast, and accessible section headings.

## Verification

- Unit-test API request construction, decoding, HTTP error mapping, search pagination, and local bookmark persistence with a mocked URL protocol.
- UI-test the root navigation, a Library query, bookmark toggling, and an API-unavailable retry state.
- Build and run the shared SwiftUI target on an iPhone simulator and a regular-width simulator or Mac target.
- Verify compact and regular layouts visually, including light and dark system appearances.

## Deferred work

- User accounts and cloud-synchronized saved records.
- Offline full-record database and full-text search.
- Native migration of every specialist website workflow.
- Native research notebook or collaborative workspace editing.
