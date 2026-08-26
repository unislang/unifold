# Data-only test scenario

[`contact-form.scenario.ts`](src/contact-form.scenario.ts) is the source of truth for a portable Unifold journey. It contains only serializable data and named enums—no callbacks, selectors tied to CSS implementation, sleeps, or executable strings.

The same scenario can run against the authoring preview, a standalone export, or an adopter application through `@unislang/unifold-playwright`.

The expected source and render IDs are expanded composition IDs. That makes the scenario portable across hosts while still proving that an authored composition instance produces the same canonical event and selective-update contracts as a directly authored node.
