<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Segna website. PostHog was already initialized (`posthog-js` installed, `PostHogProvider` wrapping the app) — the wizard extended this foundation with targeted event tracking across the catalog browsing experience and the help center, and set up environment variables for the PostHog key and host.

**New files created:**
- `src/components/analytics/CatalogItemViewTracker.tsx` — client component that fires `catalog_item_detail_viewed` when a catalog item detail page loads
- `src/components/help/HelpSearchResultLink.tsx` — client component that captures `help_search_result_clicked` when a help search result is clicked

**Files edited:**
- `src/components/home/HomeCatalogQuickSearch.tsx` — search submitted + suggestion clicked events
- `src/components/page-sections/WebsiteCatalogBrowse.tsx` — item clicks, filter changes, sort changes (desktop + mobile)
- `src/components/page-sections/CatalogBrandSearchRail.tsx` — brand filter click event
- `src/components/page-sections/FaqAccordion.tsx` — converted to client component, FAQ item opened event
- `src/components/help/HelpHeader.tsx` — converted to client component, help search submitted event
- `src/app/(marketing)/catalogue/piece/[itemId]/page.tsx` — uses `CatalogItemViewTracker`
- `src/app/aide/recherche/page.tsx` — uses `HelpSearchResultLink`
- `.env.local` — `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` set

## Events instrumented

| Event | Description | File |
|---|---|---|
| `catalog_quick_search_submitted` | User submits the home catalog quick search (button click or Enter) | `src/components/home/HomeCatalogQuickSearch.tsx` |
| `catalog_quick_search_suggestion_clicked` | User clicks a brand or category suggestion from the quick search dropdown | `src/components/home/HomeCatalogQuickSearch.tsx` |
| `catalog_item_clicked` | User clicks a catalog item card in the browse grid | `src/components/page-sections/WebsiteCatalogBrowse.tsx` |
| `catalog_filter_applied` | User applies a filter (category, brand, color, size) in the catalog browse | `src/components/page-sections/WebsiteCatalogBrowse.tsx` |
| `catalog_sort_changed` | User changes the sort mode (recent, price_asc, price_desc) | `src/components/page-sections/WebsiteCatalogBrowse.tsx` |
| `catalog_brand_filter_clicked` | User clicks a brand link in the brand filter rail | `src/components/page-sections/CatalogBrandSearchRail.tsx` |
| `catalog_item_detail_viewed` | User views a catalog item detail page — top of conversion funnel | `src/app/(marketing)/catalogue/piece/[itemId]/page.tsx` |
| `help_search_submitted` | User submits a search query in the help center | `src/components/help/HelpHeader.tsx` |
| `help_search_result_clicked` | User clicks a search result article link on the help results page | `src/app/aide/recherche/page.tsx` |
| `faq_item_opened` | User opens a FAQ accordion item to reveal the answer | `src/components/page-sections/FaqAccordion.tsx` |

## Next steps

We've built a dashboard and five insights to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard** — [Analytics basics](https://eu.posthog.com/project/172984/dashboard/662287)
- **Insight 1** — [Catalog search → item view funnel](https://eu.posthog.com/project/172984/insights/aAccZURD) — conversion funnel from search to item detail viewed
- **Insight 2** — [Catalog item clicks (daily)](https://eu.posthog.com/project/172984/insights/eUwdQogv) — daily trend of catalog browsing engagement
- **Insight 3** — [Top catalog filter types applied](https://eu.posthog.com/project/172984/insights/HrUrNVxd) — breakdown of category / brand / color / size filter usage
- **Insight 4** — [Help center search submissions](https://eu.posthog.com/project/172984/insights/cF5kIaC3) — daily trend of help searches vs result clicks
- **Insight 5** — [FAQ engagement](https://eu.posthog.com/project/172984/insights/xxq2FoY0) — daily count of FAQ items opened

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
