import { expect, it } from "vitest";
import { DataClassification } from "@unislang/unifold-contracts";

import { fingerprintText } from "./canonical.js";
import {
  completeStaticDocument,
  maliciousStaticDocument,
  prepareTestDocument,
  semanticDocument
} from "./static-html.test-data.js";
import { createPreparedStaticHtmlExport, createStaticHtmlExport } from "./static-html.js";
import {
  UnifoldExportFileName,
  UnifoldExportFormat,
  UnifoldExportMediaType,
  UnifoldExportStatus
} from "./types.js";

it("exports deterministic standalone HTML with an exact integrity manifest", async () => {
  const first = await createStaticHtmlExport(completeStaticDocument());
  const second = await createPreparedStaticHtmlExport(
    prepareTestDocument(completeStaticDocument())
  );
  expect(first).toEqual(second);
  if (first.status !== UnifoldExportStatus.Exported) throw new Error("Expected static HTML.");
  expect(first.output.content.startsWith("<!doctype html>")).toBe(true);
  expect(first.output.content.match(/type="application\/ld\+json"/gu)).toHaveLength(1);
  expect(first.output.content).toContain(
    '<summary>Review account change</summary><section role="dialog" aria-label="Confirm account change">'
  );
  expect(first.output.manifest).toMatchObject({
    fileName: UnifoldExportFileName.StaticHtml,
    format: UnifoldExportFormat.StaticHtml,
    mediaType: UnifoldExportMediaType.Html,
    sha256: await fingerprintText(first.output.content)
  });
  expect(first.output.manifestContent).toBe(
    JSON.stringify(first.output.manifest, Object.keys(first.output.manifest).sort())
  );
});

it("escapes visible content, attributes, titles, and JSON-LD script boundaries", async () => {
  const payload = `</script><script>alert('x')</script><img src=x onerror=alert(1)>`;
  const result = await createStaticHtmlExport(maliciousStaticDocument(payload));
  if (result.status !== UnifoldExportStatus.Exported) throw new Error("Expected static HTML.");
  expect(result.output.content.match(/<script/gu)).toHaveLength(1);
  expect(result.output.content.match(/<\/script>/gu)).toHaveLength(1);
  expect(result.output.content).not.toContain("<img");
  expect(result.output.content).not.toContain("<script>alert");
  expect(result.output.content).toContain("&lt;img src=x onerror=alert(1)&gt;");
});

it("rejects invalid input without returning a partial static artifact", async () => {
  const result = await createStaticHtmlExport({ revision: "invalid" });
  expect(result.status).toBe(UnifoldExportStatus.Rejected);
  expect("output" in result).toBe(false);
});

it("rejects a static artifact whose semantics would disclose non-public data", async () => {
  const result = await createStaticHtmlExport(semanticDocument(DataClassification.Restricted));
  expect(result.status).toBe(UnifoldExportStatus.Rejected);
  expect(result.diagnostics.map(({ code }) => code)).toContain("non-public-binding");
  expect("output" in result).toBe(false);
});
