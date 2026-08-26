import {
  JsonUiProfileName,
  JsonUiProfileVersion,
  JsonUiUpstreamRevision
} from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { JSONUI_COMPATIBILITY_CORPUS } from "./corpus.js";
import {
  JsonUiCompatibilityExpectation,
  JsonUiFeature,
  JsonUiProfileDiagnosticCode
} from "./enums.js";
import { validateJsonUiProfileDocument } from "./validation.js";

const profile = {
  name: JsonUiProfileName.Unifold,
  upstream: JsonUiUpstreamRevision.Version01025,
  version: JsonUiProfileVersion.Version1
};

it.each(JSONUI_COMPATIBILITY_CORPUS)("enforces corpus case $id", (item) => {
  const result = validateJsonUiProfileDocument({ jsonUiProfile: profile, view: item.view });
  expect(result.compatible).toBe(item.expectation === JsonUiCompatibilityExpectation.Compatible);
  expect(result.diagnostics.map(({ code, feature, path }) => ({ code, feature, path }))).toEqual(
    item.expectedDiagnostics
  );
});

it("rejects every unpinned profile dimension", () => {
  const result = validateJsonUiProfileDocument({
    jsonUiProfile: { extra: true, name: "other", upstream: "branch", version: "2.0.0" },
    view: { $comp: "Text", id: "message" }
  });
  expect(result.diagnostics.map(({ code }) => code)).toEqual([
    JsonUiProfileDiagnosticCode.InvalidName,
    JsonUiProfileDiagnosticCode.InvalidVersion,
    JsonUiProfileDiagnosticCode.InvalidUpstreamRevision,
    JsonUiProfileDiagnosticCode.UnknownProfileProperty
  ]);
});

it("finds nested actions and primitive children at exact pointers", () => {
  const result = validateJsonUiProfileDocument({
    jsonUiProfile: profile,
    view: {
      $children: ["text", { $comp: "Button", id: "save", onClick: [{ $action: "set" }] }],
      $comp: "Stack",
      id: "root"
    }
  });
  expect(result.diagnostics).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        feature: JsonUiFeature.PrimitiveChild,
        path: "/view/$children/0"
      }),
      expect.objectContaining({
        feature: JsonUiFeature.Action,
        path: "/view/$children/1/onClick/0/$action"
      })
    ])
  );
});

it("rejects a missing view at the profile boundary", () => {
  const result = validateJsonUiProfileDocument({ jsonUiProfile: profile });
  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({
      code: JsonUiProfileDiagnosticCode.InvalidView,
      feature: JsonUiFeature.ComponentTree,
      path: "/view"
    })
  );
});

it("accepts upstream store/path shorthand only with a declared Unifold store", () => {
  const result = validateJsonUiProfileDocument({
    jsonUiProfile: profile,
    stores: [{ id: "customer" }],
    view: { $comp: "TextField", id: "name", path: "/name", store: "customer" }
  });
  expect(result).toEqual({ compatible: true, diagnostics: [] });
});
