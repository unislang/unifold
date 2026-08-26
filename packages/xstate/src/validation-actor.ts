import type { UiNodeSnapshot, UiValidationError } from "@unislang/unifold-events";
import type { UiAsyncValidatorRegistryPort } from "@unislang/unifold-forms";
import { createActor, fromPromise, type ActorRefFrom } from "xstate";

export interface UiValidationActorInput {
  readonly node: UiNodeSnapshot;
}

export function createValidationActorLogic(registry: UiAsyncValidatorRegistryPort) {
  return fromPromise<readonly UiValidationError[], UiValidationActorInput>(({ input, signal }) => {
    return registry.validate(input.node, signal);
  });
}

export type UiValidationActor = ActorRefFrom<ReturnType<typeof createValidationActorLogic>>;

export function createValidationActor(
  registry: UiAsyncValidatorRegistryPort,
  node: UiNodeSnapshot
): UiValidationActor {
  return createActor(createValidationActorLogic(registry), { input: { node } });
}
