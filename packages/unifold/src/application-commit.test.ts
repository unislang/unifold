import { expect, it } from "vitest";

import { commitApplicationCandidate, prepareApplicationCandidate } from "./application-commit.js";

it("prepares rendering, projection, semantics, and machine replacement in order", () => {
  const trace: string[] = [];
  const replacement = {};
  const options = {
    coordination: {},
    document: { document: { machines: [], nodesById: {} } },
    machines: { prepareReplacement: () => (trace.push("machines"), replacement) },
    projection: { projectAll: () => trace.push("project") },
    renderer: { update: () => trace.push("render") },
    runtime: {},
    semantics: { publishRuntime: () => trace.push("semantics") }
  };

  expect(prepareApplicationCandidate(options as never)).toBe(replacement);
  expect(trace).toEqual(["render", "project", "semantics", "machines"]);
});

it("activates, publishes, and settles a prepared replacement", () => {
  const trace: string[] = [];
  const coordination = { commit: () => trace.push("runtime") };
  commitApplicationCandidate({
    coordination: coordination as never,
    projection: {
      finishCommit: () => trace.push("finish"),
      ignoreRevision: (revision: number) => trace.push(`revision:${revision}`)
    } as never,
    replacement: {
      activate: () => trace.push("activate"),
      commit: () => trace.push("machines")
    } as never,
    revision: 7
  });
  expect(trace).toEqual(["activate", "revision:7", "runtime", "machines", "finish"]);
});
