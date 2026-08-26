import "@unislang/unifold-theme/tokens.css";
import {
  ElementRegistrationStatus,
  UnifoldApplicationMountStatus,
  defineUnifoldElements,
  mountUnifoldApplication,
  type UnifoldApplicationPort
} from "@unislang/unifold";
import { UiNodeKind, UiUpdateTrigger } from "@unislang/unifold-contracts";
import {
  DataClassification,
  UiControlStatus,
  type UiEvent,
  type UiNodeSnapshot
} from "@unislang/unifold-events";

import uiDefinition from "./ui.json";

export enum HostFramework {
  Plain = "plain",
  React = "react",
  Svelte = "svelte",
  Vue = "vue"
}

interface HostEvidence {
  readonly application: UnifoldApplicationPort;
  readonly events: UiEvent[];
  readonly framework: HostFramework;
  readonly probeEvents: UiEvent[];
  disposed: boolean;
  mountCount: number;
}

export const probeRuntimeContext = Object.freeze({ documentId: "host-parity-probe" });

export const probeSnapshot: UiNodeSnapshot = Object.freeze({
  attributes: {},
  base: {
    busy: false,
    dataClassification: DataClassification.Public,
    disabled: false,
    focused: false,
    interactive: true,
    mounted: true,
    readonly: false,
    visible: true
  },
  control: {
    asyncValidatorIds: [],
    dirty: false,
    errors: [],
    initialValue: "Host value",
    pending: false,
    pristine: true,
    rawValue: "Host value",
    required: false,
    status: UiControlStatus.Valid,
    touched: false,
    updateOn: UiUpdateTrigger.Input,
    validationRequestId: null,
    validatorIds: [],
    value: "Host value"
  },
  definitionVersion: "1.0.0",
  id: "framework-probe",
  instanceId: "framework-probe",
  kind: UiNodeKind.Control,
  properties: { label: "Framework probe", value: "Host value" },
  revision: 0,
  scopePath: ["framework-probe"],
  type: "TextField"
});

export function registerHostElements(): void {
  const registration = defineUnifoldElements();
  if (registration.status === ElementRegistrationStatus.Registered) return;
  throw new Error(`Host element registration failed: ${JSON.stringify(registration.diagnostics)}`);
}

export function recordProbeEvent(event: Event): void {
  const evidence = window.__unifoldHostEvidence;
  if (evidence === undefined) throw new Error("Host evidence is missing for the probe event.");
  evidence.probeEvents.push((event as CustomEvent<UiEvent>).detail);
}

export function mountHost(framework: HostFramework, container: HTMLElement): () => void {
  const result = mountUnifoldApplication(uiDefinition, container);
  if (result.status !== UnifoldApplicationMountStatus.Mounted) {
    throw new Error(`Host mount failed: ${JSON.stringify(result.diagnostics)}`);
  }
  const evidence: HostEvidence = {
    application: result.application,
    disposed: false,
    events: [],
    framework,
    mountCount: 1,
    probeEvents: []
  };
  const subscription = result.application.runtime.events$.subscribe((event) => {
    evidence.events.push(event);
  });
  window.__unifoldHostEvidence = evidence;
  return () => disposeHost(evidence, subscription);
}

export function requireRoot(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`Host root is missing: ${id}.`);
  return element;
}

function disposeHost(evidence: HostEvidence, subscription: { unsubscribe(): void }): void {
  if (evidence.disposed) return;
  subscription.unsubscribe();
  evidence.application.dispose();
  evidence.disposed = true;
}

declare global {
  interface Window {
    __unifoldHostEvidence?: HostEvidence;
    __unifoldUnmountHost?(): Promise<void> | void;
  }
}
