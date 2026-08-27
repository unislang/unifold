# Repository agent requirements

These requirements apply to every change in this repository.

## Source ownership and exports

- Never import a binding into a module and then locally re-export that imported binding. The former
  `apps/reference/src/popover-reference.ts` line 9 pattern is prohibited because it obscures source
  ownership and can pull unrelated implementation into a bundle.
- Export an owned declaration from its defining module. At an intentional package or feature
  boundary, use a direct source export such as `export { Widget } from "./widget.js"`; do not first
  create a local import binding.
- Run `pnpm quality:reexports` for every change that adds or modifies imports or exports. Do not
  bypass, suppress, or weaken that gate.
