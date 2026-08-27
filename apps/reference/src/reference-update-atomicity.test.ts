// @vitest-environment happy-dom
import { createUiEvent, UiEventPhase, UiEventType } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { createReferenceAtomicUpdateProbe } from "./reference-update-atomicity.js";

it("requires the reference event capture before probing an atomic update", () => {
  const probe = createReferenceAtomicUpdateProbe({ authored: {} } as never, () => undefined);
  expect(() => probe("renderer")).toThrow("Missing event capture.");
});

it("requires the stable Scratch field before mutating the authored revision", () => {
  const event = createUiEvent({
    correlationid: "correlation",
    data: { phase: UiEventPhase.State, runtime: { documentId: "document" } },
    id: "event",
    sequence: 1,
    source: "urn:unifold:test",
    staterevision: 1,
    time: "2026-08-27T00:00:00.000Z",
    transactionid: "transaction",
    type: UiEventType.TransactionCommitted
  });
  const application = { authored: atomicDocument() } as never;
  const probe = createReferenceAtomicUpdateProbe(application, () => [event]);
  expect(() => probe("semantics")).toThrow("Missing node host: profile-editor::name.");
});

function atomicDocument(): unknown {
  return {
    revision: "1",
    semantics: { entities: [{ type: "Person" }] },
    view: { parameters: { fieldLabel: "Your name" } }
  };
}
