// @vitest-environment happy-dom

import { expect, it } from "vitest";

import {
  createMountedCollectionHarness,
  disposeMountedCollection,
  mutateMountedCollection
} from "./mounted-authored-collection-fixture.js";

it("mutates a mounted 500-item authored collection without authority or identity drift", () => {
  const harness = createMountedCollectionHarness();
  try {
    mutateMountedCollection(harness);
    expect(harness.application.document.nodesById["items"]?.controlChildIds).toHaveLength(501);
    expect(
      harness.application.document.nodesById["field::profile%2F00002%3A%3Aitem"]
    ).toBeDefined();
    mutateMountedCollection(harness);
    expect(harness.application.document.nodesById["items"]?.controlChildIds).toHaveLength(500);
    expect(
      harness.application.document.nodesById["field::profile%2F00002%3A%3Aitem"]
    ).toBeUndefined();
    expect(Object.keys(harness.application.document.nodesById)).toHaveLength(502);
    expect(harness.application.authored).toMatchObject({ revision: "3" });
  } finally {
    disposeMountedCollection(harness);
  }
});
