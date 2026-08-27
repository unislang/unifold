// @vitest-environment happy-dom
import { UiCommandType, UiEventType, type UiEvent } from "@unislang/unifold-events";
import { expect, it, vi } from "vitest";

import { UnifoldApplication } from "./application.js";
import {
  asApplicationError,
  atomicUpdateDiagnostic,
  atomicUpdateFailureStage
} from "./application-atomicity.js";
import {
  authoredDocument,
  failingCompensationRenderer,
  failingRenderer,
  machineDocument,
  requireApplication,
  requirePrepared,
  runtimeFor,
  workflowCommandRegistry
} from "./application.test-data.js";
import { UiMachineConfigurationError, UiMachineCoordinator } from "./machine-coordinator.js";
import { mountUnifoldApplication } from "./mount.js";
import { UiSemanticConfigurationError, UiSemanticCoordinator } from "./semantic-coordinator.js";
import { prepareApplicationStores } from "./store-adapters.js";
import { storeDefinition } from "./store-adapters-base.test-data.js";
import type { StoreCommandController } from "./store-command-port.js";
import { UnifoldApplicationDiagnosticStage, UnifoldApplicationUpdateStatus } from "./types.js";

it("classifies atomic update and rollback failures", () => {
  expect(asApplicationError("non-error").message).toBe("Unknown rollback failure.");
  expect(
    atomicUpdateDiagnostic(
      new Error("rollback"),
      new Error("update"),
      UnifoldApplicationDiagnosticStage.Runtime
    ).code
  ).toBe("application-update-rollback-failed");
  expect(atomicUpdateFailureStage(new UiMachineConfigurationError("workflow"))).toBe(
    UnifoldApplicationDiagnosticStage.Workflow
  );
  expect(atomicUpdateFailureStage(new UiSemanticConfigurationError("semantics"))).toBe(
    UnifoldApplicationDiagnosticStage.Semantics
  );
});

it("discards the candidate when coordinated execution fails", () => {
  const prepared = requirePrepared(authoredDocument());
  const runtime = runtimeFor(prepared);
  failNextCoordinatedExecution(runtime);
  const application = directApplication(prepared, runtime, failingRenderer(false));

  const result = application.update(authoredDocument("2", { label: "Full name" }));

  expect(result.diagnostics[0]?.stage).toBe(UnifoldApplicationDiagnosticStage.Runtime);
  expect(runtime.revision).toBe(0);
  expect(runtime.getSnapshot("name").properties["label"]).toBe("Name");
  expect(application.update(authoredDocument("3")).status).toBe(
    UnifoldApplicationUpdateStatus.Applied
  );
  application.dispose();
});

it("quarantines when candidate authority restoration fails", () => {
  const prepared = requirePrepared(authoredDocument());
  const runtime = runtimeFor(prepared);
  const storeCommands = {
    execute: () => undefined,
    replace: () => {
      throw new Error("authority failed");
    }
  } satisfies StoreCommandController;
  const application = directApplication(prepared, runtime, failingRenderer(false), storeCommands);

  const result = application.update(authoredDocument("2"));

  expect(result.diagnostics[0]?.code).toBe("application-update-rollback-failed");
  expect(() => application.runtime.execute([])).toThrow("disposed");
});

it("rejects a candidate whose declared store adapter is unavailable", () => {
  const application = requireApplication(
    mountUnifoldApplication(authoredDocument(), document.createElement("main"))
  );
  const source = {
    ...authoredDocument("2"),
    stores: [storeDefinition()],
    view: { $comp: "TextField", id: "name", path: "/name", store: "customer" }
  };

  const result = application.update(source);

  expect(result.diagnostics[0]?.stage).toBe(UnifoldApplicationDiagnosticStage.Store);
  expect(application.runtime.revision).toBe(0);
  application.dispose();
});

it("discards renderer-stage state, selections, facts, actors, and sequence identities", () => {
  const prepared = requirePrepared(authoredDocument());
  const runtime = runtimeFor(prepared);
  const events: UiEvent[] = [];
  const actor = vi.fn();
  runtime.events$.subscribe((event) => events.push(event));
  runtime.registerActor("name", { send: actor });
  const label = runtime.node("name").select(({ properties }) => properties["label"]);
  const observed = vi.fn();
  label.subscribe(observed);
  const application = directApplication(prepared, runtime, failingRenderer());

  const rejected = application.update(authoredDocument("2", { label: "Full name" }));

  expectDiscardedCandidate(rejected, runtime, label.get(), events);
  expect(observed).not.toHaveBeenCalled();
  expect(actor).not.toHaveBeenCalled();
  retryUpdate(application, events);
  application.dispose();
});

