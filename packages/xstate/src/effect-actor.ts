import type { JsonValue } from "@unislang/unifold-contracts";
import type { EffectInvokeCommand } from "@unislang/unifold-events";
import { fromPromise } from "xstate";

export interface UiEffectContext {
  readonly actorId?: string;
  readonly correlationId: string;
  readonly requestId: string;
  readonly transactionId: string;
}

export interface UiEffectActorInput {
  readonly command: EffectInvokeCommand;
  readonly context: UiEffectContext;
}

export interface UiEffectInvocation {
  readonly capability: string;
  readonly input: EffectInvokeCommand["input"];
  readonly context: UiEffectContext;
  readonly signal: AbortSignal;
}

export type UiEffectHandler = (invocation: UiEffectInvocation) => Promise<JsonValue>;

export class UiEffectRegistry {
  private readonly handlers = new Map<string, UiEffectHandler>();

  register(capability: string, handler: UiEffectHandler): () => void {
    if (this.handlers.has(capability)) {
      throw new Error(`Effect capability is already registered: ${capability}`);
    }
    this.handlers.set(capability, handler);
    return () => this.handlers.delete(capability);
  }

  invoke(actorInput: UiEffectActorInput, signal: AbortSignal): Promise<JsonValue> {
    const { command, context } = actorInput;
    const handler = this.handlers.get(command.capability);
    if (!handler) throw new Error(`Unknown effect capability: ${command.capability}`);
    return handler({
      capability: command.capability,
      input: command.input,
      context,
      signal
    });
  }
}

export function createEffectActorLogic(registry: UiEffectRegistry) {
  return fromPromise<JsonValue, UiEffectActorInput>(({ input, signal }) => {
    return registry.invoke(input, signal);
  });
}
