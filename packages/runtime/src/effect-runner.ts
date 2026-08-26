import { UiEventType, type UiCommand, type UiTransactionRecord } from "@unislang/unifold-events";

import type { UiCommandPort, UiExecutionContext } from "./types.js";

interface UiEffectRunnerOptions {
  readonly active: () => boolean;
  readonly commandPort: UiCommandPort | undefined;
  readonly publish: (
    type: UiEventType,
    command: UiCommand,
    context: Required<UiExecutionContext>,
    record: UiTransactionRecord
  ) => void;
}

type ActiveUiEffectRunnerOptions = UiEffectRunnerOptions & { readonly commandPort: UiCommandPort };

export function runCommandEffects(
  commands: readonly UiCommand[],
  context: Required<UiExecutionContext>,
  record: UiTransactionRecord,
  options: UiEffectRunnerOptions
): void {
  const commandPort = options.commandPort;
  if (commandPort === undefined) return;
  const activeOptions = { ...options, commandPort };
  commands.forEach((command) => runEffect(command, context, record, activeOptions));
}

function runEffect(
  command: UiCommand,
  context: Required<UiExecutionContext>,
  record: UiTransactionRecord,
  options: ActiveUiEffectRunnerOptions
): void {
  options.publish(UiEventType.EffectRequested, command, context, record);
  try {
    const result = options.commandPort.execute(command, context);
    if (result === undefined)
      publishSettlement(UiEventType.EffectCompleted, command, context, record, options);
    else settleAsync(result, command, context, record, options);
  } catch {
    publishSettlement(UiEventType.EffectFailed, command, context, record, options);
  }
}

function settleAsync(
  result: Promise<void>,
  command: UiCommand,
  context: Required<UiExecutionContext>,
  record: UiTransactionRecord,
  options: UiEffectRunnerOptions
): void {
  void Promise.resolve(result).then(
    () => publishSettlement(UiEventType.EffectCompleted, command, context, record, options),
    () => publishSettlement(UiEventType.EffectFailed, command, context, record, options)
  );
}

function publishSettlement(
  type: UiEventType,
  command: UiCommand,
  context: Required<UiExecutionContext>,
  record: UiTransactionRecord,
  options: UiEffectRunnerOptions
): void {
  if (options.active()) options.publish(type, command, context, record);
}
