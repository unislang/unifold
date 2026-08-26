import { JsonUiUpstreamRevision } from "@unislang/unifold-contracts";

import { deepFreeze } from "./deep-freeze.js";
import {
  JsonUiCompatibilityExpectation,
  JsonUiCorpusOrigin,
  JsonUiFeature,
  JsonUiFixtureLicense,
  JsonUiProfileDiagnosticCode
} from "./enums.js";
import type { JsonUiCompatibilityCase } from "./types.js";

const upstreamSource = "https://www.npmjs.com/package/@jsonui/react/v/0.10.25";
const adaptedProvenance = {
  license: JsonUiFixtureLicense.Mit,
  origin: JsonUiCorpusOrigin.UpstreamAdaptation,
  revision: JsonUiUpstreamRevision.Version01025,
  source: upstreamSource,
  transformation: "Adds stable IDs and uses Unifold catalog component names and static properties."
};
const profileProvenance = {
  license: JsonUiFixtureLicense.Mit,
  origin: JsonUiCorpusOrigin.ProfileFixture,
  revision: JsonUiUpstreamRevision.Version01025,
  source: upstreamSource,
  transformation: "Isolates one documented upstream syntax feature for profile disposition testing."
};
const unsupported = (feature: JsonUiFeature, path: string) => ({
  code: JsonUiProfileDiagnosticCode.UnsupportedFeature,
  feature,
  path
});

