import { UiEventType, type UiCommand, type UiTransactionRecord } from "@unislang/unifold-events";

import type {
  UiCommandPort,
  UiEffectExecutionContext,
  UiResolvedExecutionContext
} from "./types.js";

export interface UiCommandEffect {
  readonly command: UiCommand;
  readonly effectId: string;
}

interface UiEffectRunnerOptions {
  readonly active: () => boolean;
  readonly commandPort: UiCommandPort | undefined;
  readonly publish: (
    type: UiEventType,
    command: UiCommand,
    context: UiResolvedExecutionContext,
    record: UiTransactionRecord,
    effectId: string
  ) => void;
}

type ActiveUiEffectRunnerOptions = UiEffectRunnerOptions & { readonly commandPort: UiCommandPort };

export function runCommandEffects(
  effects: readonly UiCommandEffect[],
  context: UiResolvedExecutionContext,
  record: UiTransactionRecord,
  options: UiEffectRunnerOptions
): void {
  const commandPort = options.commandPort;
  if (commandPort === undefined) return;
  const activeOptions = { ...options, commandPort };
  effects.forEach((effect) => runEffect(effect, context, record, activeOptions));
}

function runEffect(
  effect: UiCommandEffect,
  context: UiResolvedExecutionContext,
  record: UiTransactionRecord,
  options: ActiveUiEffectRunnerOptions
): void {
  const { command, effectId } = effect;
  options.publish(UiEventType.EffectRequested, command, context, record, effectId);
  try {
    const result = options.commandPort.execute(command, effectContext(context, effectId));
    if (result === undefined)
      publishSettlement(UiEventType.EffectCompleted, effect, context, record, options);
    else settleAsync(result, effect, context, record, options);
  } catch {
    publishSettlement(UiEventType.EffectFailed, effect, context, record, options);
  }
}

function settleAsync(
  result: Promise<void>,
  effect: UiCommandEffect,
  context: UiResolvedExecutionContext,
  record: UiTransactionRecord,
  options: UiEffectRunnerOptions
): void {
  void Promise.resolve(result).then(
    () => publishSettlement(UiEventType.EffectCompleted, effect, context, record, options),
    () => publishSettlement(UiEventType.EffectFailed, effect, context, record, options)
  );
}

function publishSettlement(
  type: UiEventType,
  effect: UiCommandEffect,
  context: UiResolvedExecutionContext,
  record: UiTransactionRecord,
  options: UiEffectRunnerOptions
): void {
  if (options.active()) {
    options.publish(type, effect.command, context, record, effect.effectId);
  }
}

function effectContext(
  context: UiResolvedExecutionContext,
  effectId: string
): UiEffectExecutionContext {
  return { ...context, effectId };
}
