import {
  UnifoldApplicationMountMode,
  UnifoldApplicationMountStatus,
  mountUnifoldApplication,
  type MountUnifoldApplicationResult,
  type UnifoldApplicationPort
} from "@unislang/unifold";
import type { UiEvent } from "@unislang/unifold-events";

import uiDefinition from "../ui.json";

const [
  auditLogFamily,
  breadcrumbFamily,
  comboboxFamily,
  contentMediaFamily,
  dataGridFamily,
  dialogFamily,
  fileInputFamily,
  masterDetailFamily,
  menuButtonFamily,
  numberFieldFamily,
  popoverFamily,
  searchResultsFamily,
  stepperFamily,
  tabsFamily,
  tooltipFamily,
  virtualListFamily,
  wizardFamily
] = await Promise.all([
  import("@unislang/unifold/audit-log"),
  import("@unislang/unifold/breadcrumb"),
  import("@unislang/unifold/combobox"),
  import("@unislang/unifold/content-media"),
  import("@unislang/unifold/data-grid"),
  import("@unislang/unifold/dialog"),
  import("@unislang/unifold/file-input"),
  import("@unislang/unifold/master-detail"),
  import("@unislang/unifold/menu-button"),
  import("@unislang/unifold/number-field"),
  import("@unislang/unifold/popover"),
  import("@unislang/unifold/search-results"),
  import("@unislang/unifold/stepper"),
  import("@unislang/unifold/tabs"),
  import("@unislang/unifold/tooltip"),
  import("@unislang/unifold/virtual-list"),
  import("@unislang/unifold/wizard")
]);
assertFamily("AuditLog", auditLogFamily.defineUnifoldAuditLog());
assertFamily("Breadcrumb", breadcrumbFamily.defineUnifoldBreadcrumb());
assertFamily("Combobox", comboboxFamily.defineUnifoldCombobox());
assertFamily("Card", contentMediaFamily.defineUnifoldCard());
assertFamily("Image", contentMediaFamily.defineUnifoldImage());
assertFamily("DataGrid", dataGridFamily.defineUnifoldDataGrid());
assertFamily("Dialog", dialogFamily.defineUnifoldDialog());
assertFamily("FileInput", fileInputFamily.defineUnifoldFileInput());
assertFamily("MasterDetail", masterDetailFamily.defineUnifoldMasterDetail());
assertFamily("MenuButton", menuButtonFamily.defineUnifoldMenuButton());
assertFamily("NumberField", numberFieldFamily.defineUnifoldNumberField());
assertFamily("Popover", popoverFamily.defineUnifoldPopover());
assertFamily("SearchResults", searchResultsFamily.defineUnifoldSearchResults());
assertFamily("Stepper", stepperFamily.defineUnifoldStepper());
assertFamily("Tabs", tabsFamily.defineUnifoldTabs());
assertFamily("Tooltip", tooltipFamily.defineUnifoldTooltip());
assertFamily("VirtualList", virtualListFamily.defineUnifoldVirtualList());
assertFamily("Wizard", wizardFamily.defineUnifoldWizard());

function assertFamily(
  name: string,
  result: ReturnType<typeof tooltipFamily.defineUnifoldTooltip>
): void {
  if (result.status !== "registered")
    throw new Error(`${name} registration failed: ${JSON.stringify(result.diagnostics)}`);
}

export interface StaticUpgradeResult {
  readonly diagnostics: MountUnifoldApplicationResult["diagnostics"];
  readonly status: UnifoldApplicationMountStatus;
}

interface StaticUpgradeWindow extends Window {
  __unifoldStaticEvents: UiEvent[];
  __unifoldStaticResult?: StaticUpgradeResult;
  __unifoldUpgradeStatic(): StaticUpgradeResult;
}

export function isManualUpgrade(location: Pick<Location, "search">): boolean {
  return new URLSearchParams(location.search).get("upgrade") === "manual";
}

export function installStaticUpgrade(target: StaticUpgradeWindow, owner: Document): void {
  let application: UnifoldApplicationPort | undefined;
  target.__unifoldStaticEvents = [];
  target.__unifoldUpgradeStatic = () => {
    if (application !== undefined) return mountedResult();
    const result = mountStaticApplication(owner);
    target.__unifoldStaticResult = publicResult(result);
    if (result.status === UnifoldApplicationMountStatus.Mounted) {
      application = result.application;
      captureEvents(application, target.__unifoldStaticEvents);
    }
    return target.__unifoldStaticResult;
  };
  if (!isManualUpgrade(target.location)) target.__unifoldUpgradeStatic();
}

function mountStaticApplication(owner: Document): MountUnifoldApplicationResult {
  const container = owner.querySelector("main");
  if (!(container instanceof HTMLElement)) throw new Error("Static export main is missing.");
  return mountUnifoldApplication(uiDefinition, container, {
    mountMode: UnifoldApplicationMountMode.UpgradeStatic
  });
}

function captureEvents(application: UnifoldApplicationPort, events: UiEvent[]): void {
  application.runtime.events$.subscribe((event) => events.push(event));
}

function publicResult(result: MountUnifoldApplicationResult): StaticUpgradeResult {
  return { diagnostics: result.diagnostics, status: result.status };
}

function mountedResult(): StaticUpgradeResult {
  return { diagnostics: [], status: UnifoldApplicationMountStatus.Mounted };
}

function installBrowserUpgrade(): void {
  if (typeof window === "undefined") return;
  if (document.querySelector("[data-unifold-static-document]") === null) return;
  installStaticUpgrade(window as unknown as StaticUpgradeWindow, document);
}

installBrowserUpgrade();