it("publishes only RuntimeDisposed when rollback itself fails", () => {
  const prepared = requirePrepared(authoredDocument());
  const runtime = runtimeFor(prepared);
  const events: UiEvent[] = [];
  const complete = vi.fn();
  runtime.events$.subscribe({ next: (event) => events.push(event), complete });
  const application = directApplication(prepared, runtime, failingCompensationRenderer());

  const result = application.update(authoredDocument("2", { label: "Full name" }));

  expect(result).toMatchObject({
    diagnostics: [{ code: "application-update-rollback-failed" }],
    revision: 0,
    status: UnifoldApplicationUpdateStatus.Rejected
  });
  expect(events.map(({ type }) => type)).toEqual([UiEventType.RuntimeDisposed]);
  expect(events.map(({ sequence }) => sequence)).toEqual([1]);
  expect(complete).toHaveBeenCalledOnce();
  expect(() =>
    application.runtime.execute([{ id: "name", type: UiCommandType.FormSubmit }])
  ).toThrow("disposed");
});

it("restores the exact workflow state when coordinated replacement fails", () => {
  const application = requireApplication(
    mountUnifoldApplication(machineDocument(), document.createElement("main"), {
      machineCommands: workflowCommandRegistry()
    })
  );
  application.runtime.execute([{ id: "form", type: UiCommandType.FormSubmit }]);
  expect(application.machineState("profile-workflow")).toBe("saved");
  const revision = application.runtime.revision;
  const events: UiEvent[] = [];
  application.runtime.events$.subscribe((event) => events.push(event));
  const replacement = vi
    .spyOn(UiMachineCoordinator.prototype, "replace")
    .mockImplementationOnce(() => {
      throw new UiMachineConfigurationError("Injected workflow failure.");
    });

  const result = application.update(authoredDocument("2", { label: "Full name" }));

  expect(result.diagnostics[0]?.stage).toBe(UnifoldApplicationDiagnosticStage.Workflow);
  expect(application.runtime.revision).toBe(revision);
  expect(application.machineState("profile-workflow")).toBe("saved");
  expect(events).toEqual([]);
  replacement.mockRestore();
  application.dispose();
});

it("classifies downstream semantic publication failure and permits a clean retry", () => {
  const application = requireApplication(
    mountUnifoldApplication(authoredDocument(), document.createElement("main"))
  );
  const field = application.renderer.getElement("name");
  const revision = application.runtime.revision;
  const events: UiEvent[] = [];
  application.runtime.events$.subscribe((event) => events.push(event));
  const publication = vi
    .spyOn(UiSemanticCoordinator.prototype, "publishRuntime")
    .mockImplementationOnce(() => {
      throw new UiSemanticConfigurationError("Injected semantic failure.");
    });

  const source = authoredDocument("2", { label: "Full name" });
  const result = application.update(source);

  expect(result.diagnostics[0]?.stage).toBe(UnifoldApplicationDiagnosticStage.Semantics);
  expect(application.runtime.revision).toBe(revision);
  expect(application.renderer.getElement("name")).toBe(field);
  expect(application.runtime.getSnapshot("name").properties["label"]).toBe("Name");
  expect(events).toEqual([]);
  expect(application.update(source).status).toBe(UnifoldApplicationUpdateStatus.Applied);
  publication.mockRestore();
  application.dispose();
});

function directApplication(
  prepared: ReturnType<typeof requirePrepared>,
  runtime: ReturnType<typeof runtimeFor>,
  renderer: ReturnType<typeof failingRenderer>,
  storeCommands?: StoreCommandController
): UnifoldApplication {
  return new UnifoldApplication(
    prepared,
    document.createElement("main"),
    runtime,
    renderer,
    prepareApplicationStores(prepared.document),
    {},
    undefined,
    undefined,
    storeCommands
  );
}

function failNextCoordinatedExecution(runtime: ReturnType<typeof runtimeFor>): void {
  const begin = runtime.beginCoordination.bind(runtime);
  vi.spyOn(runtime, "beginCoordination").mockImplementationOnce(() => {
    const coordination = begin();
    return {
      commit: () => coordination.commit(),
      discard: () => coordination.discard(),
      execute: (commands, context) => {
        coordination.execute(commands, context);
        throw new Error("Injected coordination failure.");
      },
      registerActor: (id, actor) => coordination.registerActor(id, actor)
    };
  });
}

function expectDiscardedCandidate(
  rejected: ReturnType<UnifoldApplication["update"]>,
  runtime: ReturnType<typeof runtimeFor>,
  selectedLabel: unknown,
  events: readonly UiEvent[]
): void {
  expect(rejected).toMatchObject({
    diagnostics: [{ stage: UnifoldApplicationDiagnosticStage.Renderer }],
    revision: 0,
    status: UnifoldApplicationUpdateStatus.Rejected
  });
  expect(runtime.revision).toBe(0);
  expect(runtime.getSnapshot("name").properties["label"]).toBe("Name");
  expect(selectedLabel).toBe("Name");
  expect(events).toEqual([]);
}

function retryUpdate(application: UnifoldApplication, events: readonly UiEvent[]): void {
  expect(application.update(authoredDocument("2", { label: "Full name" })).status).toBe(
    UnifoldApplicationUpdateStatus.Applied
  );
  expect(events.map(({ sequence }) => sequence)).toEqual([1, 2]);
  expect(events.map(({ type }) => type)).toEqual([
    UiEventType.CommandApplied,
    UiEventType.TransactionCommitted
  ]);
}
