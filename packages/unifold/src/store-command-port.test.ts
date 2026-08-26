import { UiCommandType } from "@unislang/unifold-events";
import { expect, it, vi } from "vitest";

import { createStoreCommandPort } from "./store-command-port.js";

it("routes non-store effects through the configured fallback port", () => {
  const execute = vi.fn();
  const port = createStoreCommandPort(
    { nodesById: {}, storesById: {} } as never,
    { bindings: {}, values: {} },
    {},
    { execute }
  );

  port.execute(
    { capability: "save", input: {}, type: UiCommandType.EffectInvoke },
    { causationId: "cause", correlationId: "correlation", transactionId: "transaction" }
  );

  expect(execute).toHaveBeenCalledOnce();
});
