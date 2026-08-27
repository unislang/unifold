import type { UnifoldApplicationPort, UnifoldApplicationUpdateResult } from "@unislang/unifold";
import type { UiEvent } from "@unislang/unifold-events";

const FIELD_ID = "profile-editor::name";
const STABLE_ID = "profile-editor::slot:actions::submit";
const SEMANTIC_ID = "urn:unifold:person:current";

export enum ReferenceAtomicFailure {
  Renderer = "renderer",
  Semantics = "semantics"
}

export function createReferenceAtomicUpdateProbe(
  application: UnifoldApplicationPort,
  capturedEvents: () => UiEvent[] | undefined
) {
  return (failure: ReferenceAtomicFailure) =>
    probeAtomicUpdate(application, requireEvents(capturedEvents()), failure);
}

function probeAtomicUpdate(
  application: UnifoldApplicationPort,
  events: UiEvent[],
  failure: ReferenceAtomicFailure
): ReferenceAtomicUpdateObservation {
  const source = revisedDocument(application.authored, failure);
  const field = requireElement(FIELD_ID);
  const stable = requireElement(STABLE_ID);
  const input = requireInput(field);
  const baselineSequence = events.at(-1)?.sequence ?? 0;
  const baselineRevision = application.runtime.revision;
  const baselineSemantic = semanticObservation();
  installFailure(failure, field);
  const rejected = application.update(source);
  const failedEvents = events.filter(({ sequence }) => sequence > baselineSequence);
  const failedState = stateObservation(field, input, stable, application.runtime.revision);
  assertSemanticRollback(baselineSemantic);
  const retry = retryWithObservation(application, source, events, baselineSequence);
  return {
    baselineRevision,
    baselineSemantic,
    baselineSequence,
    failedEvents,
    failedState,
    rejected,
    ...retry
  };
}

function revisedDocument(authored: unknown, failure: ReferenceAtomicFailure): AtomicDocument {
  const source = structuredClone(authored) as AtomicDocument;
  source.revision = `atomic-${failure}`;
  source.view.parameters.fieldLabel = "Atomic full name";
  source.semantics.entities[0].type = "Organization";
  return source;
}

function retryWithObservation(
  application: UnifoldApplicationPort,
  source: AtomicDocument,
  events: UiEvent[],
  baselineSequence: number
): RetryObservation {
  let commitObservation: CommitObservation | undefined;
  const originalPush = events.push;
  events.push = (...items) => {
    const structure = items.find(isStructureFact);
    if (commitObservation === undefined && structure !== undefined) {
      commitObservation = currentCommitObservation(structure.staterevision);
    }
    return originalPush.apply(events, items);
  };
  const applied = updateAndRestorePush(application, source, events, originalPush);
  const retryEvents = events.filter(({ sequence }) => sequence > baselineSequence);
  return retryObservation(applied, commitObservation, retryEvents);
}

function updateAndRestorePush(
  application: UnifoldApplicationPort,
  source: AtomicDocument,
  events: UiEvent[],
  originalPush: typeof events.push
): UnifoldApplicationUpdateResult {
  try {
    return application.update(source);
  } finally {
    events.push = originalPush;
  }
}

function retryObservation(
  applied: UnifoldApplicationUpdateResult,
  commitObservation: CommitObservation | undefined,
  retryEvents: readonly UiEvent[]
): RetryObservation {
  const field = requireElement(FIELD_ID);
  return {
    applied,
    appliedState: stateObservation(
      field,
      requireInput(field),
      requireElement(STABLE_ID),
      applied.revision
    ),
    commitObservation,
    retryCommandTypes: retryEvents.flatMap(commandType),
    retryRevisions: retryEvents.map(({ staterevision }) => staterevision),
    retrySequences: retryEvents.map(({ sequence }) => sequence),
    retryTypes: retryEvents.map(({ type }) => type)
  };
}

function installFailure(failure: ReferenceAtomicFailure, field: HTMLElement): void {
  if (failure === ReferenceAtomicFailure.Renderer) failNextPropertyWrite(field, "label");
  else failNextSemanticReplacement();
}

function failNextPropertyWrite(host: HTMLElement, property: string): void {
  const descriptor = inheritedDescriptor(host, property);
  Object.defineProperty(host, property, {
    configurable: true,
    get: () => descriptor?.get?.call(host),
    set() {
      Reflect.deleteProperty(host, property);
      throw new Error("Injected renderer failure.");
    }
  });
}

function inheritedDescriptor(host: HTMLElement, property: string): PropertyDescriptor | undefined {
  let prototype = Object.getPrototypeOf(host) as object | null;
  while (prototype !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, property);
    if (descriptor !== undefined) return descriptor;
    prototype = Object.getPrototypeOf(prototype) as object | null;
  }
  return undefined;
}

function failNextSemanticReplacement(): void {
  const script = semanticScript();
  Object.defineProperty(script, "replaceWith", {
    configurable: true,
    value() {
      Reflect.deleteProperty(script, "replaceWith");
      throw new Error("Injected semantic failure.");
    }
  });
}

