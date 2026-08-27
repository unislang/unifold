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
  const classification = current.control?.dirty
    ? maximumDataClassification([current.base.dataClassification, desired.base.dataClassification])
    : desired.base.dataClassification;
  return {
    ...desired.base,
    busy: current.base.busy,
    dataClassification: classification,
    focused: current.base.focused
  };
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
