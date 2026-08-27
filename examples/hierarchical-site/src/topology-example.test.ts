// @vitest-environment happy-dom
import { expect, it } from "vitest";

import { mountControlTopologyExample } from "./topology-example.js";

it("mounts independent visual and logical hierarchies from JSON", async () => {
  const container = document.createElement("div");
  const snapshotOutput = document.createElement("pre");
  const machineOutput = document.createElement("output");
  document.body.append(container, snapshotOutput, machineOutput);

  const controller = await mountControlTopologyExample(container, snapshotOutput, machineOutput);

  expect(controller.application.runtime.getSnapshot("legal-name")).toMatchObject({
    controlKey: "name",
    controlParentId: "identity-group",
    parentId: "identity-fields"
  });
  expect(controller.application.runtime.getSnapshot("identity-group")).toMatchObject({
    controlChildIds: ["legal-name", "preferred-name"],
    kind: "group"
  });
  expect(JSON.parse(snapshotOutput.textContent ?? "null")).toEqual({
    aliases: ["", ""],
    contacts: { home: "", work: "" },
    identity: { name: "", title: "" }
  });
  expect(machineOutput.textContent).toBe("editing");
  expect(controller.moduleIntegrity).toMatch(/^sha256-/u);
  controller.dispose();
  document.body.replaceChildren();
});
