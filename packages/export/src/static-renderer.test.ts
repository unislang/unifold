import { CoreComponentType, DataClassification } from "@unislang/unifold-contracts";
import type { UnifoldIrDocument, UnifoldIrNode } from "@unislang/unifold-ir";
import { expect, it } from "vitest";

import {
  completeStaticDocument,
  prepareTestDocument,
  semanticDocument
} from "./static-html.test-data.js";
import { renderStaticTree, staticNodeClassification } from "./static-renderer.js";

it("renders every reference component as nested native fallback markup", () => {
  const prepared = prepareTestDocument(completeStaticDocument());
  const html = renderStaticTree(prepared.document);
  Object.values(CoreComponentType).forEach((component) => {
    expect(html).toContain(`data-unifold-static-component="${component}"`);
  });
  expect(html).toContain('data-unifold-static-document="static-test"');
  expect(html).toContain('data-unifold-static-control="name"');
  expect(html).not.toContain('data-unifold-static-control="form"');
  expect(html).not.toContain('data-unifold-static-control="save"');
  expect(html).not.toContain('data-unifold-static-control="help"');
  expect(html).toContain("<form");
  expect(html).toContain("<details");
  expect(html).toContain("<textarea");
  expect(html).toContain("<select");
  expect(html).not.toContain("must-not-export");
  expect(staticNodeIds(html)).toEqual(prepared.document.renderOrder);
});

it("omits non-public bound values from native controls", () => {
  const prepared = prepareTestDocument(
    semanticDocument(DataClassification.Restricted, "classified-secret")
  );
  const node = prepared.document.nodesById["name"];
  if (node === undefined) throw new Error("Expected the classified node.");
  expect(staticNodeClassification(prepared.document, node)).toBe(DataClassification.Restricted);
  expect(renderStaticTree(prepared.document)).not.toContain("classified-secret");
  expect(
    staticNodeClassification(prepared.document, {
      ...node,
      binding: { path: "/", store: "missing" }
    })
  ).toBe(DataClassification.NeverExport);
});

it("omits non-public boolean and multiple-choice state", () => {
  const source = prepareTestDocument(completeStaticDocument()).document;
  const classified = prepareTestDocument(semanticDocument(DataClassification.Restricted)).document;
  const document = withRestrictedBindings(source, classified, ["newsletter", "skills"]);
  const html = renderStaticTree(document);
  expect(nodeMarkup(html, "newsletter")).not.toMatch(/ checked/u);
  expect(nodeMarkup(html, "skills")).not.toMatch(/ selected/u);
});

it("renders an explicit empty option for an unselected Combobox fallback", () => {
  const source = prepareTestDocument(completeStaticDocument()).document;
  const node = requireNode(source, "assignee");
  const document = {
    ...source,
    nodesById: {
      ...source.nodesById,
      assignee: { ...node, properties: { ...node.properties, value: "" } }
    }
  };
  expect(nodeMarkup(renderStaticTree(document), "assignee")).toContain(
    '<option value="" selected></option>'
  );
});

function staticNodeIds(html: string): readonly string[] {
  return [...html.matchAll(/data-unifold-static-node-id="([^"]+)"/gu)].map(
    (match) => match[1] ?? ""
  );
}

function withRestrictedBindings(
  source: UnifoldIrDocument,
  classified: UnifoldIrDocument,
  ids: readonly string[]
): UnifoldIrDocument {
  const nodes = { ...source.nodesById };
  ids.forEach((id) => {
    nodes[id] = { ...requireNode(source, id), binding: { path: `/${id}`, store: "profile" } };
  });
  return { ...source, nodesById: nodes, storesById: classified.storesById };
}

function requireNode(document: UnifoldIrDocument, id: string): UnifoldIrNode {
  const node = document.nodesById[id];
  if (node === undefined) throw new Error(`Expected static test node: ${id}.`);
  return node;
}

function nodeMarkup(html: string, id: string): string {
  const start = html.indexOf(`data-unifold-static-node-id="${id}"`);
  return html.slice(start, html.indexOf("</div>", start));
}
