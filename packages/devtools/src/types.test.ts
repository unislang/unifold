import { Ajv2020 } from "ajv/dist/2020.js";
import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { afterDocument, beforeDocument } from "./devtools.test-data.js";
import { createDocumentDiff } from "./diff.js";
import { DevtoolsProtocolVersion, DevtoolsReplayStatus } from "./types.js";

it("pins the devtools protocol and replay status vocabulary", () => {
  expect(DevtoolsProtocolVersion.Version1).toBe("1.0.0");
  expect(Object.values(DevtoolsReplayStatus)).toEqual(["diverged", "invalid", "succeeded"]);
});

it("validates exact replay plans and rejects extra authority", async () => {
  const schema = JSON.parse(
    await readFile(new URL("../schemas/replay-plan.schema.json", import.meta.url), "utf8")
  );
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  const diff = await createDocumentDiff(beforeDocument, afterDocument);
  const plan = {
    frames: [
      {
        baseFingerprint: diff.beforeFingerprint,
        expectedFingerprint: diff.afterFingerprint,
        operations: diff.operations,
        sequence: 1
      }
    ],
    initialDocument: beforeDocument,
    protocolVersion: DevtoolsProtocolVersion.Version1
  };
  expect(validate(plan)).toBe(true);
  expect(validate({ ...plan, actorId: "forged" })).toBe(false);
});
