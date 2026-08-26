// @vitest-environment happy-dom
import { ElementRegistrationStatus } from "@unislang/unifold";
import { expect, it } from "vitest";

import { appendReferenceBreadcrumb, defineUnifoldBreadcrumb } from "./breadcrumb-reference.js";

it("appends deferred Breadcrumb JSON and authored Schema.org entities", () => {
  const document = {
    compositions: [{ template: { $children: [] as unknown[] } }],
    semantics: { entities: [] as unknown[] }
  };
  appendReferenceBreadcrumb(document);
  expect(document.compositions[0]?.template.$children).toEqual([
    expect.objectContaining({ $comp: "Breadcrumb", id: "account-breadcrumb" })
  ]);
  expect(document.semantics.entities).toHaveLength(5);
  expect(document.semantics.entities).toEqual(
    expect.arrayContaining([expect.objectContaining({ type: "BreadcrumbList" })])
  );
  expect(defineUnifoldBreadcrumb().status).toBe(ElementRegistrationStatus.Registered);
});
