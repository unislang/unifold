import { DataClassification } from "@unislang/unifold-contracts";
import type { UnifoldIrDocument } from "@unislang/unifold-ir";
import { expect, it } from "vitest";

import {
  documentWithView,
  prepareTestDocument,
  semanticDocument
} from "./static-html.test-data.js";
import { renderStaticTree } from "./static-renderer.js";

it("exports every authorized audit entry as escaped list and time semantics", () => {
  const html = renderStaticTree(prepareTestDocument(auditDocument(205)).document);
  expect(html.match(/<li/gu)).toHaveLength(205);
  expect(html).toContain('<time datetime="2026-08-25T12:00:00Z">');
  expect(html).toContain('data-entry-id="event-204"');
  expect(html).toContain("&lt;script&gt;change 204&lt;/script&gt;");
  expect(html).not.toContain("<script>change");
});

it("redacts the complete audit payload when its source is classified", () => {
  const source = prepareTestDocument(auditDocument(1)).document;
  const stores = prepareTestDocument(semanticDocument(DataClassification.Restricted)).document
    .storesById;
  const node = source.nodesById["audit"];
  if (node === undefined) throw new Error("Expected audit node.");
  const restricted: UnifoldIrDocument = {
    ...source,
    nodesById: {
      ...source.nodesById,
      audit: { ...node, binding: { path: "/name", store: "profile" } }
    },
    storesById: stores
  };
  const html = renderStaticTree(restricted);
  expect(html).toContain("<section><h2></h2><ol></ol></section>");
  expect(html).not.toContain("Ada");
});

function auditDocument(count: number) {
  return documentWithView({
    $comp: "AuditLog",
    entries: Array.from({ length: count }, (_, index) => ({
      action: "updated",
      actor: "Ada",
      id: `event-${index}`,
      summary: `<script>change ${index}</script>`,
      timestamp: "2026-08-25T12:00:00Z"
    })),
    id: "audit",
    label: "Account history"
  });
}
