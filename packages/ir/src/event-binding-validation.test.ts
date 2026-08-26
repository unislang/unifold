import { UiComponentEventBinding } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { DiagnosticCode } from "./enums.js";
import { compileUiDocument } from "./compiler.js";
import { composedDocument } from "./composition-validation.test-data.js";

it("accepts declared signals and preserves them outside component properties", () => {
  const source = documentWithoutManifest();
  const result = compileUiDocument({
    ...source,
    view: {
      $comp: "Button",
      events: { [UiComponentEventBinding.Activated]: "PROFILE_SAVE" },
      id: "save",
      label: "Save"
    }
  });

  expect(result.document?.nodesById["save"]).toMatchObject({
    eventBindings: { activated: "PROFILE_SAVE" },
    properties: { label: "Save" }
  });
});

it("rejects unknown, unsupported, and empty event mappings", () => {
  const events = { click: "CLICK", input: "", submitted: "DONE" };
  const result = compileUiDocument({
    ...documentWithoutManifest(),
    view: { $comp: "Button", events, id: "save", label: "Save" }
  });

  expect(result.document).toBeUndefined();
  expect(
    result.diagnostics.filter(({ code }) => code === DiagnosticCode.InvalidEventBinding)
  ).toHaveLength(4);
});

function documentWithoutManifest() {
  const document = structuredClone(composedDocument());
  Reflect.deleteProperty(document, "compositionManifest");
  return document;
}
