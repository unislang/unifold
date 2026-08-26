import {
  UiCommandType,
  UiControlStatus,
  UiUpdateTrigger,
  type UiCommand,
  type UiNodeSnapshot,
  type UiValidationError
} from "@unislang/unifold-events";
import {
  validateControl,
  withValidatedControl,
  type UiValidatorRegistryPort
} from "@unislang/unifold-forms";
import type { NodeRecipe, UiNodeTransactionDraft } from "@unislang/unifold-reactivity";

type DraftNode = Parameters<NodeRecipe>[0];

interface MutableControlState {
  asyncValidatorIds: readonly string[];
  dirty: boolean;
  errors: readonly UiValidationError[];
  initialValue: unknown;
  pending: boolean;
  pristine: boolean;
  rawValue: unknown;
  status: UiControlStatus;
  touched: boolean;
  updateOn: UiUpdateTrigger;
  validationRequestId: string | null;
  value: unknown;
}

type CommandHandler = (
  draft: UiNodeTransactionDraft,
  command: UiCommand,
  validators: UiValidatorRegistryPort
) => void;

const handlers = new Map<UiCommandType, CommandHandler>([
  [UiCommandType.ControlMarkTouched, markControlTouched],
  [UiCommandType.ControlSetDisabled, setControlDisabled],
  [UiCommandType.ControlSetValue, setControlValue],
  [UiCommandType.ControlSetStatus, setControlStatus],
  [UiCommandType.ControlValidationCancel, cancelControlValidation],
  [UiCommandType.ControlValidationResolve, resolveControlValidation],
  [UiCommandType.ControlValidationStart, startControlValidation],
  [UiCommandType.FormReset, resetForm],
  [UiCommandType.FormSubmit, submitForm],
  [UiCommandType.NodePatchProperties, patchProperties],
  [UiCommandType.StructureInstantiate, instantiateNode],
  [UiCommandType.StructureReconcile, reconcileStructure],
  [UiCommandType.StructureRemove, removeNode]
]);

export function applyStateCommand(
  draft: UiNodeTransactionDraft,
  command: UiCommand,
  validators: UiValidatorRegistryPort
): void {
  handlers.get(command.type)?.(draft, command, validators);
}

export function isStateCommand(command: UiCommand): boolean {
  return handlers.has(command.type);
}

function setControlValue(
  draft: UiNodeTransactionDraft,
  command: UiCommand,
  validators: UiValidatorRegistryPort
): void {
  if (command.type !== UiCommandType.ControlSetValue) return;
  draft.update(command.id, (node) => {
    const control = requireControl(node);
    assignControlInput(control, command.value);
    if (control.updateOn === UiUpdateTrigger.Input) applyValidation(node, validators);
  });
}

function markControlTouched(
  draft: UiNodeTransactionDraft,
  command: UiCommand,
  validators: UiValidatorRegistryPort
): void {
  if (command.type !== UiCommandType.ControlMarkTouched) return;
  draft.update(command.id, (node) => blurControl(node, validators));
}

function setControlDisabled(
  draft: UiNodeTransactionDraft,
  command: UiCommand,
  validators: UiValidatorRegistryPort
): void {
  if (command.type !== UiCommandType.ControlSetDisabled) return;
  draft.update(command.id, (node) => {
    requireControl(node);
    node.base.disabled = command.disabled;
    applyValidation(node, validators);
  });
}

function resetForm(
  draft: UiNodeTransactionDraft,
  command: UiCommand,
  validators: UiValidatorRegistryPort
): void {
  if (command.type !== UiCommandType.FormReset) return;
  [command.id, ...draft.descendantIds(command.id)].forEach((id) => {
    draft.update(id, (node) => resetIfControl(node, validators));
  });
}

function resetIfControl(node: DraftNode, validators: UiValidatorRegistryPort): void {
  if (node.control === undefined) return;
  const control = requireControl(node);
  control.value = control.initialValue;
  control.rawValue = control.initialValue;
  control.pristine = true;
  control.dirty = false;
  control.touched = false;
  applyValidation(node, validators);
}

function submitForm(
  draft: UiNodeTransactionDraft,
  command: UiCommand,
  validators: UiValidatorRegistryPort
): void {
  if (command.type !== UiCommandType.FormSubmit) return;
  [command.id, ...draft.descendantIds(command.id)].forEach((id) => {
    draft.update(id, (node) => submitIfControl(node, validators));
  });
}

function submitIfControl(node: DraftNode, validators: UiValidatorRegistryPort): void {
  if (node.control === undefined) return;
  if (node.base.disabled) return;
  commitRawValue(node, UiUpdateTrigger.Submit);
  node.control.touched = true;
  applyValidation(node, validators);
}

