import { UnifoldApplicationUpdateStatus } from "@unislang/unifold";
import { describe, expect, it, vi } from "vitest";

import {
  commitReferenceComponentFamilies,
  defineReferenceComponentFamilies
} from "./reference-component-families.js";

describe("reference component family loader", () => {
  it("exposes the post-mount family registration boundary", () => {
    expect(defineReferenceComponentFamilies).toBeTypeOf("function");
  });

  it("commits the augmented authored document before reporting readiness", () => {
    const document = referenceDocument();
    const update = vi.fn(() => ({
      diagnostics: [],
      status: UnifoldApplicationUpdateStatus.Applied
    }));

    commitReferenceComponentFamilies(document, { update });

    expect(update).toHaveBeenCalledExactlyOnceWith(document);
  });

  it("fails readiness when the augmented document cannot be committed", () => {
    const diagnostic = { code: "invalid-reference" };
    const application = {
      update: vi.fn(() => ({
        diagnostics: [diagnostic],
        status: UnifoldApplicationUpdateStatus.Rejected
      }))
    };

    expect(() => commitReferenceComponentFamilies(referenceDocument(), application)).toThrow(
      JSON.stringify([diagnostic])
    );
  });
});

function referenceDocument() {
  return {
    compositions: [{ template: { $children: [] } }],
    semantics: { entities: [] }
  };
}
