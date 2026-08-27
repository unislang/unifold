import { CoreElementTag } from "@unislang/unifold-catalog";

import { defineUnifoldAuditLog } from "./audit-log-entry.js";
import { defineUnifoldBreadcrumb } from "./breadcrumb-entry.js";
import { defineUnifoldCheckboxGroup } from "./checkbox-group-entry.js";
import { defineUnifoldCombobox } from "./combobox-entry.js";
import { defineUnifoldCard, defineUnifoldImage } from "./content-media-entry.js";
import { defineUnifoldDataGrid } from "./data-grid-entry.js";
import { defineUnifoldDateField } from "./date-field-entry.js";
import { defineUnifoldDialog } from "./dialog-entry.js";
import { defineUnifoldFileInput } from "./file-input-entry.js";
import {
  defineUnifoldErrorSummary,
  defineUnifoldField,
  defineUnifoldFieldset
} from "./form-structure-entry.js";
import { defineUnifoldMasterDetail } from "./master-detail-entry.js";
import { defineUnifoldMenuButton } from "./menu-button-entry.js";
import { defineUnifoldNumberField } from "./number-field-entry.js";
import { defineUnifoldPopover } from "./popover-entry.js";
import { defineUnifoldSearchField } from "./search-field-entry.js";
import {
  UNIFOLD_ELEMENT_DEFINITION,
  type ElementDefinitionMetadata,
  type ElementRegistryPort
} from "./register.js";
import { defineUnifoldSearchResults } from "./search-results-entry.js";
import { defineUnifoldStepper } from "./stepper-entry.js";
import { defineUnifoldSwitch } from "./switch-entry.js";
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
  const deferred = new Set<CoreElementTag>([
    CoreElementTag.AuditLog,
    CoreElementTag.Breadcrumb,
    CoreElementTag.Card,
    CoreElementTag.CheckboxGroup,
    CoreElementTag.Combobox,
    CoreElementTag.DataGrid,
    CoreElementTag.DateField,
    CoreElementTag.Dialog,
    CoreElementTag.FileInput,
    CoreElementTag.Image,
    CoreElementTag.ErrorSummary,
    CoreElementTag.Field,
    CoreElementTag.Fieldset,
    CoreElementTag.MasterDetail,
    CoreElementTag.MenuButton,
    CoreElementTag.NumberField,
    CoreElementTag.Popover,
    CoreElementTag.SearchField,
    CoreElementTag.SearchResults,
    CoreElementTag.Stepper,
    CoreElementTag.Switch,
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
  defineUnifoldCheckboxGroup(registry);
  defineUnifoldCombobox(registry);
  defineUnifoldCard(registry);
  defineUnifoldImage(registry);
  defineUnifoldDataGrid(registry);
  defineUnifoldDateField(registry);
  [defineUnifoldDialog, defineUnifoldFileInput].forEach((define) => define(registry));
  [defineUnifoldErrorSummary, defineUnifoldField, defineUnifoldFieldset].forEach((define) =>
    define(registry)
  );
  defineUnifoldMasterDetail(registry);
  defineUnifoldMenuButton(registry);
  defineUnifoldNumberField(registry);
  defineUnifoldPopover(registry);
  defineUnifoldSearchField(registry);
  defineUnifoldSearchResults(registry);
  defineUnifoldStepper(registry);
  defineUnifoldSwitch(registry);
  defineUnifoldTabs(registry);
  defineUnifoldTooltip(registry);
  defineUnifoldVirtualList(registry);
  defineUnifoldWizard(registry);
}
