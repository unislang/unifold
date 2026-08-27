import { expect, it } from "vitest";

import { aiTestProposal } from "./proposal.test-data.js";
import { classifyUiPatchRisk, effectiveUiPatchRisk } from "./risk.js";
import { JsonPatchOperationType, UiPatchRisk } from "./types.js";

it("classifies presentation, behavior, data, and external-effect operations conservatively", async () => {
  const proposal = await aiTestProposal();
  expect(classifyUiPatchRisk(proposal)).toBe(UiPatchRisk.Presentation);
  expect(classifyUiPatchRisk(withMutation(proposal, "/view/$children/0/required", true))).toBe(
    UiPatchRisk.Behavior
  );
  expect(classifyUiPatchRisk(withMutation(proposal, "/view/$children/0/value", "Ada"))).toBe(
    UiPatchRisk.Data
  );
  expect(classifyUiPatchRisk(withMutation(proposal, "/view/$children/0/href", "/next"))).toBe(
    UiPatchRisk.ExternalEffect
  );
});

it("lets model declarations increase but never lower framework-derived risk", async () => {
  const proposal = await aiTestProposal(UiPatchRisk.ExternalEffect);
  expect(effectiveUiPatchRisk(proposal)).toBe(UiPatchRisk.ExternalEffect);
  const underclassified = withMutation(
    { ...proposal, risk: UiPatchRisk.Presentation },
    "/semantics/entities/0/properties/name",
    "Ada"
  );
  expect(effectiveUiPatchRisk(underclassified)).toBe(UiPatchRisk.Data);
});

it("inspects nested added nodes and treats unknown mutable properties as behavior", async () => {
  const proposal = await aiTestProposal();
  const linked = withMutation(proposal, "/view/$children/-", {
    $comp: "Link",
    href: "https://example.com",
    id: "docs",
    label: "Docs"
  });
  expect(classifyUiPatchRisk(linked)).toBe(UiPatchRisk.ExternalEffect);
  expect(classifyUiPatchRisk(withMutation(proposal, "/view/customPolicy", true))).toBe(
    UiPatchRisk.Behavior
  );
});

function withMutation(
  proposal: Awaited<ReturnType<typeof aiTestProposal>>,
  path: string,
  value: import("@unislang/unifold-contracts").JsonValue
) {
  return {
    ...proposal,
    operations: [...proposal.operations, { op: JsonPatchOperationType.Add, path, value }]
  };
}
