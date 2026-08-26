// @vitest-environment happy-dom
import { expect, it } from "vitest";
import {
  CatalogBindingKind,
  CoreCatalogMajor,
  CoreComponentType,
  CoreElementTag,
  coreCatalog,
  type ComponentDescriptor
} from "@unislang/unifold-catalog";
import type { JsonObject } from "@unislang/unifold-contracts";
import type { UiEvent, UiNodeSnapshot } from "@unislang/unifold-events";

import {
  ElementDefinitionPolicy,
  ElementRegistrationDiagnosticCode,
  ElementRegistrationStatus,
  ElementEventType,
  defineUnifoldElements,
  registerCoreElements,
  validateUnifoldElementTags
} from "./index.js";
import {
  UNIFOLD_ELEMENT_DEFINITION,
  readElementDefinition,
  type ElementDefinitionMetadata,
  type ElementRegistryPort
} from "./register.js";
import { componentNode } from "./elements.test-data.js";
import { defineUnifoldBreadcrumb } from "./breadcrumb-entry.js";
import { defineUnifoldAuditLog } from "./audit-log-entry.js";
import { defineUnifoldCombobox } from "./combobox-entry.js";
import { defineUnifoldDataGrid } from "./data-grid-entry.js";
import { defineUnifoldDialog } from "./dialog-entry.js";
import { defineUnifoldFileInput } from "./file-input-entry.js";
import { defineUnifoldMasterDetail } from "./master-detail-entry.js";
import { defineUnifoldMenuButton } from "./menu-button-entry.js";
import { defineUnifoldPopover } from "./popover-entry.js";
import { defineUnifoldSearchResults } from "./search-results-entry.js";
import { defineUnifoldStepper } from "./stepper-entry.js";
import { defineUnifoldTabs } from "./tabs-entry.js";
import { defineUnifoldTooltip } from "./tooltip-entry.js";
import { defineUnifoldVirtualList } from "./virtual-list-entry.js";
import { defineUnifoldWizard } from "./wizard-entry.js";

it("registers the core elements explicitly and idempotently", () => {
  const first = defineUnifoldElements(customElements);
  const second = defineUnifoldElements(customElements);

  expect(first.status).toBe(ElementRegistrationStatus.Registered);
  expect(second).toMatchObject({ definedTags: [], status: ElementRegistrationStatus.Registered });
  foundationTags().forEach((tagName) => {
    expect(customElements.get(tagName)).toBeDefined();
  });
  expect(customElements.get(CoreElementTag.Tooltip)).toBeUndefined();
});

it("keeps the deprecated registration alias behavior-compatible", () => {
  expect(registerCoreElements(new TestRegistry()).status).toBe(
    ElementRegistrationStatus.Registered
  );
});

it("emits exactly every catalog-bound public property in component snapshots", () => {
  defineUnifoldElements(customElements);
  defineDeferredElements(customElements);
  Object.values(coreCatalog.components)
    .filter(({ componentType }) => componentType !== CoreComponentType.Tooltip)
    .forEach(assertSnapshotProperties);
});

it("rejects a missing optional family and accepts its compatible definition", () => {
  const registry = new TestRegistry();
  defineUnifoldElements(registry);
  expect(validateUnifoldElementTags([CoreElementTag.Tooltip], registry)).toMatchObject({
    diagnostics: [{ code: ElementRegistrationDiagnosticCode.MissingDefinition }],
    status: ElementRegistrationStatus.Rejected
  });
  defineUnifoldTooltip(registry);
  expect(validateUnifoldElementTags([CoreElementTag.Tooltip], registry).status).toBe(
    ElementRegistrationStatus.Registered
  );
});

it("allows a pending optional family without accepting a foreign definition", () => {
  const registry = new TestRegistry();
  defineUnifoldElements(registry);
  expect(
    validateUnifoldElementTags(
      [CoreElementTag.Tooltip],
      registry,
      ElementDefinitionPolicy.AllowPending
    ).status
  ).toBe(ElementRegistrationStatus.Registered);
  registry.define(CoreElementTag.Tooltip, ForeignElement);
  expect(
    validateUnifoldElementTags(
      [CoreElementTag.Tooltip],
      registry,
      ElementDefinitionPolicy.AllowPending
    )
  ).toMatchObject({
    diagnostics: [{ code: ElementRegistrationDiagnosticCode.ForeignDefinition }],
    status: ElementRegistrationStatus.Rejected
  });
});

