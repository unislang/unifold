// @vitest-environment happy-dom
import { expect, it } from "vitest";

import { authoredDocument } from "./application.test-data.js";
import {
  UnifoldApplicationMountStatus,
  UnifoldDocumentIntegrity,
  UnifoldDocumentTrustRequirement,
  createTrustedLayoutDefinitionRegistry,
  loadAndMountUnifoldApplication
} from "./index.js";
import { layoutDocument } from "./compiler-layout.test-data.js";

it("loads, compiles, and mounts through one trusted ingress", async () => {
  const container = document.createElement("div");
  const result = await loadAndMountUnifoldApplication(
    JSON.stringify(authoredDocument()),
    container,
    { trustRequirement: UnifoldDocumentTrustRequirement.AllowUnsigned }
  );
  expect(result.status).toBe(UnifoldApplicationMountStatus.Mounted);
  if (result.status !== UnifoldApplicationMountStatus.Mounted) return;
  expect(result.provenance.integrity).toBe(UnifoldDocumentIntegrity.Unsigned);
  expect(container.querySelector("unifold-text-field")).not.toBeNull();
  result.application.dispose();
});

it("does not register or render when trusted loading rejects", async () => {
  const container = document.createElement("div");
  const result = await loadAndMountUnifoldApplication("not-json", container, {
    trustRequirement: UnifoldDocumentTrustRequirement.RequireSignature
  });
  expect(result.status).toBe(UnifoldApplicationMountStatus.Rejected);
  expect(container.children).toHaveLength(0);
});

it("uses one trusted layout registry for loading, mounting, and later updates", async () => {
  const source = layoutDocument();
  const layoutRegistry = createTrustedLayoutDefinitionRegistry(source.layouts);
  Reflect.deleteProperty(source, "layouts");
  const result = await loadAndMountUnifoldApplication(JSON.stringify(source), document.body, {
    layoutRegistry,
    trustRequirement: UnifoldDocumentTrustRequirement.AllowUnsigned
  });
  expect(result.status).toBe(UnifoldApplicationMountStatus.Mounted);
  if (result.status !== UnifoldApplicationMountStatus.Mounted) return;
  const next = structuredClone(source);
  next.revision = "2";
  expect(result.application.update(next).status).toBe("applied");
  result.application.dispose();
});
