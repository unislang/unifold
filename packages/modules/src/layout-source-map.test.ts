import { expect, it } from "vitest";

import { layoutDocumentSourceMap } from "./layout-source-map.js";
import type { UiModuleSourceLocation } from "./types.js";

it("maps imported templates and root variables to their exact module sources", () => {
  const sourceMap = layoutDocumentSourceMap({
    document: loweredDocument(),
    documentSource: rootDocumentSource(),
    registrySources: new Map([[1, importedLayoutSource()]]),
    sourcePointersByNodeId: {
      field: "/variables/fields/0",
      root: "/$layoutRegistry/definitions/1/template"
    }
  });
  expect(sourceMap).toEqual({
    "/view": { ...importedLayoutSource(), pointer: "/exports/resources/0/value/template" },
    "/view/$children/0": {
      ...rootDocumentSource(),
      pointer: "/exports/documents/0/document/variables/fields/0"
    }
  });
});

it("maps host-only template nodes to the selecting root document", () => {
  const sourceMap = layoutDocumentSourceMap({
    document: { view: { $comp: "Text", id: "root" } },
    documentSource: rootDocumentSource(),
    registrySources: new Map(),
    sourcePointersByNodeId: { root: "/$layoutRegistry/definitions/0/template" }
  });
  expect(sourceMap["/view"]?.pointer).toBe("/exports/documents/0/document/layoutType");
});

function loweredDocument() {
  return {
    view: {
      $children: [{ $comp: "TextField", id: "field" }],
      $comp: "Composition",
      id: "root"
    }
  };
}

function rootDocumentSource(): UiModuleSourceLocation {
  return {
    moduleId: "org.example.root",
    pointer: "/exports/documents/0/document",
    sourceId: "root.module.json",
    version: "1.0.0"
  };
}

function importedLayoutSource(): UiModuleSourceLocation {
  return {
    moduleId: "org.example.layouts",
    pointer: "/exports/resources/0/value",
    sourceId: "layouts.module.json",
    version: "1.0.0"
  };
}
