// @vitest-environment happy-dom
import { ElementRegistrationDiagnosticCode } from "@unislang/unifold-elements";
import { expect, it } from "vitest";

import { registerApplicationElements } from "./element-registration.js";
import { UnifoldApplicationDiagnosticStage, UnifoldApplicationMountStatus } from "./types.js";

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
