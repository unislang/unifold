import {
  JsonUiProfileName,
  JsonUiProfileVersion,
  JsonUiUpstreamRevision,
  UiContractSchemaUri,
  UiSchemaVersion,
  type JsonObject
} from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { createPortableJsonExport } from "./portable.js";
import { UnifoldExportFileName, UnifoldExportFormat, UnifoldExportStatus } from "./types.js";

it("exports reproducible authored JSON with an integrity manifest", async () => {
  const first = await createPortableJsonExport(exportDocument());
  const second = await createPortableJsonExport(exportDocument());
  expect(first).toEqual(second);
  if (first.status !== UnifoldExportStatus.Exported) throw new Error("Expected an export.");
  expect(first.output.manifest).toMatchObject({
    documentId: "export-test",
    fileName: UnifoldExportFileName.UiDocument,
    format: UnifoldExportFormat.PortableJson,
    sha256: expect.stringMatching(/^[a-f0-9]{64}$/u)
  });
  expect(first.output.content).toContain('"revision":"1"');
});

it("rejects invalid authored JSON without producing an artifact", async () => {
  const result = await createPortableJsonExport({ revision: "invalid" });
  expect(result.status).toBe(UnifoldExportStatus.Rejected);
  expect("output" in result).toBe(false);
});

function exportDocument(): JsonObject {
  return {
    $schema: UiContractSchemaUri.Version1,
    catalog: { name: "unifold-core", version: "1.0.0" },
    compositions: [],
    id: "export-test",
    jsonUiProfile: {
      name: JsonUiProfileName.Unifold,
      upstream: JsonUiUpstreamRevision.Version01025,
      version: JsonUiProfileVersion.Version1
    },
    revision: "1",
    schemaVersion: UiSchemaVersion.Version1,
    view: { $comp: "Button", id: "save", label: "Save" }
  };
}
