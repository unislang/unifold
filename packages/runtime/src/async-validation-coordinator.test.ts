import type { UiAsyncValidatorRegistryPort } from "@unislang/unifold-forms";
import type { UiValidationError } from "@unislang/unifold-events";
import { expect, it, vi } from "vitest";

import { UiAsyncValidationCoordinator } from "./async-validation-coordinator.js";
import { controlNode } from "./runtime.test-data.js";

it("completes only the currently authoritative validation request", async () => {
  const pending = new Map<string, (errors: readonly UiValidationError[]) => void>();
  const registry: UiAsyncValidatorRegistryPort = {
    validate: vi.fn(
      (node) =>
        new Promise<readonly UiValidationError[]>((resolve) =>
          pending.set(String(node.control?.value), resolve)
        )
    )
  };
  const complete = vi.fn();
  const coordinator = new UiAsyncValidationCoordinator(registry, { complete, fail: vi.fn() });

  coordinator.start(controlNode("name", "old"), "request-old");
  coordinator.start(controlNode("name", "new"), "request-new");
  pending.get("old")?.([]);
  pending.get("new")?.([]);
  await Promise.resolve();

  expect(complete).toHaveBeenCalledOnce();
  expect(complete).toHaveBeenCalledWith({ errors: [], id: "name", requestId: "request-new" });
});

it("aborts an active request when cancelled", () => {
  let signal: AbortSignal | undefined;
  const registry: UiAsyncValidatorRegistryPort = {
    validate: vi.fn(async (_node, nextSignal) => {
      signal = nextSignal;
      await new Promise(() => undefined);
      return [];
    })
  };
  const coordinator = new UiAsyncValidationCoordinator(registry, {
    complete: vi.fn(),
    fail: vi.fn()
  });

  coordinator.start(controlNode("name", "Ada"), "request");
  expect(coordinator.cancel("name")).toBe("request");
  expect(signal?.aborted).toBe(true);
});
