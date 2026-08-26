import type { ControlPlaneEffectHandler, ControlPlaneEffectRegistryPort } from "./ports.js";

export function createReferenceEffectRegistry(
  effects: Readonly<Record<string, ControlPlaneEffectHandler>> = {}
): ControlPlaneEffectRegistryPort {
  const records = new Map(Object.entries(effects));
  return Object.freeze({
    resolve(effectId: string) {
      return records.get(effectId);
    }
  });
}
