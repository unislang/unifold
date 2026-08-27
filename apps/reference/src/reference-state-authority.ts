import {
  UiEventPhase,
  UiEventType,
  type UiEvent,
  type UiNodeSnapshot
} from "@unislang/unifold-events";
import type { UnifoldApplicationPort } from "@unislang/unifold";

const componentId = "profile-editor::name";
const formId = "profile-editor::form";
const compositionId = "profile-editor";
const machineId = "profile-workflow";
const valuePath = `/nodes/${componentId}/control/value`;

interface SelectionPort {
  dispose(): void;
  get(): unknown;
  subscribe(listener: () => void): () => void;
}

interface TraceSelections {
  readonly component: SelectionPort;
  readonly composition: SelectionPort;
  readonly form: SelectionPort;
}

interface TraceNotifications {
  component: number;
  composition: number;
  form: number;
}

interface TraceState {
  readonly applicationEvents: UiEvent[];
  readonly componentEvents: UiEvent[];
  readonly compositionEvents: UiEvent[];
  dispose(): void;
  readonly formEvents: UiEvent[];
  readonly notifications: TraceNotifications;
  readonly revisionBefore: number;
  readonly selections: TraceSelections;
}

export interface ReferenceStateAuthorityObservation {
  readonly applicationRevision: number;
  readonly causalEventIds: readonly string[];
  readonly componentNotifications: number;
  readonly componentValue: unknown;
  readonly compositionNotifications: number;
  readonly compositionValue: unknown;
  readonly formNotifications: number;
  readonly formValue: unknown;
  readonly machineState: unknown;
  readonly machineTransactionCount: number;
  readonly revisionBefore: number;
  readonly valueWriteCount: number;
  readonly viewsShareEventIdentity: boolean;
}

export interface ReferenceStateAuthorityOracle {
  begin(): void;
  dispose(): void;
  read(): ReferenceStateAuthorityObservation;
}

export function createReferenceStateAuthorityOracle(
  application: UnifoldApplicationPort
): ReferenceStateAuthorityOracle {
  let trace: TraceState | undefined;
  return {
    begin: () => {
      trace?.dispose();
      trace = createTrace(application);
    },
    dispose: () => trace?.dispose(),
    read: () => observe(application, requireTrace(trace))
  };
}

function createTrace(application: UnifoldApplicationPort): TraceState {
  const selections = createSelections(application);
  const state = emptyTrace(application, selections);
  const eventDisposers = subscribeEvents(application, state);
  const selectionDisposers = subscribeSelections(selections, state.notifications);
  return {
    ...state,
    dispose: () => disposeTrace(eventDisposers, selectionDisposers, selections)
  };
}

function emptyTrace(
  application: UnifoldApplicationPort,
  selections: TraceSelections
): Omit<TraceState, "dispose"> {
  return {
    applicationEvents: [],
    componentEvents: [],
    compositionEvents: [],
    formEvents: [],
    notifications: { component: 0, composition: 0, form: 0 },
    revisionBefore: application.runtime.revision,
    selections
  };
}

function createSelections(application: UnifoldApplicationPort): TraceSelections {
  return {
    component: application.runtime.node(componentId).select(controlValue),
    composition: application.runtime.composition(compositionId).selection("name"),
    form: application.runtime.scope(formId).select(formNameValue)
  };
}

function subscribeEvents(application: UnifoldApplicationPort, state: Omit<TraceState, "dispose">) {
  return [
    application.runtime.events$.subscribe((event) => state.applicationEvents.push(event)),
    application.runtime
      .node(componentId)
      .events$.subscribe((event) => state.componentEvents.push(event)),
    application.runtime
      .composition(compositionId)
      .events$.subscribe((event) => state.compositionEvents.push(event)),
    application.runtime.scope(formId).events$.subscribe((event) => state.formEvents.push(event))
  ];
}

function subscribeSelections(selections: TraceSelections, notifications: TraceNotifications) {
  return [
    selections.component.subscribe(() => (notifications.component += 1)),
    selections.composition.subscribe(() => (notifications.composition += 1)),
    selections.form.subscribe(() => (notifications.form += 1))
  ];
}

function disposeTrace(
  eventDisposers: readonly { unsubscribe(): void }[],
  selectionDisposers: readonly (() => void)[],
  selections: TraceSelections
): void {
  eventDisposers.forEach((subscription) => subscription.unsubscribe());
  selectionDisposers.forEach((dispose) => dispose());
  Object.values(selections).forEach((selection) => selection.dispose());
}

function observe(
  application: UnifoldApplicationPort,
  trace: TraceState
): ReferenceStateAuthorityObservation {
  const intent = requireInputIntent(trace.applicationEvents);
  const transactionId = intent.transactionid;
  return {
    applicationRevision: application.runtime.revision,
    causalEventIds: causalEvents(trace.applicationEvents, transactionId).map(({ id }) => id),
    componentNotifications: trace.notifications.component,
    componentValue: trace.selections.component.get(),
    compositionNotifications: trace.notifications.composition,
    compositionValue: trace.selections.composition.get(),
    formNotifications: trace.notifications.form,
    formValue: trace.selections.form.get(),
    machineState: application.machineState(machineId),
    machineTransactionCount: machineTransactionCount(trace.applicationEvents, intent),
    revisionBefore: trace.revisionBefore,
    valueWriteCount: valueWriteCount(trace.applicationEvents, transactionId),
    viewsShareEventIdentity: shareCausalEventIdentity(transactionId, [
      trace.applicationEvents,
      trace.componentEvents,
      trace.compositionEvents,
      trace.formEvents
    ])
  };
}

export function shareCausalEventIdentity(
  transactionId: string,
  views: readonly (readonly UiEvent[])[]
): boolean {
  const [first, ...remaining] = views.map((events) => causalEvents(events, transactionId));
  if (first === undefined) return false;
  return remaining.every(
    (events) =>
      events.length === first.length && events.every((event, index) => event === first[index])
  );
}

function causalEvents(events: readonly UiEvent[], transactionId: string): readonly UiEvent[] {
  return events.filter((event) => event.transactionid === transactionId);
}

function valueWriteCount(events: readonly UiEvent[], transactionId: string): number {
  return causalEvents(events, transactionId).filter(
    (event) =>
      event.type === UiEventType.TransactionCommitted && changedPaths(event).includes(valuePath)
  ).length;
}

function machineTransactionCount(events: readonly UiEvent[], intent: UiEvent): number {
  return events.filter(
    (event) =>
      event.causationid === intent.id &&
      event.transactionid !== intent.transactionid &&
      event.type === UiEventType.TransactionCommitted
  ).length;
}

function changedPaths(event: UiEvent): readonly unknown[] {
  const change = event.data.change;
  if (!isRecord(change)) return [];
  const paths = change["changedPaths"];
  return Array.isArray(paths) ? paths : [];
}

function requireInputIntent(events: readonly UiEvent[]): UiEvent {
  const event = events.find(
    ({ data }) => data.phase === UiEventPhase.Intent && data.sourceNode?.id === componentId
  );
  if (event === undefined) throw new Error("The reference input intent is unavailable.");
  return event;
}

function requireTrace(trace: TraceState | undefined): TraceState {
  if (trace === undefined) throw new Error("The reference authority trace has not started.");
  return trace;
}

function controlValue(snapshot: UiNodeSnapshot): unknown {
  return snapshot.control?.value;
}

function formNameValue(snapshot: UiNodeSnapshot): unknown {
  const value = snapshot.control?.value;
  return isRecord(value) ? value["name"] : undefined;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object") return false;
  return !Array.isArray(value);
}
