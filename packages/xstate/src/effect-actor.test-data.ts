import {
  createUiEvent,
  UiCommandType,
  UiEventPhase,
  type UiEventType,
  UiNodeKind
} from "@unislang/unifold-events";

/** Creates canonical facts shared by colocated XState adapter tests. */
export function exampleEvent(type: UiEventType, withSource = true) {
  return createUiEvent({
    id: "event-1",
    source: "urn:unifold:node:field",
    type,
    time: "2026-08-24T00:00:00.000Z",
    correlationid: "correlation-1",
    transactionid: "transaction-1",
    sequence: 1,
    staterevision: 1,
    data: {
      phase: UiEventPhase.State,
      ...(withSource ? { sourceNode: sourceNode() } : {}),
      runtime: { documentId: "test" }
    }
  });
}

export function effectInput(capability: string) {
  return {
    command: {
      type: UiCommandType.EffectInvoke,
      capability,
      input: { id: "customer-1" }
    },
    context: {
      correlationId: "correlation-1",
      requestId: "request-1",
      transactionId: "transaction-1"
    }
  } as const;
}

function sourceNode() {
  return {
    id: "field",
    instanceId: "field",
    kind: UiNodeKind.Control,
    scopePath: ["form", "field"],
    type: "TextField",
    version: "1.0.0"
  };
}
