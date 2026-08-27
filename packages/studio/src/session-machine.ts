import { createActor, setup, type ActorRefFrom } from "xstate";

import { StudioSessionState } from "./types.js";

export enum StudioSessionEventType {
  Applied = "applied",
  Apply = "apply",
  Dispose = "dispose",
  Failed = "failed",
  Previewed = "previewed",
  Request = "request",
  Review = "review"
}

export interface StudioSessionEvent {
  readonly type: StudioSessionEventType;
}

export const studioSessionMachine = setup({
  types: { events: {} as StudioSessionEvent }
}).createMachine({
  id: "unifold-studio-session",
  initial: StudioSessionState.Idle,
  states: {
    [StudioSessionState.Applied]: commonRequestState(),
    [StudioSessionState.Applying]: resultState(StudioSessionEventType.Applied),
    [StudioSessionState.Disposed]: { type: "final" },
    [StudioSessionState.Failed]: commonRequestState(),
    [StudioSessionState.Generating]: generatingState(),
    [StudioSessionState.Idle]: commonRequestState(),
    [StudioSessionState.PreviewReady]: previewState(),
    [StudioSessionState.ReviewRequired]: reviewState()
  }
});

export type StudioSessionActor = ActorRefFrom<typeof studioSessionMachine>;

export function createStudioSessionActor(): StudioSessionActor {
  return createActor(studioSessionMachine).start();
}

function commonRequestState() {
  return {
    on: commonTransitions()
  };
}

function commonTransitions() {
  return {
    [StudioSessionEventType.Dispose]: StudioSessionState.Disposed,
    [StudioSessionEventType.Failed]: StudioSessionState.Failed,
    [StudioSessionEventType.Request]: StudioSessionState.Generating
  };
}

function generatingState() {
  return {
    on: {
      ...commonTransitions(),
      [StudioSessionEventType.Previewed]: StudioSessionState.PreviewReady,
      [StudioSessionEventType.Review]: StudioSessionState.ReviewRequired
    }
  };
}

function previewState() {
  return {
    on: {
      ...commonTransitions(),
      [StudioSessionEventType.Apply]: StudioSessionState.Applying
    }
  };
}

function reviewState() {
  return { on: commonTransitions() };
}

function resultState(success: StudioSessionEventType) {
  return {
    on: {
      ...commonTransitions(),
      [success]: StudioSessionState.Applied
    }
  };
}
