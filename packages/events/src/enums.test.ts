import { describe, expect, it } from "vitest";
import * as subject from "./enums.js";

describe("enums module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });

  it("defines enum-backed disclosure states and reasons", () => {
    expect(subject.UiEventDataSchema.EffectV1).toBe(
      "https://schemas.unifold.org/events/effect-data/1.0/schema.json"
    );
    expect(subject.UiEventDisclosureMode.MetadataOnly).toBe("metadata-only");
    expect(subject.UiEventRedactionReason.Classification).toBe("classification");
  });
});
