// @vitest-environment happy-dom
import { ElementRegistrationDiagnosticCode } from "@unislang/unifold-elements";
import { expect, it } from "vitest";

import { authoredDocument } from "./application.test-data.js";
import { registerApplicationElements } from "./element-registration.js";
import { prepareUnifoldDocument } from "./compiler.js";
import { defineUnifoldTooltip } from "./tooltip.js";
import {
  UnifoldApplicationDiagnosticStage,
  UnifoldApplicationMountStatus,
  UnifoldPreparationStatus
} from "./types.js";

it("rejects a document with no associated custom-element registry", () => {
  const detached = document.implementation.createHTMLDocument("Detached");
  const container = detached.createElement("div") as unknown as HTMLElement;

  const result = registerApplicationElements(container);

  expect(result).toMatchObject({
    diagnostics: [
      {
        code: ElementRegistrationDiagnosticCode.RegistryUnavailable,
        path: "/catalog",
        stage: UnifoldApplicationDiagnosticStage.ElementRegistration
      }
    ],
    status: UnifoldApplicationMountStatus.Rejected
  });
});

it("fails closed until a document's optional component family is defined", () => {
  const preparation = prepareUnifoldDocument({
    ...authoredDocument(),
    view: {
      $comp: "Tooltip",
      content: "Delivery estimates exclude holidays.",
      id: "shipping-help",
      label: "Shipping information"
    }
  });
  if (preparation.status !== UnifoldPreparationStatus.Valid) {
    throw new Error("Tooltip fixture did not compile.");
  }
  const prepared = preparation.prepared;
  if (prepared === undefined) throw new Error("Tooltip fixture is missing its prepared document.");
  expect(
    registerApplicationElements(document.createElement("div"), prepared.document)
  ).toMatchObject({
    diagnostics: [{ code: ElementRegistrationDiagnosticCode.MissingDefinition }],
    status: UnifoldApplicationMountStatus.Rejected
  });
  defineUnifoldTooltip(customElements);
  expect(
    registerApplicationElements(document.createElement("div"), prepared.document)
  ).toBeUndefined();
});
