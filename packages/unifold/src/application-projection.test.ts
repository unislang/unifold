import { UiCommandType, UiEventType, type UiEvent } from "@unislang/unifold-events";
import { expect, it, vi } from "vitest";

import { ApplicationProjectionController } from "./application-projection.js";
import { authoredDocument, requirePrepared, runtimeFor } from "./application.test-data.js";

it("projects committed nodes and refreshes semantics after the application commit", () => {
  const prepared = requirePrepared(authoredDocument());
  const runtime = runtimeFor(prepared);
  const renderer = { project: vi.fn() };
  const semantics = { refreshRuntime: vi.fn() };
  let updating = false;
  const projection = new ApplicationProjectionController({
    document: () => prepared.document,
    renderer: renderer as never,
    runtime,
    semantics: semantics as never,
    updating: () => updating
  });
  const events: UiEvent[] = [];
  runtime.events$.subscribe((event) => events.push(event));

  runtime.execute([
    { id: "name", properties: { label: "Updated" }, type: UiCommandType.NodePatchProperties }
  ]);
  projection.onRuntimeEvent(requireTransaction(events));

  expect(renderer.project).toHaveBeenCalledOnce();
  expect(semantics.refreshRuntime).toHaveBeenCalledOnce();
  updating = true;
  projection.onRuntimeEvent(requireTransaction(events));
  expect(renderer.project).toHaveBeenCalledOnce();
  runtime.dispose();
});

it("suppresses only the already projected structural revision", () => {
  const prepared = requirePrepared(authoredDocument());
  const runtime = runtimeFor(prepared);
  const renderer = { project: vi.fn() };
  const projection = new ApplicationProjectionController({
    document: () => prepared.document,
    renderer: renderer as never,
    runtime,
    updating: () => false
  });
  const events: UiEvent[] = [];
  runtime.events$.subscribe((event) => events.push(event));
  const first = runtime.execute([
    { id: "name", properties: { label: "First" }, type: UiCommandType.NodePatchProperties }
  ]);
  projection.ignoreRevision(first.revision);
  projection.onRuntimeEvent(requireTransaction(events));
  expect(renderer.project).not.toHaveBeenCalled();

  runtime.execute([
    { id: "name", properties: { label: "Second" }, type: UiCommandType.NodePatchProperties }
  ]);
  projection.onRuntimeEvent(requireTransaction(events.slice(2)));
  expect(renderer.project).toHaveBeenCalledOnce();
  runtime.dispose();
});

function requireTransaction(events: readonly UiEvent[]): UiEvent {
  const event = events.find(({ type }) => type === UiEventType.TransactionCommitted);
  if (event === undefined) throw new Error("Transaction event is missing.");
  return event;
}
