import { UnifoldApplicationUpdateStatus } from "@unislang/unifold";

import { canonicalJson } from "./fingerprint.js";
import { evaluateUiPatchProposal } from "./proposal.js";
import {
  UiPatchDiagnosticCode,
  UiPatchCommitStatus,
  UiPatchEvaluationStatus,
  type CommitUiPatchProposalOptions,
  type EvaluateUiPatchProposalOptions,
  type UiPatchCommitResult,
  type UiPatchEvaluationResult
} from "./types.js";

export async function commitUiPatchProposal(
  options: CommitUiPatchProposalOptions
): Promise<UiPatchCommitResult> {
  const document = options.application.authored;
  const evaluation = await evaluateUiPatchProposal(evaluationOptions(options, document));
  if (evaluation.status !== UiPatchEvaluationStatus.Accepted) return uncommitted(evaluation);
  if (canonicalJson(document) !== canonicalJson(options.application.authored)) {
    return uncommitted(staleEvaluation());
  }
  const update = options.application.update(evaluation.candidate);
  return { evaluation, status: commitStatus(update.status), update };
}

function evaluationOptions(
  options: CommitUiPatchProposalOptions,
  document: unknown
): EvaluateUiPatchProposalOptions {
  return {
    ...(options.approval === undefined ? {} : { approval: options.approval }),
    document,
    proposal: options.proposal
  };
}

function staleEvaluation(): UiPatchEvaluationResult {
  return {
    diagnostics: [
      {
        code: UiPatchDiagnosticCode.BaseHashMismatch,
        message: "The live document changed while the proposal was being evaluated.",
        path: "/baseHash"
      }
    ],
    status: UiPatchEvaluationStatus.Rejected
  };
}

function uncommitted(evaluation: UiPatchEvaluationResult): UiPatchCommitResult {
  const review = evaluation.status === UiPatchEvaluationStatus.ReviewRequired;
  return {
    evaluation,
    status: review ? UiPatchCommitStatus.ReviewRequired : UiPatchCommitStatus.Rejected
  };
}

function commitStatus(status: UnifoldApplicationUpdateStatus): UiPatchCommitStatus {
  if (status === UnifoldApplicationUpdateStatus.Applied) return UiPatchCommitStatus.Applied;
  return UiPatchCommitStatus.Rejected;
}