function blurControl(node: DraftNode, validators: UiValidatorRegistryPort): void {
  if (node.control === undefined) throw new Error(`Node is not a control: ${node.id}`);
  node.control.touched = true;
  if (node.control.updateOn !== UiUpdateTrigger.Submit) {
    commitRawValue(node, UiUpdateTrigger.Blur);
    applyValidation(node, validators);
  }
}

function applyValidation(node: DraftNode, validators: UiValidatorRegistryPort): void {
  const control = requireControl(node);
  const result = validateControl(node as unknown as UiNodeSnapshot, validators);
  control.errors = result.errors;
  control.pending = result.pending;
  control.status = result.status;
}

function assignControlInput(control: MutableControlState, value: unknown): void {
  control.rawValue = value;
  if (control.updateOn === UiUpdateTrigger.Input) control.value = value;
  control.pristine = false;
  control.dirty = true;
}

function commitRawValue(node: DraftNode, trigger: UiUpdateTrigger): void {
  const control = requireControl(node);
  if (control.updateOn === trigger) control.value = control.rawValue;
}

function requireControl(node: DraftNode): MutableControlState {
  if (node.control === undefined) throw new Error(`Node is not a control: ${node.id}`);
  return node.control as unknown as MutableControlState;
}

function setControlStatus(draft: UiNodeTransactionDraft, command: UiCommand): void {
  if (command.type !== UiCommandType.ControlSetStatus) return;
  draft.update(command.id, (node) => {
    if (!node.control) throw new Error(`Node is not a control: ${command.id}`);
    node.control.status = command.status;
    node.control.pending = command.status === UiControlStatus.Pending;
    node.base.disabled = command.status === UiControlStatus.Disabled;
  });
}

function startControlValidation(draft: UiNodeTransactionDraft, command: UiCommand): void {
  if (command.type !== UiCommandType.ControlValidationStart) return;
  draft.update(command.id, (node) => {
    const control = requireControl(node);
    control.errors = withoutAsyncErrors(control);
    control.pending = true;
    control.status = UiControlStatus.Pending;
    control.validationRequestId = command.requestId;
  });
}

function resolveControlValidation(draft: UiNodeTransactionDraft, command: UiCommand): void {
  if (command.type !== UiCommandType.ControlValidationResolve) return;
  draft.update(command.id, (node) => {
    const control = requireControl(node);
    if (control.validationRequestId !== command.requestId) return;
    control.errors = [...withoutAsyncErrors(control), ...command.errors];
    control.pending = false;
    control.status = resultStatus(control.errors.length, node.base.disabled);
    control.validationRequestId = null;
  });
}

function cancelControlValidation(draft: UiNodeTransactionDraft, command: UiCommand): void {
  if (command.type !== UiCommandType.ControlValidationCancel) return;
  draft.update(command.id, (node) => {
    const control = requireControl(node);
    if (control.validationRequestId !== command.requestId) return;
    control.pending = false;
    control.status = resultStatus(control.errors.length, node.base.disabled);
    control.validationRequestId = null;
  });
}

function withoutAsyncErrors(control: MutableControlState): readonly UiValidationError[] {
  const asyncIds = new Set(control.asyncValidatorIds);
  return control.errors.filter(({ validatorId }) => !asyncIds.has(validatorId));
}

function resultStatus(errorCount: number, disabled: boolean): UiControlStatus {
  if (disabled) return UiControlStatus.Disabled;
  return errorCount === 0 ? UiControlStatus.Valid : UiControlStatus.Invalid;
}

function patchProperties(draft: UiNodeTransactionDraft, command: UiCommand): void {
  if (command.type !== UiCommandType.NodePatchProperties) return;
  draft.update(command.id, (node) => {
    assignProperties(
      node.properties as unknown as Record<string, unknown>,
      command.properties as Readonly<Record<string, unknown>>
    );
  });
}

function assignProperties(
  target: Record<string, unknown>,
  properties: Readonly<Record<string, unknown>>
): void {
  Object.assign(target, properties);
}

function instantiateNode(draft: UiNodeTransactionDraft, command: UiCommand): void {
  if (command.type === UiCommandType.StructureInstantiate) draft.add(command.node);
}

function removeNode(draft: UiNodeTransactionDraft, command: UiCommand): void {
  if (command.type === UiCommandType.StructureRemove) draft.remove(command.id);
}

function reconcileStructure(
  draft: UiNodeTransactionDraft,
  command: UiCommand,
  validators: UiValidatorRegistryPort
): void {
  if (command.type !== UiCommandType.StructureReconcile) return;
  draft.reconcile(
    command.nodes.map((node) => withValidatedControl(node, validators)),
    command.nodeIdentityAliases,
    command.resetNodeIds
  );
  command.nodes.forEach(({ id }) =>
    draft.update(id, (node) => touchlessValidation(node, validators))
  );
}

function touchlessValidation(node: DraftNode, validators: UiValidatorRegistryPort): void {
  if (node.control !== undefined) applyValidation(node, validators);
}
