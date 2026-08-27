import {
  JsonPatchOperationType,
  UiPatchRequestedCheck,
  UiPatchRisk,
  type UiPatchProposal
} from "@unislang/unifold-ai/evaluation";
import { fingerprintJson } from "@unislang/unifold-export";
import type { StudioProposalClient, StudioProposalRequest } from "@unislang/unifold-studio";

const MAXIMUM_PROMPT_LENGTH = 200;
const LOCAL_MOCK_DELAY_MS = 500;

enum LocalMockPatchPath {
  Revision = "/revision",
  SummaryContent = "/view/$children/1/content",
  ViewId = "/view/id"
}

export enum LocalMockPrompt {
  Delayed = "Wait before proposing the customer summary",
  RejectStableIdentity = "Change the stable identity of the prototype page"
}

export class LocalMockProposalClient implements StudioProposalClient {
  async propose(request: StudioProposalRequest): Promise<UiPatchProposal> {
    request.signal.throwIfAborted();
    const prompt = normalizedPrompt(request.prompt);
    await waitForPrompt(prompt, request.signal);
    const revision = documentRevision(request.document);
    const [baseHash, proposalHash] = await Promise.all([
      fingerprintJson(request.document),
      fingerprintJson({ prompt, revision })
    ]);
    request.signal.throwIfAborted();
    return proposal(baseHash, proposalHash, revision, prompt);
  }
}

async function waitForPrompt(prompt: string, signal: AbortSignal): Promise<void> {
  if (prompt !== LocalMockPrompt.Delayed) return;
  await abortableDelay(signal);
}

function abortableDelay(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = () => {
      signal.removeEventListener("abort", abort);
      resolve();
    };
    const timer = setTimeout(finish, LOCAL_MOCK_DELAY_MS);
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    signal.addEventListener("abort", abort, { once: true });
  });
}

function proposal(
  baseHash: string,
  proposalHash: string,
  revision: string,
  prompt: string
): UiPatchProposal {
  return {
    baseHash,
    baseRevision: revision,
    expectedOutcomes: ["The isolated preview reflects the local request."],
    intentSummary: "Apply the deterministic local mock copy change.",
    operations: proposalOperations(revision, prompt),
    proposalId: `local-mock-${proposalHash.slice(0, 16)}`,
    requestedChecks: [
      UiPatchRequestedCheck.Compiler,
      UiPatchRequestedCheck.Accessibility,
      UiPatchRequestedCheck.StaticExport
    ],
    risk: UiPatchRisk.Presentation
  };
}

function proposalOperations(revision: string, prompt: string) {
  return [
    {
      op: JsonPatchOperationType.Test,
      path: LocalMockPatchPath.Revision,
      value: revision
    },
    {
      op: JsonPatchOperationType.Replace,
      path: LocalMockPatchPath.Revision,
      value: `${revision}.mock`
    },
    {
      op: JsonPatchOperationType.Replace,
      ...requestedChange(prompt)
    }
  ];
}

function requestedChange(prompt: string) {
  if (prompt === LocalMockPrompt.RejectStableIdentity) {
    return { path: LocalMockPatchPath.ViewId, value: "unsafe-model-identity" };
  }
  return {
    path: LocalMockPatchPath.SummaryContent,
    value: `Local mock request: ${prompt}`
  };
}

function normalizedPrompt(prompt: string): string {
  const compact = prompt.trim().replace(/\s+/gu, " ");
  if (compact.length === 0) return "Make the prototype concise and welcoming.";
  return compact.slice(0, MAXIMUM_PROMPT_LENGTH);
}

function documentRevision(document: unknown): string {
  if (!isObject(document)) throw new TypeError("The mock requires an object document.");
  const revision = document["revision"];
  if (typeof revision !== "string") throw new TypeError("The mock requires a string revision.");
  return revision;
}

function isObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
