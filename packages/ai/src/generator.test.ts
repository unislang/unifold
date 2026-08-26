import { MockLanguageModelV4 } from "ai/test";
import { expect, it } from "vitest";

import { generateUiPatchProposal } from "./generator.js";
import { aiTestDocument, aiTestProposal } from "./proposal.test-data.js";

it("uses AI SDK structured output with an injected provider model", async () => {
  const expected = await aiTestProposal();
  const model = new MockLanguageModelV4({
    doGenerate: {
      content: [{ text: JSON.stringify(expected), type: "text" }],
      finishReason: { raw: "stop", unified: "stop" },
      usage: emptyUsage,
      warnings: []
    }
  });
  const result = await generateUiPatchProposal({
    catalogSummary: "Form and TextField are registered.",
    document: aiTestDocument(),
    model,
    prompt: "Rename the field to Full name."
  });
  expect(result).toEqual(expected);
  expect(model.doGenerateCalls).toHaveLength(1);
});

const emptyUsage = {
  inputTokens: { cacheRead: 0, cacheWrite: 0, noCache: 0, total: 0 },
  outputTokens: { reasoning: 0, text: 0, total: 0 }
};