function assertSnapshotProperties(descriptor: ComponentDescriptor): void {
  const element = document.createElement(descriptor.tagName) as unknown as SnapshotProbe;
  if (typeof element.emitUiEvent !== "function")
    throw new Error(`Missing snapshot emitter for ${descriptor.tagName}.`);
  element.eventNode = componentNode(`probe-${descriptor.componentType}`, descriptor.componentType);
  const event = element.emitUiEvent(ElementEventType.ComponentActivated, {});
  const actual = Object.keys(requiredSnapshot(event).properties).sort();
  const expected = descriptor.properties
    .filter(({ bindingKind }) => bindingKind === CatalogBindingKind.Property)
    .map(({ name }) => name)
    .sort();
  expect(actual).toEqual(expected);
}

interface SnapshotProbe {
  eventNode?: UiNodeSnapshot;
  emitUiEvent(type: ElementEventType, change: JsonObject): UiEvent;
}

function requiredSnapshot(event: UiEvent): UiNodeSnapshot {
  const snapshot = event.data.snapshot;
  if (snapshot === undefined) throw new Error("Component snapshot is missing.");
  return snapshot;
}

it("rejects a foreign constructor without partially defining missing tags", () => {
  const registry = new TestRegistry([[CoreElementTag.Button, ForeignElement]]);
  const result = registerCoreElements(registry);

  expect(result).toMatchObject({
    diagnostics: [{ code: ElementRegistrationDiagnosticCode.ForeignDefinition }],
    status: ElementRegistrationStatus.Rejected
  });
  expect(registry.names()).toEqual([CoreElementTag.Button]);
});

it("accepts a duplicate package constructor from the same catalog release", () => {
  const compatible = markedElement(CoreElementTag.Button, "1.0.0", CoreCatalogMajor.Version1);
  const registry = new TestRegistry([[CoreElementTag.Button, compatible]]);
  const result = registerCoreElements(registry);

  expect(result.status).toBe(ElementRegistrationStatus.Registered);
  expect([...registry.names()]).toEqual(expect.arrayContaining([...foundationTags()]));
});

it("rejects a same-major but different catalog release", () => {
  const differentMinor = markedElement(CoreElementTag.Button, "1.1.0", CoreCatalogMajor.Version1);
  const result = defineUnifoldElements(new TestRegistry([[CoreElementTag.Button, differentMinor]]));

  expect(result).toMatchObject({
    diagnostics: [{ code: ElementRegistrationDiagnosticCode.CatalogMismatch }],
    status: ElementRegistrationStatus.Rejected
  });
});

it("rejects an incompatible catalog major before registration", () => {
  const incompatible = markedElement(CoreElementTag.Button, "2.0.0", "2");
  const registry = new TestRegistry([[CoreElementTag.Button, incompatible]]);
  const result = registerCoreElements(registry);

  expect(result).toMatchObject({
    diagnostics: [{ code: ElementRegistrationDiagnosticCode.CatalogMismatch }],
    status: ElementRegistrationStatus.Rejected
  });
  expect(registry.names()).toEqual([CoreElementTag.Button]);
});

it("rejects tag metadata that belongs to another core element", () => {
  const wrongTag = markedElement(CoreElementTag.TextField, "1.0.0", CoreCatalogMajor.Version1);
  const result = defineUnifoldElements(new TestRegistry([[CoreElementTag.Button, wrongTag]]));

  expect(result).toMatchObject({
    diagnostics: [{ code: ElementRegistrationDiagnosticCode.TagMismatch }],
    status: ElementRegistrationStatus.Rejected
  });
});

it("rejects another catalog name even when its version matches", () => {
  const foreignCatalog = markedElement(
    CoreElementTag.Button,
    "1.0.0",
    CoreCatalogMajor.Version1,
    "other-catalog"
  );
  const result = defineUnifoldElements(new TestRegistry([[CoreElementTag.Button, foreignCatalog]]));

  expect(result).toMatchObject({
    diagnostics: [{ code: ElementRegistrationDiagnosticCode.CatalogMismatch }]
  });
});

it("treats malformed shared-symbol metadata as foreign", () => {
  class MalformedElement extends HTMLElement {}
  Object.defineProperty(MalformedElement, UNIFOLD_ELEMENT_DEFINITION, {
    value: { catalogMajor: "", tagName: CoreElementTag.Button }
  });
  const result = defineUnifoldElements(
    new TestRegistry([[CoreElementTag.Button, MalformedElement]])
  );

  expect(result).toMatchObject({
    diagnostics: [{ code: ElementRegistrationDiagnosticCode.ForeignDefinition }]
  });
});

it("preflights a constructor already defined under another name", () => {
  const source = new TestRegistry();
  defineUnifoldElements(source);
  const button = requireDefinition(source, CoreElementTag.Button);
  const target = new TestRegistry([["legacy-button", button]]);

  const result = defineUnifoldElements(target);

  expect(result).toMatchObject({
    definedTags: [],
    diagnostics: [{ code: ElementRegistrationDiagnosticCode.ConstructorAlreadyDefined }]
  });
  expect(target.names()).toEqual(["legacy-button"]);
});

