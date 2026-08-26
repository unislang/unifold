# Native form lifecycle interoperability

Audience: Unifold contracts, forms, elements, renderer, accessibility, and test maintainers

Date: 2026-08-26

Decision: use the HTML form-associated custom-element platform behind one small Lit reactive
controller; retain Lion's form system as behavioral reference only; do not add another form state,
validation, or registration runtime.

## Scope and direct answer

This decision covers value-bearing Unifold Web Components, native `FormData`, constraint
projection, disabled fieldsets, reset, browser state restore/autofill, IME composition, and form
owner changes. Upload transport, durable file storage, and server authorization are separate
capabilities. The existing Unifold store remains the only committed value/status authority;
`ElementInternals` is a browser interoperability projection and never an alternate model.

## Implementation evidence

The native child-mount surface and scalar controller are implemented in the active working slice.
TextField, TextArea, Select, RadioGroup, and VirtualList delegate native disabled, reset, restore,
autocomplete, validity, and submission projection to that controller. Input and restore changes add
an enum-backed origin to the existing canonical intent; committed state still comes only from the
runtime. A focused Playwright matrix proves text `FormData`, form reassociation, disabled fieldsets,
IME de-duplication, and callback restoration in Chromium, Firefox, and WebKit. Choice-control
`FormData` coverage is part of the same matrix. The final complete reference rerun passes 153
journeys across Chromium, Firefox, and WebKit with only six intentional non-Chromium scale skips.

This is not yet complete for every value-bearing control. Boolean, multi-value, date/range, and file
controls require value-shape-specific adapters and the static-upgrade and 100-control performance
rows below remain release gates. FileInput already enforces opaque metadata and a trusted ephemeral
capability boundary, but its native form-value adapter remains separate follow-up work.

The platform boundary is feasible, and `unifold-form` now exposes a generic renderer child-mount
surface. Its native `form` and the JSON-authored child hosts share the same shadow-tree ancestry,
instead of relating only through a slot. That satisfies the HTML form-owner algorithm while
preserving renderer-owned host identity and avoiding cloned controls or a second form model.

## Standards contract

