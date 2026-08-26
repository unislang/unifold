import { UnifoldApplicationUpdateStatus } from "@unislang/unifold";

import { evaluateUiPatchProposal } from "./proposal.js";
import {
  UiPatchCommitStatus,
  UiPatchEvaluationStatus,
  type CommitUiPatchProposalOptions,
  type UiPatchCommitResult,
  type UiPatchEvaluationResult
} from "./types.js";

export async function commitUiPatchProposal(
  options: CommitUiPatchProposalOptions
): Promise<UiPatchCommitResult> {
  const evaluation = await evaluateUiPatchProposal({
    ...(options.approval === undefined ? {} : { approval: options.approval }),
    document: options.application.authored,
    proposal: options.proposal
  });
  if (evaluation.status !== UiPatchEvaluationStatus.Accepted) return uncommitted(evaluation);
  const update = options.application.update(evaluation.candidate);
  return { evaluation, status: commitStatus(update.status), update };
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
