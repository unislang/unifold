import type { JsonObject, JsonPrimitive, JsonValue } from "@unislang/unifold-contracts";
import type { CoreComponentType, UiDocument } from "@unislang/unifold-contracts";

import type {
  CatalogBindingKind,
  CatalogConstraintKind,
  CatalogPropertyType,
  CoreElementTag
} from "./enums.js";
import type {
  ComponentAccessibilityPattern,
  ComponentCapability,
  ComponentDataClassification,
  ComponentEvidenceCheck,
  ComponentSemanticAttachmentKind,
  ComponentSemanticHiddenContentPolicy,
  ComponentSemanticNormalization,
  ComponentSemanticValueSource,
  ComponentStatus
} from "./definition-enums.js";

export interface CatalogPropertyDescriptor {
  readonly bindingKind?: CatalogBindingKind;
  readonly bindingName?: string;
  readonly defaultValue?: JsonValue;
  readonly enumValues?: readonly string[];
  readonly name: string;
  readonly required: boolean;
  readonly valueType: CatalogPropertyType;
}

export interface ChoiceOption extends JsonObject {
  readonly disabled?: boolean;
  readonly label: string;
  readonly value: string;
}

export interface BreadcrumbItem extends JsonObject {
  readonly href?: string;
  readonly id: string;
  readonly label: string;
}

export interface FileMetadata extends JsonObject {
  readonly id: string;
  readonly size: number;
  readonly type: string;
}

export interface ErrorSummaryItem extends JsonObject {
  readonly message: string;
  readonly targetId: string;
}

export type MenuItem = ChoiceOption;

export interface AuditLogEntry extends JsonObject {
  readonly action: string;
  readonly actor: string;
  readonly correlationId?: string;
  readonly id: string;
  readonly summary: string;
  readonly timestamp: string;
}

export interface CatalogUniqueOptionValuesConstraint {
  readonly kind: CatalogConstraintKind.UniqueOptionValues;
  readonly optionsProperty: string;
}

export interface CatalogChildCountConstraint {
  readonly kind: CatalogConstraintKind.ChildCount;
  readonly maximum: number;
  readonly minimum: number;
}

export interface CatalogAuditLogDataConstraint {
  readonly entriesProperty: string;
  readonly kind: CatalogConstraintKind.AuditLogData;
}

export interface CatalogBreadcrumbDataConstraint {
  readonly itemsProperty: string;
  readonly kind: CatalogConstraintKind.BreadcrumbData;
}

export interface CatalogSelectionInOptionsConstraint {
  readonly allowEmptySelection: boolean;
  readonly kind: CatalogConstraintKind.SelectionInOptions;
  readonly optionsProperty: string;
  readonly selectionProperty: string;
}

export interface CatalogTableDataConstraint {
  readonly columnsProperty: string;
  readonly kind: CatalogConstraintKind.TableData;
  readonly rowsProperty: string;
}

export interface CatalogDataGridStateConstraint {
  readonly columnsProperty: string;
  readonly kind: CatalogConstraintKind.DataGridState;
  readonly rowsProperty: string;
  readonly selectionModeProperty: string;
  readonly sortableColumnsProperty: string;
  readonly valueProperty: string;
}

export interface CatalogFileInputDataConstraint {
  readonly kind: CatalogConstraintKind.FileInputData;
  readonly maximumFileBytesProperty: string;
  readonly multipleProperty: string;
  readonly valueProperty: string;
}

export interface CatalogMasterDetailStateConstraint {
  readonly columnsProperty: string;
  readonly kind: CatalogConstraintKind.MasterDetailState;
  readonly masterColumnProperty: string;
  readonly rowsProperty: string;
  readonly valueProperty: string;
}

export interface CatalogNumberFieldRangeConstraint {
  readonly kind: CatalogConstraintKind.NumberFieldRange;
  readonly maximumProperty: string;
  readonly minimumProperty: string;
  readonly stepProperty: string;
  readonly valueProperty: string;
}

export interface CatalogSearchResultsStateConstraint {
  readonly kind: CatalogConstraintKind.SearchResultsState;
  readonly resultsProperty: string;
  readonly valueProperty: string;
}

export interface CatalogSearchQueryLengthConstraint {
  readonly kind: CatalogConstraintKind.SearchQueryLength;
  readonly maximumProperty: string;
  readonly queryProperty: string | null;
  readonly valueProperty: string;
}

export interface CatalogStepNavigationStateConstraint {
  readonly childMode: "match-steps" | "none";
  readonly kind: CatalogConstraintKind.StepNavigationState;
  readonly owner: "stepper" | "tabs" | "wizard";
  readonly stepsProperty: string;
  readonly valueProperty: string;
}

