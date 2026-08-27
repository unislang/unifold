import { generateText, Output, type LanguageModel, type LanguageModelUsage } from "ai";

import { buildUiAiContext } from "./context.js";
import { canonicalJson, fingerprintJson } from "./fingerprint.js";
import { uiPatchProposalSchema } from "./schema.js";
import {
  UiAiContextError,
  UiAiContextStatus,
  type GenerateUiPatchProposalOptions,
  type UiAiContext,
  type UiPatchProposal
} from "./types.js";

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
  const plan = await prepareUiPatchGeneration(options);
  return (await generatePreparedUiPatchProposal(plan, { model: options.model })).proposal;
}

export interface UiPatchGenerationPlan {
  readonly prompt: string;
  readonly system: string;
}

interface PreparedUiPatchGenerationOptions {
  readonly abortSignal?: AbortSignal;
  readonly maxOutputTokens?: number;
  readonly maxRetries?: number;
  readonly model: LanguageModel;
  readonly timeoutMs?: number;
}

interface PreparedUiPatchGenerationResult {
  readonly proposal: UiPatchProposal;
  readonly usage: LanguageModelUsage;
}

export async function prepareUiPatchGeneration(
  options: Omit<GenerateUiPatchProposalOptions, "model">
): Promise<UiPatchGenerationPlan> {
  const context = requireContext(options);
  const baseHash = await fingerprintJson(options.document);
  return {
    prompt: proposalPrompt(options, baseHash, context),
    system: systemPrompt(options.system)
  };
}

export async function generatePreparedUiPatchProposal(
  plan: UiPatchGenerationPlan,
  options: PreparedUiPatchGenerationOptions
): Promise<PreparedUiPatchGenerationResult> {
  const result = await generateText({
    ...generationControls(options),
    model: options.model,
    output: Output.object({
      description: "A guarded Unifold RFC 6902 UI patch proposal.",
      name: "UiPatchProposal",
      schema: uiPatchProposalSchema
    }),
    prompt: plan.prompt,
    system: plan.system
  });
  return { proposal: result.output as UiPatchProposal, usage: result.usage };
}

function systemPrompt(extension: string | undefined): string {
  return extension === undefined ? defaultSystem : `${defaultSystem} ${extension}`;
}

function requireContext(
  options: Pick<GenerateUiPatchProposalOptions, "componentDefinitions" | "document">
): UiAiContext {
  const result = buildUiAiContext({
    componentDefinitions: options.componentDefinitions,
    document: options.document
  });
  if (result.status === UiAiContextStatus.Ready) return result.context;
  throw new UiAiContextError(result.diagnostics);
}

function generationControls(options: PreparedUiPatchGenerationOptions) {
  return {
    ...abortControl(options.abortSignal),
    ...outputControl(options.maxOutputTokens),
    ...retryControl(options.maxRetries),
    ...timeoutControl(options.timeoutMs)
  };
}

function abortControl(value: AbortSignal | undefined) {
  return value === undefined ? {} : { abortSignal: value };
}

function outputControl(value: number | undefined) {
  return value === undefined ? {} : { maxOutputTokens: value };
}

function retryControl(value: number | undefined) {
  return value === undefined ? {} : { maxRetries: value };
}

function timeoutControl(value: number | undefined) {
  return value === undefined ? {} : { timeout: { totalMs: value } };
}

function proposalPrompt(
  options: Pick<GenerateUiPatchProposalOptions, "prompt" | "selectedNodeId">,
  baseHash: string,
  context: UiAiContext
): string {
  return [
    `Request: ${options.prompt}`,
    `Base hash: ${baseHash}`,
    `Selected node: ${options.selectedNodeId ?? "none"}`,
    `Authoritative context: ${canonicalJson(context)}`
  ].join("\n");
}
