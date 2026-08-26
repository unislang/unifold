import { DataClassification } from "@unislang/unifold-contracts";
import {
  DataActorCoordinator,
  DataActorDisposition,
  DataOfflineBehavior,
  DataOperationKind,
  DataProtocolVersion,
  DataResultStatus,
  DataSourceRegistry,
  type DataActorResolution,
  type DataQueryRequest
} from "@unislang/unifold-data";
import { expect, it } from "vitest";

import { createDataActor } from "./data-actor.js";

it("executes the common data contract through a cancellable XState promise actor", async () => {
  const registry = new DataSourceRegistry();
  registry.register("customers.search", async () => ({
    classification: DataClassification.Internal,
    data: [],
    invalidationTags: ["customers"],
    receivedAt: "2026-08-25T12:00:00.000Z",
    status: DataResultStatus.Success
  }));
  const coordinator = new DataActorCoordinator({ registry, sourceId: "tab-a" });
  const actor = createDataActor(coordinator, { actorId: "results", request: query() });
  const done = completion(actor);

  actor.start();
  await expect(done).resolves.toMatchObject({
    attempts: 1,
    disposition: DataActorDisposition.Committed,
    result: { status: DataResultStatus.Success }
  });
});

it("propagates actor stop to the registered adapter abort signal", async () => {
  let signal: AbortSignal | undefined;
  const registry = new DataSourceRegistry();
  registry.register("customers.search", async (invocation) => {
    signal = invocation.signal;
    await new Promise(() => undefined);
    throw new Error("unreachable");
  });
  const coordinator = new DataActorCoordinator({ registry, sourceId: "tab-a" });
  const actor = createDataActor(coordinator, { actorId: "results", request: query() });

  actor.start();
  await Promise.resolve();
  actor.stop();
  expect(signal?.aborted).toBe(true);
});

function completion(actor: ReturnType<typeof createDataActor>) {
  return new Promise<DataActorResolution>((resolve, reject) => {
    actor.subscribe({ complete: () => resolveOutput(actor, resolve, reject), error: reject });
  });
}

function resolveOutput(
  actor: ReturnType<typeof createDataActor>,
  resolve: (value: DataActorResolution) => void,
  reject: (reason: Error) => void
): void {
  const output = actor.getSnapshot().output;
  if (output === undefined) reject(new Error("Data actor completed without an output."));
  else resolve(output);
}

function query(): DataQueryRequest {
  return {
    cache: { freshForMs: 0, offline: DataOfflineBehavior.Fail, retainForMs: 60_000 },
    correlationId: "correlation-1",
    kind: DataOperationKind.Query,
    operationId: "customers.search",
    protocolVersion: DataProtocolVersion.Version1,
    requestId: "request-1",
    variables: {}
  };
}
