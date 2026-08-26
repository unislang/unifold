import { UnifoldApplicationUpdateStatus } from "@unislang/unifold";

import { registerReferenceInteractiveFamilies } from "./reference-interactive-families.js";

type ReferenceDocument = Parameters<typeof registerReferenceInteractiveFamilies>[1];
type RegistrationResult = ReturnType<
  typeof import("@unislang/unifold/tooltip").defineUnifoldTooltip
>;

interface ReferenceDocumentUpdater {
  update(document: unknown): {
    readonly diagnostics: readonly unknown[];
    readonly status: UnifoldApplicationUpdateStatus;
  };
}

export async function defineReferenceComponentFamilies(document: ReferenceDocument): Promise<void> {
  registerReferenceComponentFamilies(await loadReferenceComponentFamilies(), document);
}

export function commitReferenceComponentFamilies(
  document: ReferenceDocument,
  application: ReferenceDocumentUpdater
): void {
  const result = application.update(document);
  if (result.status === UnifoldApplicationUpdateStatus.Applied) return;
  throw new Error(
    `Reference component synchronization failed: ${JSON.stringify(result.diagnostics)}`
  );
}

function loadReferenceComponentFamilies() {
  return Promise.all([
    import("@unislang/unifold/audit-log"),
    import("@unislang/unifold/combobox"),
    import("@unislang/unifold/data-grid"),
    import("./dialog-reference.js"),
    import("@unislang/unifold/file-input"),
    import("@unislang/unifold/master-detail"),
    import("@unislang/unifold/menu-button"),
    import("./popover-reference.js"),
    import("./breadcrumb-reference.js"),
    import("@unislang/unifold/search-results"),
    import("@unislang/unifold/stepper"),
    import("@unislang/unifold/tabs"),
    import("@unislang/unifold/tooltip"),
    import("@unislang/unifold/virtual-list"),
    import("@unislang/unifold/wizard")
  ] as const);
}

function registerReferenceComponentFamilies(
  families: Awaited<ReturnType<typeof loadReferenceComponentFamilies>>,
  document: ReferenceDocument
): void {
  const modules = namedFamilyModules(families);
  registerReferenceDataFamilies(
    modules.auditLog,
    modules.combobox,
    modules.dataGrid,
    modules.masterDetail,
    modules.searchResults
  );
  registerReferenceInteractiveFamilies(
    {
      breadcrumb: modules.breadcrumb,
      dialog: modules.dialog,
      menuButton: modules.menuButton,
      popover: modules.popover,
      tooltip: modules.tooltip
    },
    document
  );
  assertFamilyRegistration("FileInput", modules.fileInput.defineUnifoldFileInput());
  assertFamilyRegistration("Stepper", modules.stepper.defineUnifoldStepper());
  assertFamilyRegistration("Tabs", modules.tabs.defineUnifoldTabs());
  assertFamilyRegistration("VirtualList", modules.virtualList.defineUnifoldVirtualList());
  assertFamilyRegistration("Wizard", modules.wizard.defineUnifoldWizard());
}

function namedFamilyModules(families: Awaited<ReturnType<typeof loadReferenceComponentFamilies>>) {
  return {
    auditLog: families[0],
    combobox: families[1],
    dataGrid: families[2],
    dialog: families[3],
    fileInput: families[4],
    masterDetail: families[5],
    menuButton: families[6],
    popover: families[7],
    breadcrumb: families[8],
    searchResults: families[9],
    stepper: families[10],
    tabs: families[11],
    tooltip: families[12],
    virtualList: families[13],
    wizard: families[14]
  };
}

function registerReferenceDataFamilies(
  auditLog: typeof import("@unislang/unifold/audit-log"),
  combobox: typeof import("@unislang/unifold/combobox"),
  dataGrid: typeof import("@unislang/unifold/data-grid"),
  masterDetail: typeof import("@unislang/unifold/master-detail"),
  searchResults: typeof import("@unislang/unifold/search-results")
): void {
  assertFamilyRegistration("AuditLog", auditLog.defineUnifoldAuditLog());
  assertFamilyRegistration("Combobox", combobox.defineUnifoldCombobox());
  assertFamilyRegistration("DataGrid", dataGrid.defineUnifoldDataGrid());
  assertFamilyRegistration("MasterDetail", masterDetail.defineUnifoldMasterDetail());
  assertFamilyRegistration("SearchResults", searchResults.defineUnifoldSearchResults());
}

function assertFamilyRegistration(name: string, result: RegistrationResult): void {
  if (result.status !== "registered")
    throw new Error(`${name} family registration failed: ${JSON.stringify(result.diagnostics)}`);
}
