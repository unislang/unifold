import { Ajv2020 } from "ajv/dist/2020.js";
import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { UiCommandType, UiEventDataSchema, UiEventPhase } from "./index.js";
import type { UiEffectEventChange } from "./effect-event-data.js";

it("publishes a strict versioned schema for safe effect data", async () => {
  const schema = JSON.parse(
    await readFile(new URL("../schemas/effect-event-data.schema.json", import.meta.url), "utf8")
  ) as object;
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  const change: UiEffectEventChange = {
    commandType: UiCommandType.FocusRequest,
    targetId: "save"
  };
  const candidate = {
    change,
    phase: UiEventPhase.Effect,
    runtime: { documentId: "profile" }
  };

  expect(UiEventDataSchema.EffectV1).toBe(Reflect.get(schema, "$id"));
  expect(validate(candidate)).toBe(true);
  expect(validate({ ...candidate, providerSecret: "forbidden" })).toBe(false);
  expect(validate({ ...candidate, change: { ...candidate.change, error: "private" } })).toBe(false);
  expect(validate({ ...candidate, change: { commandType: UiCommandType.ControlSetValue } })).toBe(
    false
  );
});
