import type {
  JsonObject,
  JsonValue,
  UiCompositionInstanceManifest
} from "@unislang/unifold-contracts";
import type { UiNodeId, UiNodeSnapshot } from "./node.js";
import { UiCommandType, UiControlStatus, UiValidationCancellationReason } from "./enums.js";
import type { UiValidationError } from "./node.js";

export interface ControlCollectionInsertCommand {
  readonly type: UiCommandType.ControlCollectionInsert;
  readonly index: number;
  readonly key: string;
  readonly node: UiNodeSnapshot;
  readonly parentId: UiNodeId;
}

export interface ControlCollectionMoveCommand {
  readonly type: UiCommandType.ControlCollectionMove;
  readonly index: number;
  readonly key: string;
  readonly parentId: UiNodeId;
}

export interface ControlCollectionRemoveCommand {
  readonly type: UiCommandType.ControlCollectionRemove;
  readonly key: string;
  readonly parentId: UiNodeId;
}

export interface ControlSetValueCommand {
  readonly type: UiCommandType.ControlSetValue;
  readonly id: UiNodeId;
  readonly value: JsonValue;
}

export interface ControlMarkTouchedCommand {
  readonly type: UiCommandType.ControlMarkTouched;
  readonly id: UiNodeId;
}

export interface ControlSetDisabledCommand {
  readonly type: UiCommandType.ControlSetDisabled;
  readonly disabled: boolean;
  readonly id: UiNodeId;
}

export interface ControlSetStatusCommand {
  readonly type: UiCommandType.ControlSetStatus;
  readonly id: UiNodeId;
  readonly status: UiControlStatus;
}

export interface ControlValidationStartCommand {
  readonly type: UiCommandType.ControlValidationStart;
  readonly id: UiNodeId;
  readonly requestId: string;
}

export interface ControlValidationResolveCommand {
  readonly type: UiCommandType.ControlValidationResolve;
  readonly errors: readonly UiValidationError[];
  readonly id: UiNodeId;
  readonly requestId: string;
}

export interface ControlValidationCancelCommand {
  readonly type: UiCommandType.ControlValidationCancel;
  readonly error?: string;
  readonly id: UiNodeId;
  readonly reason: UiValidationCancellationReason;
  readonly requestId: string;
}

export interface NodePatchPropertiesCommand {
  readonly type: UiCommandType.NodePatchProperties;
  readonly id: UiNodeId;
  readonly properties: JsonObject;
}

export interface FormSubmitCommand {
  readonly type: UiCommandType.FormSubmit;
  readonly id: UiNodeId;
}

export interface FormResetCommand {
  readonly type: UiCommandType.FormReset;
  readonly id: UiNodeId;
}

export interface StructureInstantiateCommand {
  readonly type: UiCommandType.StructureInstantiate;
  readonly node: UiNodeSnapshot;
}

export interface StructureRemoveCommand {
  readonly type: UiCommandType.StructureRemove;
  readonly id: UiNodeId;
}

export interface StructureReconcileCommand {
  readonly type: UiCommandType.StructureReconcile;
  readonly compositionInstances: Readonly<Record<string, UiCompositionInstanceManifest>>;
  readonly nodes: readonly UiNodeSnapshot[];
  readonly nodeIdentityAliases?: Readonly<Record<UiNodeId, UiNodeId>>;
  readonly resetNodeIds?: readonly UiNodeId[];
}

export interface FocusRequestCommand {
  readonly type: UiCommandType.FocusRequest;
  readonly id: UiNodeId;
}

export interface AnnouncementRequestCommand {
  readonly type: UiCommandType.AnnouncementRequest;
  readonly messageKey: string;
  readonly parameters?: JsonObject;
}

export interface NavigationRequestCommand {
  readonly type: UiCommandType.NavigationRequest;
  readonly target: string;
}

export interface EffectInvokeCommand {
  readonly type: UiCommandType.EffectInvoke;
  readonly capability: string;
  readonly input: JsonObject;
}

export interface StoreWriteCommand {
  readonly id: UiNodeId;
  readonly path: string;
  readonly storeId: string;
  readonly type: UiCommandType.StoreWrite;
  readonly value: JsonValue;
}

export type UiCommand =
  | AnnouncementRequestCommand
  | ControlCollectionInsertCommand
  | ControlCollectionMoveCommand
  | ControlCollectionRemoveCommand
  | ControlMarkTouchedCommand
  | ControlSetDisabledCommand
  | ControlSetStatusCommand
  | ControlSetValueCommand
  | ControlValidationCancelCommand
  | ControlValidationResolveCommand
  | ControlValidationStartCommand
  | EffectInvokeCommand
  | FocusRequestCommand
  | FormResetCommand
  | FormSubmitCommand
  | NavigationRequestCommand
  | NodePatchPropertiesCommand
  | StructureInstantiateCommand
  | StructureReconcileCommand
  | StructureRemoveCommand
  | StoreWriteCommand;
