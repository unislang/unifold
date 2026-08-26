import { expect, it } from "vitest";

import { metadata, session } from "./control-plane.test-data.js";
import { commitCommand } from "./service-commands.js";
import { ControlPlaneOperation } from "./types.js";

it("projects trusted actor metadata and optional concurrency into store commands", () => {
  const request = {
    ...metadata(ControlPlaneOperation.DocumentCommit),
    document: { revision: "client" },
    expectedRevision: "revision-1",
    objectId: "document-1"
  };
  const command = commitCommand({ clock: { now: () => "now" } }, request, session);
  expect(command.actorId).toBe("actor-1");
  expect(command.expectedRevision).toBe("revision-1");
  expect(command.traceparent).toBe(request.traceparent);
});
