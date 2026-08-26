import "@unislang/unifold-theme/tokens.css";
import {
  UiCompositionUnmappedMigration,
  ElementDefinitionPolicy,
  UnifoldApplicationMountStatus,
  UnifoldSemanticPublicationMode,
  createMachineCommandRegistry,
  defineUnifoldElements,
  mountUnifoldApplication,
  type UiCompositionVersionMigration,
  type UnifoldApplicationPort,
  type UnifoldApplicationUpdateResult
} from "@unislang/unifold";
import type { JsonValue } from "@unislang/unifold-contracts";
import { UiCommandType, UiEventType, type UiEvent } from "@unislang/unifold-events";

import type {
  ProfileDefinition,
  ProfileDocument,
  ProfileExport,
  ProfileMigrationMode,
  PrototypeWindow,
  RealmCopyResult
} from "./main.types.js";
import * as profileValidation from "./profile-validation.js";
import "./reference.css";
import uiDefinition from "./ui.json" with { type: "json" };
import { installStoreFixtureHooks } from "./store-fixture.js";

const host = requireElement<HTMLElement>("app");
const application = requireApplication(mountReference(host));
void defineReferenceComponentFamilies(uiDefinition)
  .then((families) => families.commitReferenceComponentFamilies(uiDefinition, application))
  .then(() => reportComponentFamiliesReady(application))
  .catch(reportComponentFamilyFailure);
const testHooksEnabled = import.meta.env.MODE === "e2e";
const profileMigrationVersions: Readonly<Record<ProfileMigrationMode, string>> = {
  preserve: "2.0.0",
  reset: "3.0.0",
  unreviewed: "4.0.0"
};

async function defineReferenceComponentFamilies(document: typeof uiDefinition) {
  const families = await import("./reference-component-families.js");
  await families.defineReferenceComponentFamilies(document);
  return families;
}

function reportComponentFamilyFailure(error: unknown): void {
  document.documentElement.dataset["unifoldReadiness"] = "failed";
  window.setTimeout(() => {
    throw error instanceof Error ? error : new Error("Component family registration failed.");
  });
}

function reportComponentFamiliesReady(application: UnifoldApplicationPort): void {
  refreshPrototypeDocument(application);
  resetPrototypeEventCapture();
  document.documentElement.dataset["unifoldReadiness"] = "ready";
}

function resetPrototypeEventCapture(): void {
  if (!testHooksEnabled) return;
  const target = window as unknown as PrototypeWindow;
  target.__unifoldCapturedEvents = [];
}

function mountReference(
  container: HTMLElement,
  semanticPublication = UnifoldSemanticPublicationMode.Automatic
) {
  return mountUnifoldApplication(uiDefinition, container, {
    compositionMigrations: profileCompositionMigrations(),
    elementDefinitionPolicy: ElementDefinitionPolicy.AllowPending,
    machineCommands: profileMachineCommands(),
    runtime: {
      asyncValidatorRegistry: profileValidation.profileAsyncValidators(),
      validatorRegistry: profileValidation.profileValidators()
    },
    semanticPublication
  });
}

function profileCompositionMigrations(): readonly UiCompositionVersionMigration[] {
  return [profileCompositionMigration("2.0.0", true), profileCompositionMigration("3.0.0", false)];
}

function profileCompositionMigration(
  version: string,
  preserve: boolean
): UiCompositionVersionMigration {
  return {
    from: { name: "ProfileEditor", version: "1.0.0" },
    preserve: preserve ? [{ source: "name", target: "fullName" }] : [],
    to: { name: "ProfileEditor", version },
    unmapped: UiCompositionUnmappedMigration.Reset
  };
}

function profileMachineCommands() {
  const registry = createMachineCommandRegistry();
  registry.register("show-submitted", () => submitLabelCommand("Submitted"));
  registry.register("show-editing", () => submitLabelCommand("Create greeting"));
  registry.register("show-layout-details", () => ({
    id: "layout-status",
    properties: { content: "Details open" },
    type: UiCommandType.NodePatchProperties
  }));
  return registry;
}

function submitLabelCommand(label: string) {
  return {
    id: "profile-editor::slot:actions::submit",
    properties: { label },
    type: UiCommandType.NodePatchProperties
  } as const;
}

application.runtime.events$.subscribe(handleRuntimeEvent);
if (testHooksEnabled) {
  installPrototypeHooks(application);
  installStoreFixtureHooks();
}

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
  if (!testHooksEnabled) return;
  const target = window as unknown as PrototypeWindow;
  target.__unifoldCapturedEvents?.push(event);
}

function installPrototypeHooks(application: UnifoldApplicationPort): void {
  const target = window as unknown as PrototypeWindow;
  refreshPrototypeDocument(application);
  target.__unifoldDefineElements = defineUnifoldElements;
  target.__unifoldMigrateProfile = (mode) => migrateProfile(application, mode);
  target.__unifoldMountRealmCopy = mountRealmCopy;
  target.__unifoldUpdateDocument = (source) => application.update(source);
}

function refreshPrototypeDocument(application: UnifoldApplicationPort): void {
  if (!testHooksEnabled) return;
  const target = window as unknown as PrototypeWindow;
  target.__unifoldAuthoredDocument = application.authored;
}

function migrateProfile(
  application: UnifoldApplicationPort,
  mode: ProfileMigrationMode
): UnifoldApplicationUpdateResult {
  const source = structuredClone(uiDefinition) as unknown as ProfileDocument;
  const version = profileMigrationVersions[mode];
  source.revision = `migration-${mode}`;
  source.view.$version = version;
  updateProfileDefinition(source.compositions[0], version);
  source.semantics.entities[0].properties.name.exportName = "fullName";
  return application.update(source);
}

function updateProfileDefinition(definition: ProfileDefinition, version: string): void {
  definition.version = version;
  const field = definition.template.$children[0].$children.find(({ id }) => id === "name");
  if (field === undefined) throw new Error("Profile name definition is missing.");
  field.id = "full-name";
  field.label = "Full name";
  field.value = "Successor default";
  const selection = requireProfileExport(definition.exports, "name");
  definition.exports["fullName"] = { ...selection, localId: "full-name" };
  Reflect.deleteProperty(definition.exports, "name");
  requireProfileExport(definition.exports, "setName").localId = "full-name";
}

function requireProfileExport(exports: Record<string, ProfileExport>, name: string): ProfileExport {
  const descriptor = exports[name];
  if (descriptor === undefined) throw new Error(`Profile export is missing: ${name}.`);
  return descriptor;
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
