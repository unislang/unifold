import { CoreComponentType } from "@unislang/unifold-contracts";
import { UiNodeKind, UiUpdateTrigger } from "@unislang/unifold-contracts";
import {
  DataClassification,
  UiControlStatus,
  type UiControlState,
  type UiEvent,
  type UiNodeBaseState,
  type UiNodeSnapshot
} from "@unislang/unifold-events";
import type { UnifoldFileInput } from "@unislang/unifold-elements";
import { defineUnifoldFileInput } from "@unislang/unifold-elements/file-input";

import { percentile } from "./profile-statistics.js";

const FILE_COUNT = 32;
const PROFILE_SAMPLES = 50;
const SELECTION_P95_LIMIT_MILLISECONDS = 100;
const PRIVATE_MARKER = "file-bytes-must-stay-ephemeral";

export async function measureFileInputSelection() {
  defineUnifoldFileInput(customElements);
  const element = document.createElement("unifold-file-input") as UnifoldFileInput;
  element.eventNode = fileInputSnapshot();
  element.accept = "application/pdf";
  element.maximumFileBytes = 1_024;
  element.multiple = true;
  document.body.append(element);
  await element.updateComplete;
  try {
    return await runSelectionProfile(element);
  } finally {
    element.remove();
  }
}

async function runSelectionProfile(element: UnifoldFileInput) {
  const samples: number[] = [];
  const files = representativeFiles();
  let lastEvent: UiEvent | undefined;
  element.addEventListener("unifold-event", (event) => {
    lastEvent = (event as CustomEvent<UiEvent>).detail;
  });
  for (let sample = 0; sample < PROFILE_SAMPLES; sample += 1) {
    const started = performance.now();
    selectFiles(element, files);
    await element.updateComplete;
    samples.push(performance.now() - started);
  }
  return selectionEvidence(samples, element, lastEvent);
}

function selectionEvidence(
  samples: readonly number[],
  element: UnifoldFileInput,
  lastEvent: UiEvent | undefined
) {
  const p95Milliseconds = percentile(samples, 0.95);
  const bytesIsolated = !JSON.stringify(lastEvent).includes(PRIVATE_MARKER);
  const selectedFileCount = element.value.length;
  const retainedHandleCount = element.value.filter(
    ({ id }) => element.resolveSelectedFile(id) !== undefined
  ).length;
  const gate = selectionGate(
    bytesIsolated,
    selectedFileCount,
    retainedHandleCount,
    p95Milliseconds
  );
  return {
    bytesIsolated,
    fileCount: FILE_COUNT,
    gate,
    maximumMilliseconds: Math.max(...samples),
    p50Milliseconds: percentile(samples, 0.5),
    p95Milliseconds,
    p99Milliseconds: percentile(samples, 0.99),
    retainedHandleCount,
    sampleCount: samples.length,
    selectedFileCount
  };
}

function selectionGate(
  bytesIsolated: boolean,
  selectedFileCount: number,
  retainedHandleCount: number,
  p95Milliseconds: number
) {
  const passed = [
    bytesIsolated,
    selectedFileCount === FILE_COUNT,
    retainedHandleCount === FILE_COUNT,
    p95Milliseconds <= SELECTION_P95_LIMIT_MILLISECONDS
  ].every(Boolean);
  return {
    actualFileCount: selectedFileCount,
    actualP95Milliseconds: p95Milliseconds,
    bytesIsolated,
    limitP95Milliseconds: SELECTION_P95_LIMIT_MILLISECONDS,
    name: "32-file metadata-only selection",
    passed
  };
}

function selectFiles(element: UnifoldFileInput, files: readonly File[]): void {
  const input = element.shadowRoot?.querySelector("input");
  if (!(input instanceof HTMLInputElement)) throw new Error("FileInput native input is missing.");
  Object.defineProperty(input, "files", { configurable: true, value: files });
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function representativeFiles(): readonly File[] {
  return Array.from(
    { length: FILE_COUNT },
    (_, index) =>
      new File([PRIVATE_MARKER], `evidence-${String(index).padStart(2, "0")}.pdf`, {
        lastModified: 1_700_000_000_000 + index,
        type: "application/pdf"
      })
  );
}

function fileInputSnapshot(): UiNodeSnapshot {
  return {
    attributes: {},
    base: baseState(),
    control: controlState(),
    definitionVersion: "1.0.0",
    id: "file-input-profile",
    instanceId: "file-input-profile",
    kind: UiNodeKind.Control,
    properties: { updateOn: UiUpdateTrigger.Input, value: [] },
    revision: 0,
    scopePath: ["file-input-profile"],
    type: CoreComponentType.FileInput
  };
}

function baseState(): UiNodeBaseState {
  return {
    busy: false,
    dataClassification: DataClassification.Public,
    disabled: false,
    focused: false,
    interactive: true,
    mounted: true,
    readonly: false,
    visible: true
  };
}

function controlState(): UiControlState<readonly []> {
  return {
    asyncValidatorIds: [],
    dirty: false,
    errors: [],
    initialValue: [],
    pending: false,
    pristine: true,
    rawValue: [],
    required: false,
    status: UiControlStatus.Valid,
    touched: false,
    updateOn: UiUpdateTrigger.Input,
    validationRequestId: null,
    validatorIds: [],
    value: []
  };
}
