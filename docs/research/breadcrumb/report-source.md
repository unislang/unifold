# Breadcrumb OSS evaluation

Audience: Unifold catalog, accessibility, semantics, elements, export, and performance maintainers  
Date: 2026-08-26  
Decision: use native HTML behavior for the bounded baseline; retain Spectrum Web Components as a
behavior and test reference; do not add a runtime Breadcrumb dependency.

## Scope and assumptions

This evaluation covers the Phase 2 `Breadcrumb` component only. It compares the current HTML and
ARIA guidance with the current public Lion and Spectrum Web Components inventories. It assumes
Unifold continues to own its JSON contract, canonical event envelope, Schema.org graph, Tailwind
token surface, package boundary, and static fallback. Responsive overflow menus are excluded from
the baseline because they introduce a separate MenuButton interaction and focus contract.

## Evidence-backed decision

The [WAI-ARIA Authoring Practices Breadcrumb pattern](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/)
defines Breadcrumb as a labelled navigation landmark containing hierarchical parent links. It adds
no custom keyboard interaction and requires `aria-current="page"` when the current location is a
link. The [WCAG G65 technique](https://www.w3.org/WAI/WCAG21/Techniques/general/G65) recommends a
list inside the labelled navigation region and permits the current location to be either non-link
text or a link marked as current. Native `nav`, `ol`, `li`, and `a` therefore provide the complete
baseline interaction model without an adapter.

The HTML Standard has no dedicated Breadcrumb element and recommends ordinary links in a `nav`
region in its [Breadcrumb navigation idiom](https://html.spec.whatwg.org/dev/semantics-other.html#breadcrumb-navigation).
Unifold will use an ordered list because hierarchy order is meaningful and because it aligns with
WAI G65 and structured-data positions.

The current [Lion component inventory](https://lion.js.org/components/) contains no Breadcrumb.
Lion remains a useful white-label Web Component foundation elsewhere, but there is no component to
adapt for this slice.

[Spectrum Web Components Breadcrumbs 1.12.2](https://opensource.adobe.com/spectrum-web-components/components/breadcrumbs/)
implements the expected navigation/list/current-page semantics and adds compact and responsive
overflow behavior. Its current package documentation also lists action-menu, menu, icon, icon-set,
link, base, and shared dependencies. Those dependencies solve overflow-menu behavior that is out of
scope for the bounded baseline and would not replace Unifold's event, state, semantic, or theming
contracts. Spectrum remains the reference for future overflow work rather than a runtime dependency.

Schema.org 30.0 defines
[`BreadcrumbList`](https://schema.org/BreadcrumbList) as an ordered chain of linked pages, typically
ending with the current page. It requires positional `ListItem` data because DOM order alone is not
sufficient to express structured-data order. Unifold will extend its existing Schema.org registry
with `BreadcrumbList` and `ListItem`; authored semantic graphs remain the source of truth, and the
component catalog will expose an ordered-collection attachment point without fabricating JSON-LD.

## Resulting contract

- One required accessible landmark label.
- One to 32 ordered items with unique stable IDs and non-empty labels.
- Every ancestor item has a safe URL; the final current item may omit its URL or remain a link.
- The final item is marked `aria-current="page"`; separators are presentation-only.
- Link activation preserves native navigation and emits one canonical component activation intent
  carrying the declared item ID and safe URL.
- Invalid item structure, duplicate IDs, unsafe URLs, and missing ancestor URLs reject before render.
- The baseline wraps rather than hiding hierarchy. A future overflow mode must reuse the existing
  MenuButton behavior and independently prove focus, disclosure, resize, localization, and bundle
  cost.

## Limitations and follow-up

Automated axe checks do not replace screen-reader, forced-colors, zoom, or localization review. The
baseline intentionally does not infer a Schema.org graph from visible items. Production rich-result
eligibility remains a content-owner responsibility and should be checked with external validators.

## Claim-to-source ledger

- “Breadcrumb Pattern,” W3C WAI-ARIA Authoring Practices Guide, accessed 2026-08-26:
  https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/
- “G65: Providing a breadcrumb trail,” W3C Accessibility Guidelines Working Group, updated
  2026-01-12, accessed 2026-08-26: https://www.w3.org/WAI/WCAG21/Techniques/general/G65
- “Breadcrumb navigation,” WHATWG HTML Living Standard, updated 2026-08-26, accessed 2026-08-26:
  https://html.spec.whatwg.org/dev/semantics-other.html#breadcrumb-navigation
- “Components,” Lion, accessed 2026-08-26: https://lion.js.org/components/
- “sp-breadcrumbs,” Spectrum Web Components 1.12.2, Adobe, accessed 2026-08-26:
  https://opensource.adobe.com/spectrum-web-components/components/breadcrumbs/
- “BreadcrumbList,” Schema.org 30.0, released 2026-03-19, accessed 2026-08-26:
  https://schema.org/BreadcrumbList
