# Dialog OSS evaluation

Audience: Unifold catalog, accessibility, elements, export, and performance maintainers  
Date: 2026-08-26  
Decision: use the native `dialog` top-layer foundation with a bounded compatibility adapter; retain
Lion and Spectrum Web Components as behavior and regression references; do not add either to a
runtime package.

## Scope and assumptions

This evaluation covers the bounded modal `Dialog` family. It compares an equivalent native
candidate with `@lion/ui@0.21.0` and Spectrum Web Components Dialog/Overlay 1.12.2. Unifold retains
ownership of its JSON contract, canonical events, normalized state, XState routing, Tailwind token
surface, static fallback, and release evidence. The measured candidates use the same trigger,
accessible name, dismiss action, and short content; measurements are local initialization and
standalone minified-gzip observations, not portable performance claims.

## Standards and accessibility baseline

The [HTML Standard dialog definition](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element)
places `showModal()` dialogs in the top layer and makes the rest of the document inert. W3C's
[H102 technique](https://www.w3.org/WAI/WCAG21/Techniques/html/H102) explicitly prefers native
`dialog` because the browser supplies modal focus movement, focus return, focus limitation,
background inertness, and Escape dismissal. Unifold therefore does not replace the top-layer
primitive with a generic ARIA container.

The [WAI-ARIA APG modal Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
requires a named dialog, initial focus inside it, a contained Tab sequence, Escape dismissal, and
logical focus restoration. It strongly recommends a visible close button. Unifold keeps an always
present localized dismiss button and adds a small cross-shadow compatibility adapter because the
Chromium/WebKit Playwright matrix exposed inconsistent native Tab traversal through slotted custom
elements. That adapter runs only while open, excludes hidden/inert/CSS-hidden composed ancestors,
stops nested fallback events at the active dialog, and never becomes a second open-state authority.

## Candidate comparison

| Candidate | Accessibility and event fit | Theme/ownership fit | Local p95 | Standalone gzip |
| --- | --- | --- | ---: | ---: |
| Native HTML | Owns top layer, inertness, cancel/close, and focus lifecycle; maps directly to one canonical activation event | Native surface accepts Unifold CSS parts and tokens without another component state model | 0.19 ms | 347 B |
| Lion 0.21.0 | Declarative invoker/content slots over Lion's Overlay System; recent releases also use native dialog and contain nested-overlay fixes | White-label styling is compatible, but its overlay controller would duplicate Unifold open/event ownership | 1.14 ms | 26,994 B |
| Spectrum Dialog/Overlay 1.12.2 | Mature modal/page overlay stack, focus management, trigger ARIA, nested overlays, and close events | Strong behavior reference, but Spectrum layout/tokens and overlay state are broader than the Unifold contract | 1.16 ms | 61,330 B |

The executable comparison is `pnpm benchmark:dialog-foundation`; it writes the ignored
`benchmark-results/dialog-foundation.json` artifact. Twenty samples per candidate run in the same
local DOM environment. The native selection gate requires at most 100 ms p95 and 4 KiB gzip and
passes. Lion and Spectrum are descriptive comparisons, not framework gates.

Lion's [Dialog overview](https://lion.js.org/components/dialog/overview/) describes a declarative
wrapper around its Overlay System using invoker/content slots and a bubbling `close-overlay` event.
Its current release history records a move to native dialog focus handling and fixes for nested
Escape behavior. These are valuable regression cases, but adopting the controller would introduce
a second overlay state/event layer rather than replace Unifold's runtime.

Spectrum's [Dialog documentation](https://opensource.adobe.com/spectrum-web-components/components/dialog/)
separates dialog layout from overlay behavior. Its
[Overlay documentation](https://opensource.adobe.com/spectrum-web-components/components/overlay/)
uses native dialog or popover top-layer primitives, traps modal focus, manages trigger ARIA, and
supports nested overlays. The full dependency and token surface is appropriate for Spectrum-based
products but materially exceeds the bounded Unifold adapter.

## Resulting contract

- Required trigger and dialog labels, a localized visible dismiss action, and 1 to 64 authored
  children.
- Native `showModal()`, `cancel`, and `close` are authoritative when supported; the fallback keeps
  the same rendered dialog, open state, inert background, Escape, and focus behavior.
- Opening and closing emit exactly one canonical component activation with enum-backed trigger,
  dismiss, Escape, or native reasons.
- Keyboard handling is inactive while closed. Open focus traversal ignores hidden, inert,
  `aria-hidden`, `display:none`, and `visibility:hidden` composed ancestors.
- Nested fallback dialogs consume their own Tab/Escape input so an inner dismissal cannot close an
  outer dialog.
- Closing restores the internal invoker when it still exists. Disconnect and invalid-update paths
  restore background inertness without focusing a removed node.
- Static export retains a named disclosure and complete content without JavaScript; upgrade proves
  one modal interaction and one canonical event.

## Limitations and follow-up

Automated axe and keyboard journeys do not replace screen-reader, zoom, forced-colors, mobile
virtual-keyboard, or browser-chrome focus review. Route-level logical focus selection after an
invoker is removed belongs to the host router because only it knows the next workflow target. A
future nested-dialog product composition should retain the explicit inner-only dismissal test and
add manual assistive-technology evidence before stable release.

## Claim-to-source ledger

- “The dialog element,” WHATWG HTML Living Standard, accessed 2026-08-26:
  https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element
- “H102: Creating modal dialogs with the HTML dialog element,” W3C WAI, accessed 2026-08-26:
  https://www.w3.org/WAI/WCAG21/Techniques/html/H102
- “Dialog (Modal) Pattern,” W3C WAI-ARIA APG, accessed 2026-08-26:
  https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- “Dialog: Overview,” Lion, accessed 2026-08-26:
  https://lion.js.org/components/dialog/overview/
- “Releases,” Lion, accessed 2026-08-26: https://github.com/ing-bank/lion/releases
- “Dialog,” Spectrum Web Components 1.12.2, Adobe, accessed 2026-08-26:
  https://opensource.adobe.com/spectrum-web-components/components/dialog/
- “Overlay,” Spectrum Web Components 1.12.2, Adobe, accessed 2026-08-26:
  https://opensource.adobe.com/spectrum-web-components/components/overlay/