function stateObservation(
  field: HTMLElement,
  input: HTMLInputElement,
  stable: HTMLElement,
  revision: number
): StateObservation {
  const semantic = semanticObservation();
  return {
    fieldLabel: String(Reflect.get(field, "label")),
    focused: field.shadowRoot?.activeElement === input,
    sameField: requireElement(FIELD_ID) === field,
    sameInput: requireInput(field) === input,
    sameStable: requireElement(STABLE_ID) === stable,
    revision,
    semantic,
    semanticType: semanticType(semantic),
    stableRenderCount: stable.dataset["unifoldRenderCount"],
    value: input.value
  };
}

function currentCommitObservation(revision: number): CommitObservation {
  const semantic = semanticObservation();
  return {
    fieldLabel: String(Reflect.get(requireElement(FIELD_ID), "label")),
    revision,
    semantic,
    semanticType: semanticType(semantic)
  };
}

function semanticType(observation: SemanticObservation): string | undefined {
  const graph = JSON.parse(observation.serialized) as SemanticGraph;
  return semanticEntityType(graph["@graph"]);
}

function semanticObservation(): SemanticObservation {
  const scripts = [
    ...document.querySelectorAll<HTMLScriptElement>("script[data-unifold-semantics]")
  ];
  const script = scripts[0];
  if (script === undefined || script.textContent === null) {
    throw new Error("Missing semantic publication.");
  }
  return {
    count: scripts.length,
    owner: script.dataset["unifoldSemantics"],
    serialized: script.textContent
  };
}

function semanticEntityType(entities: SemanticGraph["@graph"]): string | undefined {
  for (const entity of entities) {
    if (entity["@id"] === SEMANTIC_ID) return entity["@type"];
  }
  return undefined;
}

function semanticScript(): HTMLScriptElement {
  const script = document.querySelector<HTMLScriptElement>("script[data-unifold-semantics]");
  if (script === null) throw new Error("Missing semantic publication.");
  return script;
}

function assertSemanticRollback(expected: SemanticObservation): void {
  if (JSON.stringify(semanticObservation()) !== JSON.stringify(expected)) {
    throw new Error("Semantic rollback failed.");
  }
}

function requireElement(id: string): HTMLElement {
  const element = findElement(document, id);
  if (element === null) throw new Error(`Missing node host: ${id}.`);
  return element;
}

function findElement(root: ParentNode, id: string): HTMLElement | null {
  const direct = root.querySelector<HTMLElement>(`[data-unifold-node-id="${id}"]`);
  return direct ?? findElementInShadowRoots(root, id);
}

function findElementInShadowRoots(root: ParentNode, id: string): HTMLElement | null {
  for (const element of root.querySelectorAll<HTMLElement>("*")) {
    const found = findElementInShadow(element, id);
    if (found !== null) return found;
  }
  return null;
}

function findElementInShadow(element: HTMLElement, id: string): HTMLElement | null {
  return element.shadowRoot === null ? null : findElement(element.shadowRoot, id);
}

function requireInput(host: HTMLElement): HTMLInputElement {
  const control = host.shadowRoot?.querySelector("input");
  if (!(control instanceof HTMLInputElement)) throw new Error("Missing field input.");
  return control;
}

function requireEvents(events: UiEvent[] | undefined): UiEvent[] {
  if (events === undefined) throw new Error("Missing event capture.");
  return events;
}

function isStructureFact(event: UiEvent): boolean {
  return commandType(event).length > 0;
}

function commandType(event: UiEvent): readonly string[] {
  const change = event.data.change;
  if (!isRecord(change)) return [];
  const type = Reflect.get(change, "commandType");
  return type === "structure.reconcile" ? [type] : [];
}

function isRecord(value: unknown): value is object {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

interface AtomicDocument {
  revision: string;
  readonly semantics: { readonly entities: [{ type: string }] };
  readonly view: { readonly parameters: { fieldLabel: string } };
}

interface SemanticGraph {
  readonly "@graph": readonly { readonly "@id": string; readonly "@type"?: string }[];
}

interface CommitObservation {
  readonly fieldLabel: string;
  readonly revision: number;
  readonly semantic: SemanticObservation;
  readonly semanticType: string | undefined;
}

interface StateObservation extends CommitObservation {
  readonly focused: boolean;
  readonly sameField: boolean;
  readonly sameInput: boolean;
  readonly sameStable: boolean;
  readonly stableRenderCount: string | undefined;
  readonly value: string;
}

interface RetryObservation {
  readonly applied: UnifoldApplicationUpdateResult;
  readonly appliedState: StateObservation;
  readonly commitObservation: CommitObservation | undefined;
  readonly retryCommandTypes: readonly string[];
  readonly retryRevisions: readonly number[];
  readonly retrySequences: readonly number[];
  readonly retryTypes: readonly string[];
}

interface ReferenceAtomicUpdateObservation extends RetryObservation {
  readonly baselineRevision: number;
  readonly baselineSemantic: SemanticObservation;
  readonly baselineSequence: number;
  readonly failedEvents: readonly UiEvent[];
  readonly failedState: StateObservation;
  readonly rejected: UnifoldApplicationUpdateResult;
}

interface SemanticObservation {
  readonly count: number;
  readonly owner: string | undefined;
  readonly serialized: string;
}
