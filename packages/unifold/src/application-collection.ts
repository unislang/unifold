import {
  UnifoldCollectionOperationError,
  createAuthoredCollectionCandidate,
  type UnifoldCollectionOperation
} from "./authored-collection.js";
import {
  UnifoldApplicationDiagnosticStage,
  UnifoldApplicationUpdateStatus,
  type PreparedUnifoldDocument,
  type UnifoldApplicationUpdateResult
} from "./types.js";
import type { UiCollectionReconcileMetadata } from "@unislang/unifold-events";

type ApplyCandidate = (candidate: unknown) => UnifoldApplicationUpdateResult;

export class ApplicationCollectionCoordinator {
  current: UiCollectionReconcileMetadata | undefined;

  apply(
    source: PreparedUnifoldDocument,
    operation: UnifoldCollectionOperation,
    revision: number,
    applyCandidate: ApplyCandidate
  ): UnifoldApplicationUpdateResult {
    try {
      const candidate = createAuthoredCollectionCandidate(source, operation);
      return this.applyCandidate(candidate, applyCandidate);
    } catch (error) {
      return rejectedCollectionOperation(error, revision);
    }
  }

  private applyCandidate(
    candidate: ReturnType<typeof createAuthoredCollectionCandidate>,
    apply: ApplyCandidate
  ): UnifoldApplicationUpdateResult {
    this.current = candidate.metadata;
    try {
      return apply(candidate.authored);
    } finally {
      this.current = undefined;
    }
  }
}

function rejectedCollectionOperation(
  error: unknown,
  revision: number
): UnifoldApplicationUpdateResult {
  const operationError = asCollectionOperationError(error);
  return {
    diagnostics: [
      {
        code: operationError.code,
        message: operationError.message,
        path: operationError.path,
        stage: UnifoldApplicationDiagnosticStage.Compilation
      }
    ],
    revision,
    status: UnifoldApplicationUpdateStatus.Rejected
  };
}

function asCollectionOperationError(error: unknown): UnifoldCollectionOperationError {
  if (error instanceof UnifoldCollectionOperationError) return error;
  return new UnifoldCollectionOperationError(
    "collection-operation-failed",
    "/",
    "Collection operation failed."
  );
}
