import type { JsonObject } from "@unislang/unifold-contracts";
import { applyPatch, type Operation } from "rfc6902";

import { documentFingerprint } from "./diff.js";
import {
  DevtoolsReplayStatus,
  type DevtoolsReplayFrame,
  type DevtoolsReplayPlan,
  type DevtoolsReplayResult,
  type DevtoolsReplayValidationPort
} from "./types.js";
import { devtoolsReplayPlanErrors, isDevtoolsReplayPlan } from "./validation.js";

export async function replayDocument(
  plan: unknown,
  validation: DevtoolsReplayValidationPort
): Promise<DevtoolsReplayResult> {
  if (!isDevtoolsReplayPlan(plan)) return invalidPlan(plan);
  const document = structuredClone(plan.initialDocument);
  return replayFrames(document, plan.frames, validation);
}

async function replayFrames(
  document: JsonObject,
  frames: DevtoolsReplayPlan["frames"],
  validation: DevtoolsReplayValidationPort
): Promise<DevtoolsReplayResult> {
  for (const [index, frame] of frames.entries()) {
    const failure = await applyFrame(document, frame, index + 1, validation);
    if (failure !== undefined) return { ...failure, appliedFrames: index };
  }
  return {
    appliedFrames: frames.length,
    diagnostics: [],
    document: freezeJson(document),
    status: DevtoolsReplayStatus.Succeeded
  };
}

async function applyFrame(
  document: JsonObject,
  frame: DevtoolsReplayFrame,
  expectedSequence: number,
  validation: DevtoolsReplayValidationPort
): Promise<Omit<DevtoolsReplayResult, "appliedFrames"> | undefined> {
  if (frame.sequence !== expectedSequence) return diverged("replay.sequence");
  const baseFailure = await verifyBase(document, frame);
  if (baseFailure !== undefined) return baseFailure;
  return applyValidatedFrame(document, frame, validation);
}

async function verifyBase(
  document: JsonObject,
  frame: DevtoolsReplayFrame
): Promise<Omit<DevtoolsReplayResult, "appliedFrames"> | undefined> {
  return (await documentFingerprint(document)) === frame.baseFingerprint
    ? undefined
    : diverged("replay.base");
}

async function applyValidatedFrame(
  document: JsonObject,
  frame: DevtoolsReplayFrame,
  validation: DevtoolsReplayValidationPort
): Promise<Omit<DevtoolsReplayResult, "appliedFrames"> | undefined> {
  if (!applyOperations(document, frame)) return diverged("replay.patch");
  const diagnostics = validation.validate(document);
  if (diagnostics.length > 0) return { diagnostics, status: DevtoolsReplayStatus.Invalid };
  return verifyExpectedFingerprint(document, frame);
}

async function verifyExpectedFingerprint(
  document: JsonObject,
  frame: DevtoolsReplayFrame
): Promise<Omit<DevtoolsReplayResult, "appliedFrames"> | undefined> {
  return (await documentFingerprint(document)) === frame.expectedFingerprint
    ? undefined
    : diverged("replay.fingerprint");
}

function applyOperations(document: JsonObject, frame: DevtoolsReplayFrame): boolean {
  try {
    return applyPatch(document, frame.operations as unknown as Operation[]).every(
      (result) => result === null
    );
  } catch {
    return false;
  }
}

function invalidPlan(plan: unknown): DevtoolsReplayResult {
  return {
    appliedFrames: 0,
    diagnostics: devtoolsReplayPlanErrors(plan),
    status: DevtoolsReplayStatus.Invalid
  };
}

function diverged(diagnostic: string): Omit<DevtoolsReplayResult, "appliedFrames"> {
  return { diagnostics: [diagnostic], status: DevtoolsReplayStatus.Diverged };
}

function freezeJson<T extends JsonObject>(value: T): T {
  Object.values(value).forEach(freezeChild);
  return Object.freeze(value);
}

function freezeChild(value: unknown): void {
  if (Array.isArray(value)) return freezeArray(value);
  freezeRecord(value);
}

function freezeRecord(value: unknown): void {
  if (value !== null && typeof value === "object") freezeJson(value as JsonObject);
}

function freezeArray(value: unknown[]): void {
  value.forEach(freezeChild);
  Object.freeze(value);
}
