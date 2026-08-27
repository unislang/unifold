import {
  UiCommandType,
  UiControlStatus,
  type UiCommand,
  type UiControlState,
  type UiNodeSnapshot
} from "@unislang/unifold-events";
import { withValidatedControl, type UiValidatorRegistryPort } from "@unislang/unifold-forms";
import type { NodeRecipe, UiNodeTransactionDraft } from "@unislang/unifold-reactivity";

type DraftNode = Parameters<NodeRecipe>[0];

export function setControlDisabled(
  draft: UiNodeTransactionDraft,
  command: UiCommand,
  validators: UiValidatorRegistryPort
): void {
  if (command.type !== UiCommandType.ControlSetDisabled) return;
  draft.update(command.id, (node) => {
    requireControl(node);
    setOwnDisabled(node, command.disabled);
  });
  reconcileDisabled(draft, [command.id], validators);
}

export function setControlStatus(
  draft: UiNodeTransactionDraft,
  command: UiCommand,
  validators: UiValidatorRegistryPort
): void {
  if (command.type !== UiCommandType.ControlSetStatus) return;
  const disabled = command.status === UiControlStatus.Disabled;
  draft.update(command.id, (node) => {
    requireControl(node);
    setOwnDisabled(node, disabled);
  });
  reconcileDisabled(draft, [command.id], validators);
  if (disabled) return;
  draft.update(command.id, (node) => {
    const control = requireControl(node);
    control.status = command.status;
    control.pending = command.status === UiControlStatus.Pending;
  });
}

export function setOwnDisabled(node: DraftNode, disabled: boolean): void {
  node.base.ownDisabled = disabled;
  (node.properties as unknown as Record<string, unknown>)["disabled"] = disabled;
}

export function reconcileDisabled(
  draft: UiNodeTransactionDraft,
  ids: readonly string[],
  validators: UiValidatorRegistryPort
): void {
  draft.reconcileControlDisabled(ids, (node) => validatedControl(node, validators));
}

function validatedControl(
  node: UiNodeSnapshot,
  validators: UiValidatorRegistryPort
): UiControlState {
  const validated = withValidatedControl(node, validators).control;
  if (validated === undefined) throw new Error(`Node is not a control: ${node.id}`);
  return validated;
}

function requireControl(node: DraftNode) {
  if (node.control === undefined) throw new Error(`Node is not a control: ${node.id}`);
  return node.control;
}
