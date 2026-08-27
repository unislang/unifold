import type { JsonObject } from "@unislang/unifold-contracts";
import { UiCommandType, type UiCommand } from "@unislang/unifold-events";
import type { UiCommandPort } from "@unislang/unifold-runtime";
import canonicalize from "canonicalize";

export interface DevtoolsPortableReplayControls {
  readonly clock: readonly string[];
  readonly randomness: readonly string[];
}

export interface DevtoolsMockEffect {
  readonly capability: string;
  readonly input: JsonObject;
  readonly outcome: "completed" | "failed";
  readonly receipt: JsonObject;
}

export interface DevtoolsMockEffectReceipt extends JsonObject {
  readonly capability: string;
  readonly outcome: "completed" | "failed";
  readonly receipt: JsonObject;
}

export interface DevtoolsPortableReplayControlPort {
  readonly clockCount: number;
  readonly randomCount: number;
  now(): string;
  random(): string;
}

export interface DevtoolsPortableReplayEffectPort extends UiCommandPort {
  readonly count: number;
  readonly receipts: readonly DevtoolsMockEffectReceipt[];
}

export function createPortableReplayControlPort(
  controls: DevtoolsPortableReplayControls
): DevtoolsPortableReplayControlPort {
  return new PortableReplayControlSequence(controls);
}

export function createPortableReplayEffectPort(
  effects: readonly DevtoolsMockEffect[]
): DevtoolsPortableReplayEffectPort {
  return new PortableReplayEffects(effects);
}

class PortableReplayControlSequence implements DevtoolsPortableReplayControlPort {
  clockCount = 0;
  randomCount = 0;

  constructor(private readonly controls: DevtoolsPortableReplayControls) {}

  now(): string {
    return take(this.controls.clock, this.clockCount++, "clock");
  }

  random(): string {
    return take(this.controls.randomness, this.randomCount++, "randomness");
  }
}

class PortableReplayEffects implements DevtoolsPortableReplayEffectPort {
  count = 0;
  readonly #receipts: DevtoolsMockEffectReceipt[] = [];

  constructor(private readonly effects: readonly DevtoolsMockEffect[]) {}

  get receipts(): readonly DevtoolsMockEffectReceipt[] {
    return Object.freeze([...this.#receipts]);
  }

  execute(command: UiCommand): void {
    if (command.type !== UiCommandType.EffectInvoke) return;
    const effect = take(this.effects, this.count++, "mocked effect");
    requireEffectMatch(command, effect);
    this.#receipts.push(receipt(effect));
    requireCompletedEffect(effect);
  }
}

function receipt(effect: DevtoolsMockEffect): DevtoolsMockEffectReceipt {
  return Object.freeze({
    capability: effect.capability,
    outcome: effect.outcome,
    receipt: effect.receipt
  });
}

function requireEffectMatch(
  command: Extract<UiCommand, { readonly type: UiCommandType.EffectInvoke }>,
  effect: DevtoolsMockEffect
): void {
  if (command.capability !== effect.capability) throw new Error("Mocked effect capability drift.");
  if (canonicalize(command.input) !== canonicalize(effect.input)) {
    throw new Error("Mocked effect input drift.");
  }
}

function requireCompletedEffect(effect: DevtoolsMockEffect): void {
  if (effect.outcome === "failed") throw new Error("Explicit mocked effect failure.");
}

function take<T>(values: readonly T[], index: number, name: string): T {
  const value = values[index];
  if (value === undefined) throw new Error(`Portable replay exhausted ${name} controls.`);
  return value;
}
