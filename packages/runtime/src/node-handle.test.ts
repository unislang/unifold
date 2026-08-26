import { UiCommandType } from "@unislang/unifold-events";
import { expect, it, vi } from "vitest";

import { UnifoldRuntime } from "./index.js";
import { controlNode } from "./runtime.test-data.js";

it("exposes live snapshots, selections, and indexed events", () => {
  const runtime = new UnifoldRuntime({
    documentId: "test",
    initialNodes: [controlNode("field", "A")]
  });
  const handle = runtime.node("field");
  const observed = vi.fn();
  const selected = handle.select((snapshot) => snapshot.control?.value);
  handle.events$.subscribe(observed);
  runtime.execute([{ type: UiCommandType.ControlSetValue, id: "field", value: "B" }]);
  expect(handle.snapshot.control).toMatchObject({ value: "B", rawValue: "B", dirty: true });
  expect(selected.get()).toBe("B");
  expect(observed).toHaveBeenCalledTimes(2);
  expect(() => runtime.node("missing")).toThrow("Unknown node: missing");
});
