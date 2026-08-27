import { expect, it } from "vitest";

import { StudioSessionState } from "./types.js";
import { createStudioSessionActor, StudioSessionEventType } from "./session-machine.js";

it("models request, preview, apply, and disposal as explicit XState transitions", () => {
  const actor = createStudioSessionActor();
  expect(actor.getSnapshot().value).toBe(StudioSessionState.Idle);
  actor.send({ type: StudioSessionEventType.Request });
  expect(actor.getSnapshot().value).toBe(StudioSessionState.Generating);
  actor.send({ type: StudioSessionEventType.Previewed });
  expect(actor.getSnapshot().value).toBe(StudioSessionState.PreviewReady);
  actor.send({ type: StudioSessionEventType.Apply });
  expect(actor.getSnapshot().value).toBe(StudioSessionState.Applying);
  actor.send({ type: StudioSessionEventType.Applied });
  expect(actor.getSnapshot().value).toBe(StudioSessionState.Applied);
  actor.send({ type: StudioSessionEventType.Dispose });
  expect(actor.getSnapshot().value).toBe(StudioSessionState.Disposed);
});

it("routes review and failure without inventing a second state authority", () => {
  const actor = createStudioSessionActor();
  actor.send({ type: StudioSessionEventType.Request });
  actor.send({ type: StudioSessionEventType.Review });
  expect(actor.getSnapshot().value).toBe(StudioSessionState.ReviewRequired);
  actor.send({ type: StudioSessionEventType.Request });
  actor.send({ type: StudioSessionEventType.Failed });
  expect(actor.getSnapshot().value).toBe(StudioSessionState.Failed);
});
