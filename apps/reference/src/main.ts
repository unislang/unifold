import "@unislang/unifold-theme/tokens.css";
import {
  UnifoldApplicationMountStatus,
  UnifoldSemanticPublicationMode,
  createMachineCommandRegistry,
  defineUnifoldElements,
  mountUnifoldApplication,
  type UnifoldApplicationPort,
  type UnifoldApplicationUpdateResult
} from "@unislang/unifold";
import type { JsonValue } from "@unislang/unifold-contracts";
import {
  UiCommandType,
  UiEventType,
  UiValidationSeverity,
  type UiEvent
} from "@unislang/unifold-events";
import {
  createAsyncValidatorRegistry,
  createStandardSchemaValidator,
  createValidatorRegistry,
  type UiValidationContext
} from "@unislang/unifold-forms";
import { check, forward, looseObject, pipe, string } from "valibot";

import uiDefinition from "./ui.json" with { type: "json" };
import "./reference.css";
import { installStoreFixtureHooks } from "./store-fixture.js";

const host = requireElement<HTMLElement>("app");
const application = requireApplication(mountReference(host));

function mountReference(
  container: HTMLElement,
  semanticPublication = UnifoldSemanticPublicationMode.Automatic
) {
  return mountUnifoldApplication(uiDefinition, container, {
    machineCommands: profileMachineCommands(),
    runtime: {
      asyncValidatorRegistry: profileAsyncValidators(),
      validatorRegistry: profileValidators()
    },
    semanticPublication
  });
}

function profileMachineCommands() {
  const registry = createMachineCommandRegistry();
  registry.register("show-submitted", () => submitLabelCommand("Submitted"));
  registry.register("show-editing", () => submitLabelCommand("Create greeting"));
  return registry;
}

function submitLabelCommand(label: string) {
  return {
    id: "profile-editor::slot:actions::submit",
    properties: { label },
    type: UiCommandType.NodePatchProperties
  } as const;
}

function profileValidators() {
  const registry = createValidatorRegistry();
  registry.register(
    "names-match",
    createStandardSchemaValidator(namesMatchSchema(), {
      affectedIdsByPath: { confirmName: ["profile-editor::confirm-name"] },
      code: "names-match",
      messageKey: "validation.names-match",
      validatorId: "names-match"
    })
  );
  return registry;
}

function profileAsyncValidators() {
  const registry = createAsyncValidatorRegistry();
  registry.register("name-available", { validate: validateNameAvailability });
  return registry;
}

async function validateNameAvailability(context: UiValidationContext, signal: AbortSignal) {
  const unavailable = String(context.value).toLowerCase() === "taken";
  await abortableDelay(unavailable ? 1_000 : 10, signal);
  return unavailable ? [nameUnavailableError(context.node.id)] : [];
}

function nameUnavailableError(id: string) {
  return {
    affectedIds: [id],
    code: "name-unavailable",
    messageKey: "validation.name-unavailable",
    ownerId: id,
    parameters: { message: "This name is unavailable." },
    severity: UiValidationSeverity.Error,
    validatorId: "name-available"
  } as const;
}

function abortableDelay(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, milliseconds);
    signal.addEventListener("abort", () => abortDelay(timer, reject), { once: true });
  });
}

function abortDelay(timer: number, reject: (reason: DOMException) => void): void {
  window.clearTimeout(timer);
  reject(new DOMException("Validation was superseded.", "AbortError"));
}

function namesMatchSchema() {
  return pipe(
    looseObject({ confirmName: string(), name: string() }),
    forward(check(matchesOptionalConfirmation, "Names must match."), ["confirmName"])
  );
}

function matchesOptionalConfirmation(value: { confirmName: string; name: string }): boolean {
  if (value.confirmName.length === 0) return true;
  return value.confirmName === value.name;
}

application.runtime.events$.subscribe(handleRuntimeEvent);
installPrototypeHooks(application);
installStoreFixtureHooks();

function handleRuntimeEvent(event: UiEvent): void {
  writeEvent(event);
  captureRuntimeEvent(event);
  showFormResult(event);
}

function showFormResult(event: UiEvent): void {
  if (event.type !== UiEventType.FormSubmitted && event.type !== UiEventType.FormReset) return;
  requireTestElement("submitted-value").textContent = readSubmittedValue(event.data.change);
}

function captureRuntimeEvent(event: UiEvent): void {
  const target = window as unknown as PrototypeWindow;
  target.__unifoldCapturedEvents?.push(event);
}

function installPrototypeHooks(application: UnifoldApplicationPort): void {
  const target = window as unknown as PrototypeWindow;
  target.__unifoldAuthoredDocument = structuredClone(uiDefinition);
  target.__unifoldDefineElements = defineUnifoldElements;
  target.__unifoldMountRealmCopy = mountRealmCopy;
  target.__unifoldUpdateDocument = (source) => application.update(source);
}

function mountRealmCopy(): RealmCopyResult {
  const container = document.createElement("div");
  document.body.append(container);
  const result = mountReference(container, UnifoldSemanticPublicationMode.Disabled);
  const childCount = container.childElementCount;
  if (result.status === UnifoldApplicationMountStatus.Mounted) result.application.dispose();
  container.remove();
  return { childCount, status: result.status };
}

function writeEvent(event: UiEvent): void {
  requireTestElement("event-log").textContent = JSON.stringify(event, null, 2);
}

function readSubmittedValue(change: JsonValue | undefined): string {
  if (!isRecord(change)) return "";
  const values = change["values"];
  if (!isRecord(values)) return "";
  return stringifyValue(values["name"]);
}

function stringifyValue(value: JsonValue | undefined): string {
  return value === undefined ? "" : String(value);
}

function requireApplication(
  result: ReturnType<typeof mountUnifoldApplication>
): UnifoldApplicationPort {
  if (result.status !== UnifoldApplicationMountStatus.Mounted) {
    throw new Error(`Reference mount failed: ${JSON.stringify(result.diagnostics)}`);
  }
  return result.application;
}

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`Missing reference element: ${id}.`);
  return element as T;
}

function requireTestElement(id: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
  if (element === null) throw new Error(`Missing test element: ${id}.`);
  return element;
}

function isRecord(value: JsonValue | undefined): value is Readonly<Record<string, JsonValue>> {
  if (value === null) return false;
  if (typeof value !== "object") return false;
  return !Array.isArray(value);
}

interface PrototypeWindow {
  __unifoldAuthoredDocument?: unknown;
  __unifoldCapturedEvents?: UiEvent[];
  __unifoldDefineElements?: typeof defineUnifoldElements;
  __unifoldMountRealmCopy?: () => RealmCopyResult;
  __unifoldUpdateDocument?: (source: unknown) => UnifoldApplicationUpdateResult;
}

interface RealmCopyResult {
  readonly childCount: number;
  readonly status: UnifoldApplicationMountStatus;
}
