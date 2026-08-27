import type {
  JsonObject,
  JsonValue,
  UiCompositionNodeProvenance,
  UiNodeKind
} from "@unislang/unifold-contracts";
import type { UiUpdateTrigger } from "@unislang/unifold-contracts";
import { DataClassification, UiControlStatus, UiValidationSeverity } from "./enums.js";

export type UiNodeId = string;

export interface UiValidationError {
  readonly affectedIds?: readonly UiNodeId[];
  readonly code: string;
  readonly messageKey: string;
  readonly parameters?: JsonObject;
  readonly ownerId?: UiNodeId;
  readonly severity: UiValidationSeverity;
  readonly validatorId: string;
}

export interface UiControlState<TValue extends JsonValue = JsonValue> {
  readonly value: TValue;
  readonly rawValue: TValue;
  readonly initialValue: TValue;
  readonly status: UiControlStatus;
  readonly errors: readonly UiValidationError[];
  readonly pristine: boolean;
  readonly dirty: boolean;
  readonly touched: boolean;
  readonly pending: boolean;
  readonly required: boolean;
  readonly updateOn: UiUpdateTrigger;
  readonly validatorIds: readonly string[];
  readonly asyncValidatorIds: readonly string[];
  readonly validationRequestId: string | null;
}

export interface UiNodeBaseState {
  readonly mounted: boolean;
  readonly visible: boolean;
  readonly interactive: boolean;
  readonly disabled: boolean;
  readonly readonly: boolean;
  readonly busy: boolean;
  readonly focused: boolean;
  readonly dataClassification: DataClassification;
}

export interface UiNodeSnapshot<
  TSpecific extends JsonObject = JsonObject,
  TValue extends JsonValue = JsonValue
> {
  readonly id: UiNodeId;
  readonly instanceId: string;
  readonly kind: UiNodeKind;
  readonly type: string;
  readonly definitionVersion: string;
  readonly controlChildIds?: readonly UiNodeId[];
  readonly controlKey?: string;
  readonly controlParentId?: UiNodeId;
  readonly parentId?: UiNodeId;
  readonly scopePath: readonly UiNodeId[];
  readonly revision: number;
  readonly base: UiNodeBaseState;
  readonly attributes: Readonly<Record<string, string>>;
  readonly properties: TSpecific;
  readonly control?: UiControlState<TValue>;
  readonly composition?: UiCompositionNodeProvenance;
}
