import "@unislang/unifold-theme/tokens.css";
import {
  ElementDefinitionPolicy,
  UnifoldApplicationMountStatus,
  UnifoldSemanticPublicationMode,
  defineUnifoldElements,
  mountUnifoldApplication,
  type UnifoldApplicationPort,
  type UnifoldApplicationUpdateResult
} from "@unislang/unifold";
import type { JsonObject } from "@unislang/unifold-contracts";

import type {
  ProfileDefinition,
  ProfileDocument,
  ProfileExport,
  ProfileMigrationMode,
  PrototypeWindow,
  RealmCopyResult
} from "./main.types.js";
import "./reference.css";

type ReferenceUiDefinition = JsonObject & ProfileDocument;

interface ReferenceModuleDocument {
  readonly definition: ReferenceUiDefinition;
  readonly integrity: string;
}

let uiDefinition: ReferenceUiDefinition;
let application: UnifoldApplicationPort;
let profileValidation: typeof import("./profile-validation.js");
let runtimeOptions: typeof import("./reference-runtime-options.js");
const testHooksEnabled = import.meta.env.MODE === "e2e";
const profileMigrationVersions: Readonly<Record<ProfileMigrationMode, string>> = {
  preserve: "2.0.0",
  reset: "3.0.0",
  unreviewed: "4.0.0"
};

void Promise.all([
  loadReferenceDocument(),
  import("./profile-validation.js"),
  import("./reference-runtime-options.js")
])
  .then(startReference)
  .catch(reportComponentFamilyFailure);

function startReference(
  loaded: readonly [
    ReferenceModuleDocument,
    typeof import("./profile-validation.js"),
    typeof import("./reference-runtime-options.js")
  ]
): void {
  const [source, validation, options] = loaded;
  uiDefinition = source.definition;
  profileValidation = validation;
  runtimeOptions = options;
  const host = requireElement<HTMLElement>("app");
  application = requireApplication(mountReference(host));
  if (testHooksEnabled) {
    document.documentElement.dataset["unifoldModuleIntegrity"] = source.integrity;
  }
  void Promise.all([
    installReferenceTestHooks(application),
    synchronizeReferenceComponentFamilies(application),
    installReferenceEventOutput(application),
    installReferenceStateAuthorityOracle(application)
  ])
    .then(([, , resetEventCapture]) => {
      if (testHooksEnabled) resetEventCapture();
      reportComponentFamiliesReady(application);
    })
    .catch(reportComponentFamilyFailure);
}

async function installReferenceTestHooks(application: UnifoldApplicationPort): Promise<void> {
  if (!testHooksEnabled) return;
  const [, , atomicity] = await Promise.all([
    import("./collection-fixture.js"),
    import("./store-fixture.js"),
    import("./reference-update-atomicity.js")
  ]);
  installPrototypeHooks(application);
  const target = window as unknown as PrototypeWindow;
  target.__unifoldProbeAtomicUpdate = atomicity.createReferenceAtomicUpdateProbe(
    application,
    () => target.__unifoldCapturedEvents
  );
}

async function installReferenceStateAuthorityOracle(
  application: UnifoldApplicationPort
): Promise<void> {
  if (!testHooksEnabled) return;
  const module = await import("./reference-state-authority.js");
  const oracle = module.createReferenceStateAuthorityOracle(application);
  const target = window as unknown as PrototypeWindow;
  target.__unifoldBeginStateAuthorityTrace = () => oracle.begin();
  target.__unifoldReadStateAuthorityTrace = () => oracle.read();
}

async function synchronizeReferenceComponentFamilies(
  application: UnifoldApplicationPort
): Promise<void> {
  const families = await defineReferenceComponentFamilies(uiDefinition);
  families.commitReferenceComponentFamilies(uiDefinition, application);
}

async function installReferenceEventOutput(
  application: UnifoldApplicationPort
): Promise<() => void> {
  const output = await import("./reference-event-output.js");
  output.installReferenceEventOutput(application, testHooksEnabled);
  return output.resetReferenceEventCapture;
}

async function loadReferenceDocument(): Promise<ReferenceModuleDocument> {
  const modules = await import("./module-reference.js");
  const artifact = await modules.resolveProductionReferenceArtifact();
  return {
    definition: artifact.composedDocument as unknown as ReferenceUiDefinition,
    integrity: artifact.integrity
  };
}

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
  document.documentElement.dataset["unifoldReadiness"] = "ready";
}

function mountReference(
  container: HTMLElement,
  semanticPublication = UnifoldSemanticPublicationMode.Automatic
) {
  return mountUnifoldApplication(uiDefinition, container, {
    compositionMigrations: runtimeOptions.referenceCompositionMigrations(),
    elementDefinitionPolicy: ElementDefinitionPolicy.AllowPending,
    machineCommands: runtimeOptions.referenceMachineCommands(),
    runtime: {
      asyncValidatorRegistry: profileValidation.profileAsyncValidators(),
      validatorRegistry: profileValidation.profileValidators()
    },
    semanticPublication
  });
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
