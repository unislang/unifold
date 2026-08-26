import {
  type DataActorCoordinator,
  type DataActorResolution,
  type DataRequest
} from "@unislang/unifold-data";
import { createActor, fromPromise, type ActorRefFrom } from "xstate";

export interface UiDataActorInput {
  readonly actorId: string;
  readonly request: DataRequest;
}

export function createDataActorLogic(coordinator: DataActorCoordinator) {
  return fromPromise<DataActorResolution, UiDataActorInput>(({ input, signal }) => {
    return coordinator.execute(input.actorId, input.request, signal);
  });
}

export type UiDataActor = ActorRefFrom<ReturnType<typeof createDataActorLogic>>;

export function createDataActor(
  coordinator: DataActorCoordinator,
  input: UiDataActorInput
): UiDataActor {
  return createActor(createDataActorLogic(coordinator), { input });
}