The [WHATWG custom-elements standard](https://html.spec.whatwg.org/dev/custom-elements.html)
defines autonomous form-associated custom elements through `static formAssociated = true` and
`attachInternals()`. `ElementInternals.setFormValue()` accepts a string, `File`, `FormData`, or
`null`; the optional second value is browser-restorable state. The same standard defines
`formAssociatedCallback`, `formDisabledCallback`, `formResetCallback`, and
`formStateRestoreCallback` as custom-element reactions.

The [WHATWG form-owner algorithm](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html)
resolves an explicit `form` association or the nearest ancestor `form`. A shadow-tree form is not a
DOM ancestor of the host's light children. Unifold must make the native form the actual child-mount
ancestor instead of treating slot projection as ownership.

[MDN's `setFormValue()` reference](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/setFormValue)
records cross-browser baseline availability since March 2023 and distinguishes the submitted value
from restorable user state. Unifold will use a string state for scalar controls because WebKit's
first-party implementation notes document historical restrictions on non-string restoration and
autofill. Browser tests, not support tables alone, remain the release evidence.

[WebKit's implementation guide](https://webkit.org/blog/13711/elementinternals-and-form-associated-custom-elements/)
confirms submission, native validity, owner-change, disabled, reset, and restore callback behavior.
It also documents that restore and autocomplete share `formStateRestoreCallback` with different
reasons. Unifold must normalize both through one candidate-value path and emit at most one canonical
intent for an actual value change.

During IME composition, [`InputEvent.isComposing`](https://developer.mozilla.org/en-US/docs/Web/API/InputEvent/isComposing)
is true between `compositionstart` and `compositionend`. Intermediate composition input updates the
native editing surface but cannot commit to Unifold state. The final non-composing input, or a
single composition-end fallback when a browser omits it, supplies the one candidate value.

## OSS comparison

| Candidate | Useful existing capability | Conflict or gap for Unifold | Decision |
| --- | --- | --- | --- |
| HTML `ElementInternals` | Native owner, `FormData`, validation, disabled/reset/restore callbacks | Needs a bounded adapter and browser evidence | Selected foundation |
| [Lit reactive controllers](https://lit.dev/docs/composition/controllers/) | Existing dependency; composes reusable lifecycle behavior without prototype mixins | Form callbacks still delegate from each form-associated host | Selected implementation seam |
| [Lion form system](https://lion.js.org/fundamentals/systems/form/overview/) | Mature normalized fields, groups, formatting, validation, interaction states, and registration | Its model value, validation, fieldset, and registration system would duplicate Unifold's store/forms runtime | Behavioral reference only |
| [Spectrum Web Components](https://opensource.adobe.com/spectrum-web-components/) | Broad accessible Lit component implementation and design-system evidence | Brings Spectrum state, tokens, and component contracts rather than a narrow form bridge | Component-specific reference only |

The selected adapter is deliberately small: attach internals, project the committed value and
validity, remember the authored reset value, translate browser lifecycle callbacks into typed host
requests, suppress intermediate composition input, and clean up on disconnect. Parsing,
validation, aggregation, XState routing, effects, persistence, and canonical publication stay in
existing Unifold packages.

## Required implementation shape

- Add a reusable Lit `ReactiveController` with a typed host port. It owns `ElementInternals` and no
  application state.
- Value-bearing hosts opt into `static formAssociated = true` and delegate the four browser form
  callbacks to the controller. Native controls remain the accessible editing surfaces.
- After each committed renderer projection, call `setFormValue()` and `setValidity()`. A disabled
  host submits `null`; an empty name has no successful entry.
- Reset and restore/autocomplete request a candidate change through the same canonical ingress used
  by user input. The store decides whether the transaction commits; rejected updates re-project the
  prior committed value.
- A form-disabled callback combines ancestor-fieldset disablement with authored/store disablement
  without overwriting the authored property.
- Add a renderer child-mount port. `unifold-form` supplies a real light-DOM `form` as that surface;
  other elements continue to mount children directly on their hosts.
- Preserve authored initial values separately from later projections so native reset restores the
  definition's initial snapshot, cancels stale work, and emits one reset transaction.
- File controls pass the selected `File` objects only to `setFormValue()` or a trusted ephemeral
  capability registry. Canonical events and portable snapshots contain bounded opaque metadata,
  never bytes, local paths, file names, or modification timestamps.

## Executable acceptance matrix

| Case | Required evidence |
| --- | --- |
| Native submission | `new FormData(form)` equals the committed Unifold aggregate and contains each enabled named control once |
| Disabled fieldset | Browser callback disables interaction and omits the entry without mutating authored disabled state |
| Reset | Native reset and JSON/XState reset converge on one initial snapshot and one canonical transaction |
| Restore/autofill | Each reason takes one candidate path; unchanged values emit nothing and rejected values roll back |
| Reassociation | Moving a control or changing explicit ownership updates `ElementInternals.form` without duplicate subscription or event delivery |
| IME | Composition updates the visible native input, commits no intermediate value, and emits exactly one final intent |
| Selective render | One lifecycle change rerenders only the affected control and ancestor projections |
| Static upgrade | No-JavaScript form content remains usable; upgrade preserves values, focus, and a single event path |
| Portability | Chromium, Firefox, and WebKit run the same lifecycle suite; packed consumer and host-parity fixtures use public APIs only |
| Performance | A 100-control `FormData`/reset/restore fixture remains inside the existing 8 ms transaction and bundle budgets |

## Limitations and disconfirming evidence

Browser autofill is heuristic and cannot be deterministically forced in every Playwright engine.
The release suite can directly invoke the standards callback for normalization evidence, but must
label that as callback conformance rather than proof of browser UI autofill. Manual browser and
assistive-technology evidence remains required.

Happy DOM and jsdom are not authoritative for this seam. jsdom's own Web Platform Test inventory
still marks the form-associated custom-element family unimplemented, so unit tests should use an
injected internals port while native behavior is proven in Playwright.

## Claim-to-source ledger

- “HTML Standard: Custom elements,” WHATWG, living standard, accessed 2026-08-26:
  https://html.spec.whatwg.org/dev/custom-elements.html
- “Association of controls and forms,” WHATWG HTML Living Standard, accessed 2026-08-26:
  https://html.spec.whatwg.org/multipage/form-control-infrastructure.html
- “ElementInternals: setFormValue() method,” MDN Web Docs, last modified 2024-07-26, accessed
  2026-08-26: https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/setFormValue
- “ElementInternals and Form-Associated Custom Elements,” WebKit, 2023-02-06, accessed 2026-08-26:
  https://webkit.org/blog/13711/elementinternals-and-form-associated-custom-elements/
- “InputEvent: isComposing property,” MDN Web Docs, last modified 2023-04-07, accessed 2026-08-26:
  https://developer.mozilla.org/en-US/docs/Web/API/InputEvent/isComposing
- “Reactive Controllers,” Lit, accessed 2026-08-26:
  https://lit.dev/docs/composition/controllers/
- “Form: Overview,” Lion, accessed 2026-08-26:
  https://lion.js.org/fundamentals/systems/form/overview/
- “Spectrum Web Components,” Adobe, accessed 2026-08-26:
  https://opensource.adobe.com/spectrum-web-components/
- `jsdom/test/web-platform-tests/to-run.yaml`, jsdom project, accessed 2026-08-26:
  https://github.com/jsdom/jsdom/blob/main/test/web-platform-tests/to-run.yaml