it("reports an unexpected native definition failure and partial progress", () => {
  const registry = new TestRegistry([], CoreElementTag.Button);
  const result = defineUnifoldElements(registry);

  expect(result).toMatchObject({
    definedTags: [CoreElementTag.Accordion, CoreElementTag.Alert, CoreElementTag.Box],
    diagnostics: [{ code: ElementRegistrationDiagnosticCode.DefinitionFailed }],
    status: ElementRegistrationStatus.Rejected
  });
});

it("exposes immutable tag-specific metadata on owned constructors", () => {
  const registry = new TestRegistry();
  registerCoreElements(registry);
  defineUnifoldStepper(registry);
  defineUnifoldWizard(registry);
  const metadata = readElementDefinition(requireDefinition(registry, CoreElementTag.TextField));
  const stepper = readElementDefinition(requireDefinition(registry, CoreElementTag.Stepper));
  const wizard = readElementDefinition(requireDefinition(registry, CoreElementTag.Wizard));

  expect(metadata).toMatchObject({
    catalogMajor: CoreCatalogMajor.Version1,
    tagName: CoreElementTag.TextField
  });
  expect(stepper?.tagName).toBe(CoreElementTag.Stepper);
  expect(wizard?.tagName).toBe(CoreElementTag.Wizard);
  expect(Object.isFrozen(metadata)).toBe(true);
});

class ForeignElement extends HTMLElement {}

class TestRegistry implements ElementRegistryPort {
  private readonly definitions = new Map<string, CustomElementConstructor>();

  constructor(
    initial: readonly (readonly [string, CustomElementConstructor])[] = [],
    private readonly failOn?: string
  ) {
    initial.forEach(([name, constructor]) => this.definitions.set(name, constructor));
  }

  define(name: string, constructor: CustomElementConstructor): void {
    if (name === this.failOn) throw new Error(`Injected definition failure: ${name}.`);
    if (this.definitions.has(name)) throw new Error(`Duplicate definition: ${name}.`);
    this.definitions.set(name, constructor);
  }

  get(name: string): CustomElementConstructor | undefined {
    return this.definitions.get(name);
  }

  getName(constructor: CustomElementConstructor): string | null {
    return [...this.definitions].find(([, item]) => item === constructor)?.[0] ?? null;
  }

  names(): readonly string[] {
    return [...this.definitions.keys()];
  }
}

function markedElement(
  tagName: CoreElementTag,
  catalogVersion: string,
  catalogMajor: string,
  catalogName = "unifold-core"
): CustomElementConstructor {
  class DuplicateElement extends HTMLElement {}
  const metadata: ElementDefinitionMetadata = {
    catalogMajor,
    catalogName,
    catalogVersion,
    tagName
  };
  Object.defineProperty(DuplicateElement, UNIFOLD_ELEMENT_DEFINITION, { value: metadata });
  return DuplicateElement;
}

function requireDefinition(
  registry: TestRegistry,
  tagName: CoreElementTag
): CustomElementConstructor {
  const constructor = registry.get(tagName);
  if (constructor === undefined) throw new Error(`Missing definition: ${tagName}.`);
  return constructor;
}

function foundationTags(): readonly CoreElementTag[] {
  const deferred = new Set([
    CoreElementTag.AuditLog,
    CoreElementTag.Breadcrumb,
    CoreElementTag.Combobox,
    CoreElementTag.DataGrid,
    CoreElementTag.Dialog,
    CoreElementTag.FileInput,
    CoreElementTag.MasterDetail,
    CoreElementTag.MenuButton,
    CoreElementTag.Popover,
    CoreElementTag.SearchResults,
    CoreElementTag.Stepper,
    CoreElementTag.Tabs,
    CoreElementTag.Tooltip,
    CoreElementTag.VirtualList,
    CoreElementTag.Wizard
  ]);
  return Object.values(CoreElementTag).filter((tag) => !deferred.has(tag));
}

function defineDeferredElements(registry: ElementRegistryPort): void {
  defineUnifoldAuditLog(registry);
  defineUnifoldBreadcrumb(registry);
  defineUnifoldCombobox(registry);
  defineUnifoldDataGrid(registry);
  [defineUnifoldDialog, defineUnifoldFileInput].forEach((define) => define(registry));
  defineUnifoldMasterDetail(registry);
  defineUnifoldMenuButton(registry);
  defineUnifoldPopover(registry);
  defineUnifoldSearchResults(registry);
  defineUnifoldStepper(registry);
  defineUnifoldTabs(registry);
  defineUnifoldTooltip(registry);
  defineUnifoldVirtualList(registry);
  defineUnifoldWizard(registry);
}
