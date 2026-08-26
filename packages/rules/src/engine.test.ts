import { expect, it } from "vitest";

import { runJsonLogic } from "./engine.js";

it("uses the synchronous OSS interpreter for allowlisted expressions", () => {
  expect(
    runJsonLogic(
      { and: [{ ">=": [{ var: "age" }, 18] }, { var: "accepted" }] },
      { accepted: true, age: 21 }
    )
  ).toBe(true);
});

it("does not expose methods outside the Unifold allowlist", () => {
  expect(() => runJsonLogic({ throw: "blocked" }, {})).toThrow();
  expect(() => runJsonLogic({ "/": [0, 0] }, {})).toThrow("non-JSON");
});

it("accepts nested JSON values and rejects non-JSON interpreter results", () => {
  const payload = { items: [null, "safe", 1] };
  expect(runJsonLogic({ var: "payload" }, { payload })).toEqual(payload);

  const cyclic: Record<string, unknown> = {};
  cyclic["self"] = cyclic;
  expect(() => runJsonLogic({ var: "payload" }, { payload: cyclic as never })).toThrow("non-JSON");
  expect(() => runJsonLogic({ var: "payload" }, { payload: new Date() as never })).toThrow(
    "non-JSON"
  );
});