export type CatalogConstraintDescriptor =
  | CatalogAuditLogDataConstraint
  | CatalogBreadcrumbDataConstraint
  | CatalogChildCountConstraint
  | CatalogDataGridStateConstraint
  | CatalogFileInputDataConstraint
  | CatalogMasterDetailStateConstraint
  | CatalogNumberFieldRangeConstraint
  | CatalogSearchQueryLengthConstraint
  | CatalogSearchResultsStateConstraint
  | CatalogSelectionInOptionsConstraint
  | CatalogStepNavigationStateConstraint
  | CatalogTableDataConstraint
  | CatalogUniqueOptionValuesConstraint;

export interface TableColumn extends JsonObject {
  readonly key: string;
  readonly label: string;
}

export type TableCellValue = JsonPrimitive;

export interface TableRow extends JsonObject {
  readonly cells: Readonly<Record<string, TableCellValue>>;
  readonly id: string;
}

export interface DataGridSort extends JsonObject {
  readonly direction: "ascending" | "descending";
  readonly key: string;
}

export interface DataGridValue extends JsonObject {
  readonly selectedRowIds: readonly string[];
  readonly sort?: DataGridSort;
}

export interface SearchResult extends JsonObject {
  readonly description?: string;
  readonly href?: string;
  readonly id: string;
  readonly title: string;
}

export interface SearchResultsValue extends JsonObject {
  readonly query: string;
  readonly selectedResultId: string;
}

export interface WorkflowStep extends JsonObject {
  readonly description?: string;
  readonly disabled?: boolean;
  readonly id: string;
  readonly label: string;
}

export type TabItem = WorkflowStep;

export interface ComponentDescriptor {
  readonly componentType: CoreComponentType;
  readonly constraints?: readonly CatalogConstraintDescriptor[];
  readonly properties: readonly CatalogPropertyDescriptor[];
  readonly tagName: CoreElementTag;
  readonly version: string;
}

export interface ComponentCatalog {
  readonly components: Readonly<Record<CoreComponentType, ComponentDescriptor>>;
  readonly name: string;
  readonly version: string;
}

export interface ComponentAccessibilityContract {
  readonly manualChecks: readonly ComponentEvidenceCheck[];
  readonly pattern: ComponentAccessibilityPattern;
  readonly requirementIds: readonly string[];
}

export interface ComponentPrivacyContract {
  readonly classification: ComponentDataClassification;
  readonly sensitiveProperties: readonly string[];
}

export interface ComponentTestManifest {
  readonly browserScenarios: readonly string[];
  readonly requirementIds: readonly string[];
  readonly unitFile: string;
}

export interface ComponentSemanticAttachmentContract {
  readonly hiddenContent: ComponentSemanticHiddenContentPolicy;
  readonly id: string;
  readonly kind: ComponentSemanticAttachmentKind;
  readonly normalization: ComponentSemanticNormalization;
  readonly sourceProperty: string;
  readonly valueSource: ComponentSemanticValueSource;
}

export interface ComponentDefinitionSidecar {
  readonly accessibility: ComponentAccessibilityContract;
  readonly behaviors: readonly string[];
  readonly componentType: CoreComponentType;
  readonly examples: readonly UiDocument[];
  readonly privacy: ComponentPrivacyContract;
  readonly purpose: string;
  readonly semanticAttachmentPoints: readonly ComponentSemanticAttachmentContract[];
  readonly status: ComponentStatus;
  readonly testManifest: ComponentTestManifest;
}

export interface ComponentControlAdapterDefinition {
  readonly updateTriggerProperty?: string;
  readonly validatorProperties: readonly string[];
  readonly valueProperty: string;
  readonly valueSchema: JsonObject;
}

export interface ComponentDefinition extends ComponentDefinitionSidecar {
  readonly attributesSchema: JsonObject;
  readonly catalogDescriptor: ComponentDescriptor;
  readonly commonCapabilities: readonly ComponentCapability[];
  readonly control?: ComponentControlAdapterDefinition;
  readonly customElement: JsonObject;
  readonly propertiesSchema: JsonObject;
  readonly publicSnapshotSchema: JsonObject;
  readonly tagName: CoreElementTag;
  readonly version: string;
}

export interface ComponentDefinitionDocument {
  readonly catalog: Readonly<{ name: string; version: string }>;
  readonly definitions: readonly ComponentDefinition[];
  readonly schemaVersion: string;
}
