import { Ajv2020 } from "ajv/dist/2020.js";
import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";

import {
  CollaborationActorType,
  CollaborationConflictKind,
  CollaborationOperation,
  CollaborationProtocolVersion,
  CollaborationStatus
} from "./types.js";
import { proposalRequest } from "./collaboration.test-data.js";

it("pins the collaboration protocol and closed status vocabulary", () => {
  expect(CollaborationProtocolVersion.Version1).toBe("1.0.0");
  expect(Object.values(CollaborationOperation)).toHaveLength(6);
  expect(Object.values(CollaborationActorType)).toEqual([
    "ai",
    "automation",
    "human",
    "import",
    "migration"
  ]);
  expect(Object.values(CollaborationConflictKind)).toHaveLength(8);
  expect(Object.values(CollaborationStatus)).toContain("review-required");
});

it("validates exact requests and rejects client-supplied actor authority", async () => {
  const schema = JSON.parse(
    await readFile(new URL("../schemas/collaboration.schema.json", import.meta.url), "utf8")
  );
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  const request = proposalRequest();
  expect(validate(request)).toBe(true);
  expect(validate({ ...request, actorId: "forged", tenantId: "forged" })).toBe(false);
});
