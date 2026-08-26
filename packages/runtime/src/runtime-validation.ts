import {
  UiCommandType,
  UiUpdateTrigger,
  UiValidationCancellationReason,
  type UiCommand,
  type UiNodeSnapshot,
  type UiTransactionRecord
} from "@unislang/unifold-events";
import type { UiAsyncValidatorRegistryPort } from "@unislang/unifold-forms";

import {
  UiAsyncValidationCoordinator,
  type UiAsyncValidationFailure,
  type UiAsyncValidationResult
} from "./async-validation-coordinator.js";
import type { UiExecutionContext } from "./types.js";

type Execute = (commands: readonly UiCommand[], context: UiExecutionContext) => void;

interface ValidationContext {
  readonly correlationId: string;
  readonly transactionId: string;
}

export class UiRuntimeValidation {
  private readonly coordinator: UiAsyncValidationCoordinator;
  private readonly contexts = new Map<string, ValidationContext>();

  constructor(
    registry: UiAsyncValidatorRegistryPort,
    private readonly createId: () => string,
    private readonly getSnapshot: (id: string) => UiNodeSnapshot | undefined,
    private readonly execute: Execute
  ) {
    this.coordinator = new UiAsyncValidationCoordinator(registry, {
      complete: (result) => this.complete(result),
      fail: (failure) => this.fail(failure)
    });
  }

  afterCommit(
    commands: readonly UiCommand[],
    record: UiTransactionRecord,
    context: ValidationContext
  ): void {
    if (!commands.some(isValidationTrigger)) return;
    record.changedNodeIds.forEach((id) => this.schedule(id, commands, context));
  }

  remove(ids: readonly string[]): void {
    ids.forEach((id) => this.cancelActor(id));
  }

  dispose(): void {
    this.coordinator.dispose();
    this.contexts.clear();
  }

  private schedule(id: string, commands: readonly UiCommand[], context: ValidationContext): void {
    const node = this.getSnapshot(id);
    if (!hasControl(node)) return;
    this.scheduleControl(node, commands, context);
  }

  private scheduleControl(
    node: ControlSnapshot,
    commands: readonly UiCommand[],
    context: ValidationContext
  ): void {
    if (!commands.some((command) => triggersNode(command, node))) return;
    this.cancelPrevious(node, context);
    if (canValidate(node)) this.start(node, context);
  }

  private cancelPrevious(node: UiNodeSnapshot, context: ValidationContext): void {
    const requestId = this.cancelActor(node.id);
    if (requestId === undefined) return;
    const reason = node.base.disabled
      ? UiValidationCancellationReason.Disabled
      : UiValidationCancellationReason.Superseded;
    this.execute(
      [{ id: node.id, reason, requestId, type: UiCommandType.ControlValidationCancel }],
      causalContext(context, this.createId())
    );
  }

  private start(node: UiNodeSnapshot, context: ValidationContext): void {
    const requestId = this.createId();
    this.contexts.set(requestId, context);
    this.execute([{ id: node.id, requestId, type: UiCommandType.ControlValidationStart }], {
      ...causalContext(context, context.transactionId),
      transactionId: requestId
    });
    const pendingNode = this.getSnapshot(node.id);
    if (pendingNode !== undefined) this.coordinator.start(pendingNode, requestId);
  }

  private complete(result: UiAsyncValidationResult): void {
    const context = this.takeContext(result.requestId);
    if (context === undefined) return;
    this.execute(
      [{ ...result, type: UiCommandType.ControlValidationResolve }],
      causalContext(context, result.requestId)
    );
  }

  private fail(failure: UiAsyncValidationFailure): void {
    const context = this.takeContext(failure.requestId);
    if (context === undefined) return;
    this.execute(
      [
        {
          error: errorMessage(failure.error),
          id: failure.id,
          reason: UiValidationCancellationReason.Failed,
          requestId: failure.requestId,
          type: UiCommandType.ControlValidationCancel
        }
      ],
      causalContext(context, failure.requestId)
    );
  }

  private cancelActor(id: string): string | undefined {
    const requestId = this.coordinator.cancel(id);
    if (requestId !== undefined) this.contexts.delete(requestId);
    return requestId;
  }

  private takeContext(requestId: string): ValidationContext | undefined {
    const context = this.contexts.get(requestId);
    this.contexts.delete(requestId);
    return context;
  }
}

type ControlSnapshot = UiNodeSnapshot & {
  readonly control: NonNullable<UiNodeSnapshot["control"]>;
};

function hasControl(node: UiNodeSnapshot | undefined): node is ControlSnapshot {
  return node?.control !== undefined;
}

function canValidate(node: ControlSnapshot): boolean {
  return [
    !node.base.disabled,
    node.control.errors.length === 0,
    node.control.asyncValidatorIds.length > 0
  ].every(Boolean);
}

function isValidationTrigger(command: UiCommand): boolean {
  return validationTriggers.has(command.type);
}

const validationTriggers = new Set<UiCommandType>([
  UiCommandType.ControlMarkTouched,
  UiCommandType.ControlSetDisabled,
  UiCommandType.ControlSetValue,
  UiCommandType.FormReset,
  UiCommandType.FormSubmit,
  UiCommandType.StructureInstantiate,
  UiCommandType.StructureReconcile
]);

function triggersNode(command: UiCommand, node: ControlSnapshot): boolean {
  if (command.type !== UiCommandType.ControlSetValue) return isValidationTrigger(command);
  return triggersInputNode(command.id, node);
}

function triggersInputNode(id: string, node: ControlSnapshot): boolean {
  return id !== node.id || node.control.updateOn === UiUpdateTrigger.Input;
}

function causalContext(context: ValidationContext, causationId: string): UiExecutionContext {
  return { causationId, correlationId: context.correlationId };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown async validation error";
}
