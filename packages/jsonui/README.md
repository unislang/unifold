# @unislang/unifold-jsonui

This package owns Unifold's named, pinned JsonUI syntax profile. It does not embed the upstream
React renderer or create an upstream JsonUI store.

Profile `unifold-jsonui@1.0.0` is pinned to `@jsonui/core` and `@jsonui/react` 0.10.25 at upstream
commit `5401b3d4900ca3032c108d6db00e8a819f4b28e9`. The compatible subset is deliberately narrow:
catalog-selected `$comp` nodes, array-valued `$children`, JSON properties, and Unifold's required
stable `id` extension compile into Unifold IR.

Upstream named slots, primitive children, actions, modifiers, JSONata, inline validation, list
directives, localization, and state export are rejected with exact source pointers. The
`store`/`path` spelling is accepted only as a declared, schema-checked Unifold extension; it does not
activate the upstream store runtime. Equivalent behavior uses catalog properties, registered
validators, typed commands, compositions, XState machines, and the single normalized store.

`JSONUI_COMPATIBILITY_CORPUS` is the executable public record of that boundary. Expanding support
requires a profile version, migration policy, upstream parity evidence, and proof that no second
state authority was introduced.