export const JSONUI_COMPATIBILITY_CORPUS: readonly JsonUiCompatibilityCase[] = deepFreeze([
  {
    expectation: JsonUiCompatibilityExpectation.Compatible,
    expectedDiagnostics: [],
    feature: JsonUiFeature.ComponentTree,
    id: "component-tree",
    provenance: adaptedProvenance,
    view: {
      $children: [{ $comp: "Text", content: "Hello JsonUI", id: "message" }],
      $comp: "Stack",
      id: "root"
    }
  },
  {
    expectation: JsonUiCompatibilityExpectation.Compatible,
    expectedDiagnostics: [],
    feature: JsonUiFeature.DefaultSlotArray,
    id: "default-slot-array",
    provenance: adaptedProvenance,
    view: {
      $children: [{ $comp: "Text", content: "Child", id: "child" }],
      $comp: "Box",
      id: "parent"
    }
  },
  {
    expectation: JsonUiCompatibilityExpectation.Compatible,
    expectedDiagnostics: [],
    feature: JsonUiFeature.ComponentTree,
    id: "leaf",
    provenance: adaptedProvenance,
    view: { $comp: "Text", content: "Leaf content", id: "leaf" }
  },
  {
    expectation: JsonUiCompatibilityExpectation.Compatible,
    expectedDiagnostics: [],
    feature: JsonUiFeature.DefaultSlotArray,
    id: "empty-children",
    provenance: adaptedProvenance,
    view: { $children: [], $comp: "Box", id: "empty" }
  },
  {
    expectation: JsonUiCompatibilityExpectation.Compatible,
    expectedDiagnostics: [],
    feature: JsonUiFeature.ComponentTree,
    id: "nested",
    provenance: adaptedProvenance,
    view: {
      $children: [
        {
          $children: [{ $comp: "Text", content: "Nested content", id: "message" }],
          $comp: "Stack",
          id: "stack"
        }
      ],
      $comp: "Box",
      id: "root"
    }
  },
  {
    expectation: JsonUiCompatibilityExpectation.Compatible,
    expectedDiagnostics: [],
    feature: JsonUiFeature.ComponentTree,
    id: "static-properties",
    provenance: adaptedProvenance,
    view: {
      $children: [{ $comp: "Text", content: "Static properties", id: "copy" }],
      $comp: "Box",
      id: "surface",
      padding: "sm",
      surface: "subtle"
    }
  },
  {
    expectation: JsonUiCompatibilityExpectation.Compatible,
    expectedDiagnostics: [],
    feature: JsonUiFeature.ComponentTree,
    id: "text-field",
    provenance: adaptedProvenance,
    view: { $comp: "TextField", id: "name", label: "Name", value: "Ada" }
  },
  {
    expectation: JsonUiCompatibilityExpectation.Incompatible,
    expectedDiagnostics: [unsupported(JsonUiFeature.PrimitiveChild, "/view/$children")],
    feature: JsonUiFeature.PrimitiveChild,
    id: "primitive-default-slot",
    provenance: profileProvenance,
    view: { $children: "Hello JsonUI", $comp: "Text", id: "message" }
  },
  {
    expectation: JsonUiCompatibilityExpectation.Incompatible,
    expectedDiagnostics: [
      unsupported(JsonUiFeature.Modifier, "/view/text/$modifier"),
      unsupported(JsonUiFeature.Jsonata, "/view/text/jsonataDef")
    ],
    feature: JsonUiFeature.Jsonata,
    id: "jsonata",
    provenance: profileProvenance,
    view: {
      $comp: "Text",
      id: "message",
      text: { $modifier: "get", jsonataDef: "$uppercase(value)" }
    }
  },
  {
    expectation: JsonUiCompatibilityExpectation.Incompatible,
    expectedDiagnostics: [unsupported(JsonUiFeature.StorePathBinding, "/view")],
    feature: JsonUiFeature.StorePathBinding,
    id: "store-path-shorthand",
    provenance: profileProvenance,
    view: { $comp: "TextField", id: "name", path: "/name", store: "data" }
  },
  {
    expectation: JsonUiCompatibilityExpectation.Incompatible,
    expectedDiagnostics: [unsupported(JsonUiFeature.StableNodeId, "/view/id")],
    feature: JsonUiFeature.StableNodeId,
    id: "missing-stable-node-id",
    provenance: profileProvenance,
    view: { $comp: "Text", content: "Missing identity" }
  },
  {
    expectation: JsonUiCompatibilityExpectation.Incompatible,
    expectedDiagnostics: [unsupported(JsonUiFeature.StateExport, "/view/onStateExport")],
    feature: JsonUiFeature.StateExport,
    id: "state-export",
    provenance: profileProvenance,
    view: { $comp: "Box", id: "root", onStateExport: "handler" }
  },
  {
    expectation: JsonUiCompatibilityExpectation.Incompatible,
    expectedDiagnostics: [unsupported(JsonUiFeature.Action, "/view/onClick/$action")],
    feature: JsonUiFeature.Action,
    id: "action",
    provenance: profileProvenance,
    view: { $comp: "Button", id: "save", onClick: { $action: "set" } }
  },
  {
    expectation: JsonUiCompatibilityExpectation.Incompatible,
    expectedDiagnostics: [unsupported(JsonUiFeature.Modifier, "/view/text/$modifier")],
    feature: JsonUiFeature.Modifier,
    id: "modifier",
    provenance: profileProvenance,
    view: { $comp: "Text", id: "message", text: { $modifier: "get" } }
  },
  {
    expectation: JsonUiCompatibilityExpectation.Incompatible,
    expectedDiagnostics: [unsupported(JsonUiFeature.NamedSlot, "/view/$childLabel")],
    feature: JsonUiFeature.NamedSlot,
    id: "named-slot",
    provenance: profileProvenance,
    view: { $childLabel: { $comp: "Text", id: "label" }, $comp: "Box", id: "root" }
  },
  {
    expectation: JsonUiCompatibilityExpectation.Incompatible,
    expectedDiagnostics: [unsupported(JsonUiFeature.InlineValidation, "/view/$validations")],
    feature: JsonUiFeature.InlineValidation,
    id: "inline-validation",
    provenance: profileProvenance,
    view: { $comp: "TextField", $validations: [], id: "name" }
  },
  {
    expectation: JsonUiCompatibilityExpectation.Incompatible,
    expectedDiagnostics: [unsupported(JsonUiFeature.List, "/view/$isList")],
    feature: JsonUiFeature.List,
    id: "list",
    provenance: profileProvenance,
    view: { $comp: "Stack", $isList: true, id: "items" }
  },
  {
    expectation: JsonUiCompatibilityExpectation.Incompatible,
    expectedDiagnostics: [unsupported(JsonUiFeature.Localization, "/view/$translate")],
    feature: JsonUiFeature.Localization,
    id: "localization",
    provenance: profileProvenance,
    view: { $comp: "Text", $translate: {}, id: "message" }
  },
  {
    expectation: JsonUiCompatibilityExpectation.Incompatible,
    expectedDiagnostics: [unsupported(JsonUiFeature.UnknownDirective, "/view/$future")],
    feature: JsonUiFeature.UnknownDirective,
    id: "unknown-directive",
    provenance: profileProvenance,
    view: { $comp: "Text", $future: true, id: "message" }
  }
]);
