import { createUiEvent, UiEventPhase, type UiEvent } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { shareCausalEventIdentity } from "./reference-state-authority.js";

it("requires every causal view to contain the same event objects in order", () => {
  const first = event("first");
  const second = event("second");
  expect(
    shareCausalEventIdentity("transaction", [
      [first, second],
      [first, second]
    ])
  ).toBe(true);
  expect(shareCausalEventIdentity("transaction", [[first], [{ ...first }]])).toBe(false);
});

function event(id: string): UiEvent {
  return createUiEvent({
    correlationid: "correlation",
    data: { phase: UiEventPhase.State, runtime: { documentId: "document" } },
    id,
    sequence: 1,
    source: "urn:unifold:test",
    staterevision: 1,
    time: "2026-08-27T00:00:00.000Z",
    transactionid: "transaction",
    type: "org.unifold.ui.test.v1"
  });
}
