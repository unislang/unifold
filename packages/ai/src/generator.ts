import { generateText, Output } from "ai";

import { canonicalJson, fingerprintJson } from "./fingerprint.js";
import { uiPatchProposalSchema } from "./schema.js";
import type { GenerateUiPatchProposalOptions, UiPatchProposal } from "./types.js";

const defaultSystem = [
  "You are the Unifold UI design proposal engine.",
  "Return only a schema-valid RFC 6902 proposal.",
  "Use registered catalog components and preserve stable IDs.",
  "The first operation must test /revision and another must replace /revision.",
  "Never emit code, scripts, raw HTML, provider configuration, or credentials."
].join(" ");

export async function generateUiPatchProposal(
  options: GenerateUiPatchProposalOptions
): Promise<UiPatchProposal> {
  const baseHash = await fingerprintJson(options.document);
  const result = await generateText({
    ...abortOptions(options.abortSignal),
    model: options.model,
    output: Output.object({
      description: "A guarded Unifold RFC 6902 UI patch proposal.",
      name: "UiPatchProposal",
      schema: uiPatchProposalSchema
    }),
    prompt: proposalPrompt(options, baseHash),
    system: options.system ?? defaultSystem
  });
  return result.output as UiPatchProposal;
}

function abortOptions(signal: AbortSignal | undefined): { abortSignal?: AbortSignal } {
  return signal === undefined ? {} : { abortSignal: signal };
}

function proposalPrompt(options: GenerateUiPatchProposalOptions, baseHash: string): string {
  return [
    `Request: ${options.prompt}`,
    `Base hash: ${baseHash}`,
    `Selected node: ${options.selectedNodeId ?? "none"}`,
    `Catalog: ${options.catalogSummary}`,
    `Document: ${canonicalJson(options.document)}`
  ].join("\n");
}
