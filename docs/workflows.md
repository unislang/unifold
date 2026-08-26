# JSON workflows with XState

Unifold uses XState for temporal workflow decisions while the normalized runtime remains the only
writer of committed UI state. A workflow receives canonical events for its owning node scope and
may select only trusted command factories registered by the host application. JSON never contains
functions, inline actions, guards, or executable expressions.

## Author a machine

Add a versioned `machines` entry to the same `UiDocument` that owns the view:

```json
{
  "schemaVersion": "1.0.0",
  "id": "profile-workflow",
  "version": "1.0.0",
  "ownerId": "profile-editor",
  "initial": "editing",
  "states": {
    "editing": {
      "on": {
        "org.unifold.ui.form.submitted.v1": {
          "target": "submitted",
          "commands": ["show-submitted"]
        }
      }
    },
    "submitted": {}
  }
}
```

`schemaVersion` versions the portable machine contract. `version` versions the application's
workflow behavior. `ownerId` must identify a compiled UI node. The actor receives only canonical
events whose source scope contains that owner, so one application event is not broadcast to every
actor.

The compiler rejects duplicate machine IDs, missing owners, missing initial or transition states,
empty event or command IDs, unknown fields, and non-JSON values before mounting. Machine definitions
are canonicalized into IR so property order does not cause an unchanged actor to restart.

## Register trusted commands

The host maps portable IDs to typed command factories:

```ts
import { createMachineCommandRegistry, mountUnifoldApplication } from "@unislang/unifold";
import { UiCommandType } from "@unislang/unifold-events";

const machineCommands = createMachineCommandRegistry();
machineCommands.register("show-submitted", () => ({
  id: "profile-editor::submit",
  properties: { label: "Submitted" },
  type: UiCommandType.NodePatchProperties
}));

mountUnifoldApplication(documentDefinition, host, { machineCommands });
```

An unknown command ID rejects initial mounting or a dynamic update and preserves the last-known-good
application. A selected command runs through the normal transaction coordinator. Its canonical
facts inherit the triggering event's `correlationid`, set `causationid` to that event ID, and use a
new transaction. XState does not copy component values into machine context.

Use `application.machineState(id)` for synchronous inspection of the current serializable state.
Unchanged definitions retain their actor and state across document reconciliation. A changed
definition currently starts at its declared initial state; persisted snapshots and migrations are a
future profile rather than an implicit use of XState-internal snapshot formats.

## Current profile boundary

The initial profile supports flat states, canonical-event transitions, targets, and registered
command IDs. Named guards, delays, invoked actors/effects, parallel and nested states, inspection
subscriptions, persistence/migrations, replay bundles, and machine templates in reusable
compositions remain explicit follow-up contracts. They must extend the schema and registries rather
than adding executable JSON.

The implementation follows XState v5's named implementation and actor lifecycle model. See the
[official setup documentation](https://stately.ai/docs/setup) and
[actor documentation](https://stately.ai/docs/actors).
