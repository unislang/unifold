import { MockLanguageModelV4 } from "ai/test";
import { expect, it } from "vitest";

import { generateUiPatchProposal } from "./generator.js";
import {
  aiTestComponentDefinitions,
  aiTestDocument,
  aiTestProposal
} from "./proposal.test-data.js";
import { UiAiContextError } from "./types.js";

it("uses AI SDK structured output with an injected provider model", async () => {
  const expected = await aiTestProposal();
  const model = proposalModel(expected);
  const result = await generateUiPatchProposal({
    componentDefinitions: aiTestComponentDefinitions(),
    document: aiTestDocument(),
    model,
    prompt: "Rename the field to Full name.",
    system: "Follow the tenant vocabulary."
  });
  expect(result).toEqual(expected);
  expect(model.doGenerateCalls).toHaveLength(1);
  const call = JSON.stringify(model.doGenerateCalls[0]);
  expect(call).toContain("Authoritative context");
  expect(call).toContain("Never emit code");
  expect(call).toContain("Follow the tenant vocabulary");
  expect(call).not.toContain('\\"value\\":\\"\\"');
});

it("rejects invalid context before invoking a provider", async () => {
  const model = proposalModel(await aiTestProposal());
  const componentDefinitions = aiTestComponentDefinitions();
  const generation = generateUiPatchProposal({
    componentDefinitions: {
      ...componentDefinitions,
      catalog: { ...componentDefinitions.catalog, version: "2.0.0" }
    },
    document: aiTestDocument(),
    model,
    prompt: "Rename the field."
  });
  await expect(generation).rejects.toBeInstanceOf(UiAiContextError);
  expect(model.doGenerateCalls).toHaveLength(0);
});

function proposalModel(proposal: Awaited<ReturnType<typeof aiTestProposal>>) {
  return new MockLanguageModelV4({
    doGenerate: {
      content: [{ text: JSON.stringify(proposal), type: "text" }],
      finishReason: { raw: "stop", unified: "stop" },
      usage: emptyUsage,
      warnings: []
    }
  });
}

const emptyUsage = {
  inputTokens: { cacheRead: 0, cacheWrite: 0, noCache: 0, total: 0 },
  outputTokens: { reasoning: 0, text: 0, total: 0 }
};
