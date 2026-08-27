import { maximumDataClassification } from "@unislang/unifold-contracts";
import {
  UiControlStatus,
  type UiControlState,
  type UiNodeSnapshot
} from "@unislang/unifold-events";

export function migrateSnapshot(current: UiNodeSnapshot, desired: UiNodeSnapshot): UiNodeSnapshot {
  if (!sameControlContract(current, desired)) return desired;
  const control = migrateControl(current, desired);
  return {
    ...desired,
    base: migrateBase(current, desired),
    ...(control === undefined ? {} : { control }),
    revision: current.revision
  };
}

function migrateBase(current: UiNodeSnapshot, desired: UiNodeSnapshot): UiNodeSnapshot["base"] {
  return {
    ...desired.base,
    busy: current.base.busy,
    dataClassification: migratedClassification(current, desired),
    focused: current.base.focused,
    ownDisabled: desired.base.ownDisabled ?? desired.base.disabled
  };
}

function migratedClassification(
  current: UiNodeSnapshot,
  desired: UiNodeSnapshot
): UiNodeSnapshot["base"]["dataClassification"] {
  if (current.control === undefined || !current.control.dirty) {
    return desired.base.dataClassification;
  }
  return maximumDataClassification([
    current.base.dataClassification,
    desired.base.dataClassification
  ]);
}

function migrateControl(
  current: UiNodeSnapshot,
  desired: UiNodeSnapshot
): UiNodeSnapshot["control"] {
  const controls = pairedControls(current, desired);
  if (controls === undefined) return desired.control;
  if (controls.current.pristine) return controls.desired;
  return migratedDirtyControl(controls.current, controls.desired, desired.base.disabled);
}

function migratedDirtyControl(
  current: UiControlState,
  desired: UiControlState,
  disabled: boolean
): UiControlState {
  const obsoleteAsyncIds = new Set(current.asyncValidatorIds);
  const errors = current.errors.filter(({ validatorId }) => !obsoleteAsyncIds.has(validatorId));
  return {
    ...current,
    asyncValidatorIds: desired.asyncValidatorIds,
    errors,
    pending: false,
    required: desired.required,
    status: controlStatus(errors.length, disabled),
    updateOn: desired.updateOn,
    validationRequestId: null,
    validatorIds: desired.validatorIds
  };
}

function pairedControls(current: UiNodeSnapshot, desired: UiNodeSnapshot) {
  if (current.control === undefined || desired.control === undefined) return undefined;
  return { current: current.control, desired: desired.control };
}

function sameControlContract(left: UiNodeSnapshot, right: UiNodeSnapshot): boolean {
  return left.kind === right.kind && left.type === right.type;
}

function controlStatus(errorCount: number, disabled: boolean): UiControlStatus {
  if (disabled) return UiControlStatus.Disabled;
  return errorCount === 0 ? UiControlStatus.Valid : UiControlStatus.Invalid;
}
