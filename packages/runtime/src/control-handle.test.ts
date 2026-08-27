import { UiNodeKind } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { UnifoldRuntime } from "./runtime.js";
import { compositionNode, controlNode } from "./runtime.test-data.js";

it("exposes typed live control facts and commands over the authoritative store", () => {
  const runtime = new UnifoldRuntime({
    documentId: "handle-test",
    initialNodes: [controlNode("name", "Ada")]
  });
  const handle = runtime.control<string>("name");
  const values: string[] = [];
  const subscription = handle.value$.subscribe((value) => values.push(value));
  expect(handle.value).toBe("Ada");
  handle.setValue("Grace");
  handle.markTouched();
  expect(handle.value).toBe("Grace");
  expect(handle.snapshot.control).toMatchObject({ dirty: true, touched: true, value: "Grace" });
  expect(values).toEqual(["Ada", "Grace"]);
  handle.reset();
  expect(handle.value).toBe("Ada");
  subscription.unsubscribe();
  handle.dispose();
});

it("rejects a generic visual node as a control handle", () => {
  const runtime = new UnifoldRuntime({
    documentId: "handle-test",
    initialNodes: [{ ...compositionNode("panel"), kind: UiNodeKind.Component }]
  });
  expect(() => runtime.control("panel")).toThrow("Node is not a control: panel");
});
