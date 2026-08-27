# JSON workflows with XState

Unifold uses XState for temporal workflow decisions while the normalized runtime remains the only
writer of committed UI state. A workflow receives canonical events for its owning node scope and
may select only trusted command factories registered by the host application. JSON never contains
functions, inline actions, inline guard functions, or executable expressions.

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
          "guard": "profile-is-complete",
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
empty event, command, or guard IDs, unknown fields, and non-JSON values before mounting. Machine definitions
are canonicalized into IR so property order does not cause an unchanged actor to restart.

## Route a specific child signal

Hierarchical layout nodes may map reviewed component signals to a domain-oriented machine event:

```json
{
  "id": "save",
  "type": "Button",
  "props": { "label": "Save" },
  "events": { "onClick": "PROFILE_SAVE" }
}
```

The lowered JsonUI node stores `{ "events": { "activated": "PROFILE_SAVE" } }` outside rendered
component properties. Only an activation whose `sourceNode.id` is `save` is sent to the owning
actor as `PROFILE_SAVE`; sibling button activations keep their ordinary canonical type. The public
observable stream always retains the original canonical event and identity.

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

Machine-issued effects retain the machine owner as their reply scope even when the effect targets a
node in another visual scope or has no node target, as with `effect.invoke`. The command,
requested, and terminal facts share one opaque CloudEvents `subject`; guards and transitions can use
that identity to distinguish concurrent invocations without overloading correlation, causation, or
transaction IDs. The trusted command port receives the same value as `context.effectId`.

## Register trusted guards

A transition may reference one synchronous host predicate by name. The predicate receives the
canonical triggering event and a read-only lookup for the current normalized node snapshots:

```ts
import { createMachineGuardRegistry, mountUnifoldApplication } from "@unislang/unifold";

const machineGuards = createMachineGuardRegistry();
machineGuards.register("profile-is-complete", ({ snapshot }) => {
  return snapshot("profile-name")?.control?.value !== "";
});

mountUnifoldApplication(documentDefinition, host, { machineGuards });
```

Guard code is a trusted host capability and should remain deterministic, side-effect free, and
synchronous. It cannot write runtime state. Only an exact `true` permits the transition; a thrown
error, an unregistered-after-mount predicate, or any other result fails closed. Unknown guard names
reject mount or update before mutation, and a rejected update retains the last-known-good workflow.
One registry accepts at most 256 predicates.

Use `application.machineState(id)` for synchronous inspection of the current serializable state.
Unchanged definitions retain their actor and state across document reconciliation. A changed
definition currently starts at its declared initial state; persisted snapshots and migrations are a
future profile rather than an implicit use of XState-internal snapshot formats.

## Current profile boundary

The initial profile supports flat states, canonical-event transitions, targets, registered command
IDs, and one named guard per transition. Delays, invoked actors/effects, parallel and nested states,
inspection subscriptions, persistence/migrations, replay bundles, and machine templates in reusable
compositions remain explicit follow-up contracts. They must extend the schema and registries rather
than adding executable JSON.

The implementation follows XState v5's named implementation and actor lifecycle model. See the
[official setup documentation](https://stately.ai/docs/setup) and
[guard documentation](https://stately.ai/docs/guards), and
[actor documentation](https://stately.ai/docs/actors).
