import { UiCommandType } from "@unislang/unifold-events";
import { expect, it, vi } from "vitest";

import { createStoreCommandPort } from "./store-command-port.js";

it("returns non-store effect settlement from the configured fallback port", async () => {
  const settlement = Promise.resolve();
  const execute = vi.fn(() => settlement);
  const port = createStoreCommandPort(
    { nodesById: {}, storesById: {} } as never,
    { bindings: {}, values: {} },
    {},
    { execute }
  );

  const result = port.execute(
    { capability: "save", input: {}, type: UiCommandType.EffectInvoke },
    { causationId: "cause", correlationId: "correlation", transactionId: "transaction" }
  );

  expect(result).toBe(settlement);
  await result;
  expect(execute).toHaveBeenCalledOnce();
});
