import { CoreElementTag } from "@unislang/unifold-catalog";

import { defineUnifoldAuditLog } from "./audit-log-entry.js";
import { defineUnifoldBreadcrumb } from "./breadcrumb-entry.js";
import { defineUnifoldCombobox } from "./combobox-entry.js";
import { defineUnifoldDataGrid } from "./data-grid-entry.js";
import { defineUnifoldDialog } from "./dialog-entry.js";
import { defineUnifoldFileInput } from "./file-input-entry.js";
import {
  defineUnifoldErrorSummary,
  defineUnifoldField,
  defineUnifoldFieldset
} from "./form-structure-entry.js";
import { defineUnifoldMasterDetail } from "./master-detail-entry.js";
import { defineUnifoldMenuButton } from "./menu-button-entry.js";
import { defineUnifoldPopover } from "./popover-entry.js";
import {
  UNIFOLD_ELEMENT_DEFINITION,
  type ElementDefinitionMetadata,
  type ElementRegistryPort
} from "./register.js";
import { defineUnifoldSearchResults } from "./search-results-entry.js";
import { defineUnifoldStepper } from "./stepper-entry.js";
import { defineUnifoldTabs } from "./tabs-entry.js";
import { defineUnifoldTooltip } from "./tooltip-entry.js";
import { defineUnifoldVirtualList } from "./virtual-list-entry.js";
import { defineUnifoldWizard } from "./wizard-entry.js";

export class ForeignElement extends HTMLElement {}

export class TestRegistry implements ElementRegistryPort {
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

export function markedElement(
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

export function requireDefinition(
  registry: TestRegistry,
  tagName: CoreElementTag
): CustomElementConstructor {
  const constructor = registry.get(tagName);
  if (constructor === undefined) throw new Error(`Missing definition: ${tagName}.`);
  return constructor;
}

export function foundationTags(): readonly CoreElementTag[] {
  const deferred = new Set([
    CoreElementTag.AuditLog,
    CoreElementTag.Breadcrumb,
    CoreElementTag.Combobox,
    CoreElementTag.DataGrid,
    CoreElementTag.Dialog,
    CoreElementTag.FileInput,
    CoreElementTag.ErrorSummary,
    CoreElementTag.Field,
    CoreElementTag.Fieldset,
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

export function defineDeferredElements(registry: ElementRegistryPort): void {
  defineUnifoldAuditLog(registry);
  defineUnifoldBreadcrumb(registry);
  defineUnifoldCombobox(registry);
  defineUnifoldDataGrid(registry);
  [defineUnifoldDialog, defineUnifoldFileInput].forEach((define) => define(registry));
  [defineUnifoldErrorSummary, defineUnifoldField, defineUnifoldFieldset].forEach((define) =>
    define(registry)
  );
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
