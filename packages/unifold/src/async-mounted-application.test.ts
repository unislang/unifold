// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";

import { AsyncMountedApplication } from "./async-mounted-application.js";
import type { AsyncStoreCommandController } from "./async-store-command-port.js";
import { prepareUnifoldDocument } from "./compiler.js";
import { authoredDocument } from "./application.test-data.js";
import type { UnifoldApplicationPort } from "./types.js";

it("delegates the mounted port and disposes the async controller once", () => {
  const prepared = prepareUnifoldDocument(authoredDocument()).prepared;
  if (prepared === undefined) throw new Error("Expected a prepared fixture.");
  const application = applicationPort(prepared.document);
  const dispose = vi.fn();
  const subject = new AsyncMountedApplication(
    application,
    { dispose } as unknown as AsyncStoreCommandController,
    prepared.document,
    {}
  );
  expect(subject.authored).toEqual(application.authored);
  expect(subject.machineState("flow")).toBe("flow");
  subject.dispose();
  subject.dispose();
  expect(dispose).toHaveBeenCalledOnce();
  expect(application.dispose).toHaveBeenCalledOnce();
});

function applicationPort(document: UnifoldApplicationPort["document"]): UnifoldApplicationPort {
  return {
    authored: { id: "authored" },
    dispose: vi.fn(),
    document,
    machineState: (id) => id,
    renderer: {} as UnifoldApplicationPort["renderer"],
    runtime: { revision: 1 } as UnifoldApplicationPort["runtime"],
    update: vi.fn()
  };
}
