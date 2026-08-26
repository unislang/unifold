import { DataClassification, UiNodeKind, UiUpdateTrigger } from "@unislang/unifold-contracts";
import {
  createUiEvent,
  UiControlStatus,
  UiEventDisclosureMode,
  UiEventPhase,
  UiEventType,
  type UiEvent,
  type UiNodeSnapshot
} from "@unislang/unifold-events";

import { createDocumentDiff } from "./diff.js";
import { DevtoolsProtocolVersion, type DevtoolsReplayPlan } from "./types.js";

export function node(
  id = "field",
  classification = DataClassification.Public,
  parentId?: string
): UiNodeSnapshot {
  return {
    attributes: { label: "Customer name" },
    base: nodeBase(classification),
    control: controlState(),
    definitionVersion: "1.0.0",
    id,
    instanceId: id,
    kind: UiNodeKind.Control,
    ...nodeHierarchy(id, parentId),
    properties: { help: "Private help" },
    revision: 0,
    type: "TextField"
  };
}

export function event(sequence: number, overrides: Partial<UiEvent> = {}): UiEvent {
  const snapshot = node();
  return createUiEvent({
    correlationid: "correlation-1",
    data: eventData(snapshot),
    id: `event-${sequence}`,
    sequence,
    source: "urn:unifold:document-1",
    staterevision: sequence,
    time: "2026-08-25T12:00:00.000Z",
    transactionid: `transaction-${sequence}`,
    type: UiEventType.TransactionCommitted,
    ...overrides
  });
}

function nodeBase(classification: DataClassification) {
  return {
    busy: false,
    dataClassification: classification,
    disabled: false,
    focused: false,
    interactive: true,
    mounted: true,
    readonly: false,
    visible: true
  };
}

function controlState() {
  return {
    asyncValidatorIds: [],
    dirty: false,
    errors: [],
    initialValue: "secret-value",
    pending: false,
    pristine: true,
    rawValue: "secret-value",
    required: false,
    status: UiControlStatus.Valid,
    touched: false,
    updateOn: UiUpdateTrigger.Input,
    validationRequestId: null,
    validatorIds: [],
    value: "secret-value"
  };
}

function nodeHierarchy(id: string, parentId: string | undefined) {
  return parentId === undefined ? { scopePath: [id] } : { parentId, scopePath: [parentId, id] };
}

function eventData(snapshot: UiNodeSnapshot) {
  return {
    change: { value: "safe-value" },
    disclosure: {
      classification: DataClassification.Public,
      mode: UiEventDisclosureMode.Full,
      snapshotRevision: 1
    },
    phase: UiEventPhase.State,
    runtime: { documentId: "document-1" },
    snapshot,
    sourceNode: {
      id: snapshot.id,
      instanceId: snapshot.instanceId,
      kind: snapshot.kind,
      scopePath: snapshot.scopePath,
      type: snapshot.type,
      version: snapshot.definitionVersion
    }
  };
}

export const beforeDocument = Object.freeze({
  id: "document-1",
  revision: "r1",
  view: { id: "root", title: "Before", type: "Box" }
});

export const afterDocument = Object.freeze({
  id: "document-1",
  revision: "r2",
  view: { help: "Added", id: "root", title: "After", type: "Box" }
});

export async function replayPlan(): Promise<DevtoolsReplayPlan> {
  const diff = await createDocumentDiff(beforeDocument, afterDocument);
  return {
    frames: [
      {
        baseFingerprint: diff.beforeFingerprint,
        expectedFingerprint: diff.afterFingerprint,
        operations: diff.operations,
        sequence: 1
      }
    ],
    initialDocument: beforeDocument,
    protocolVersion: DevtoolsProtocolVersion.Version1
  };
}
