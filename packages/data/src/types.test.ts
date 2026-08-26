import { DataClassification } from "@unislang/unifold-contracts";
import { Ajv2020 } from "ajv/dist/2020.js";
import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";

import {
  DataActorDisposition,
  DataOfflineBehavior,
  DataOperationKind,
  DataProtocolVersion,
  DataResultStatus,
  DataSchemaUri,
  type DataActorResolution,
  type DataQueryRequest
} from "./types.js";

it("exposes stable versioned data protocol literals", () => {
  const request: DataQueryRequest = {
    cache: { freshForMs: 1_000, offline: DataOfflineBehavior.LastKnownGood, retainForMs: 60_000 },
    correlationId: "correlation-1",
    kind: DataOperationKind.Query,
    operationId: "customers.search",
    protocolVersion: DataProtocolVersion.Version1,
    requestId: "request-1",
    variables: { query: "Ada" }
  };
  const resolution: DataActorResolution = {
    attempts: 1,
    disposition: DataActorDisposition.Committed,
    result: {
      classification: DataClassification.Internal,
      data: [],
      invalidationTags: ["customers"],
      receivedAt: "2026-08-25T12:00:00.000Z",
      status: DataResultStatus.Success
    }
  };

  expect(request.protocolVersion).toBe("1.0.0");
  expect(resolution.result.status).toBe("success");
  expect(DataSchemaUri.Version1).toContain("/data/1.0/");
});

it("validates exact query and result envelopes with the published schema", async () => {
  const schema = JSON.parse(
    await readFile(new URL("../schemas/data-protocol.schema.json", import.meta.url), "utf8")
  );
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  const request = {
    cache: { freshForMs: 1_000, offline: "last-known-good", retainForMs: 60_000 },
    correlationId: "correlation-1",
    kind: "query",
    operationId: "customers.search",
    protocolVersion: "1.0.0",
    requestId: "request-1",
    variables: { query: "Ada" }
  };
  expect(validate(request)).toBe(true);
  expect(validate({ ...request, url: "https://attacker.invalid" })).toBe(false);
  expect(
    validate({
      classification: "internal",
      data: [],
      invalidationTags: ["customers"],
      receivedAt: "2026-08-25T12:00:00.000Z",
      status: "success"
    })
  ).toBe(true);
});
