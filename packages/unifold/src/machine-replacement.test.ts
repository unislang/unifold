import { expect, it, vi } from "vitest";

import { UiMachineReplacement, type UiMachineRecord } from "./machine-replacement.js";

it("activates and commits replacement records before containing obsolete shutdown", () => {
  const previous = record(() => {
    throw new Error("stop failed");
  });
  const candidate = record();
  const install = vi.fn();
  const replacement = new UiMachineReplacement(
    new Map([["workflow", previous]]),
    new Map([["workflow", candidate]]),
    install
  );

  replacement.activate();
  expect(() => replacement.commit()).not.toThrow();
  expect(install).toHaveBeenCalledOnce();
  expect(previous.unregister).toHaveBeenCalledOnce();
  expect(() => replacement.activate()).toThrow("closed");
});

it("restores prior records and disposes only candidates on discard", () => {
  const previous = record();
  const candidate = record();
  const before = new Map([["workflow", previous]]);
  const install = vi.fn();
  const replacement = new UiMachineReplacement(before, new Map([["workflow", candidate]]), install);

  replacement.activate();
  replacement.discard();
  replacement.discard();
  expect(install).toHaveBeenLastCalledWith(before);
  expect(candidate.unregister).toHaveBeenCalledOnce();
  expect(candidate.actor.stop).toHaveBeenCalledOnce();
  expect(previous.actor.stop).not.toHaveBeenCalled();
});

function record(stop: () => void = vi.fn()): UiMachineRecord {
  return {
    actor: { send: vi.fn(), start: vi.fn(), state: "editing", stop } as never,
    key: "key",
    unregister: vi.fn()
  };
}
