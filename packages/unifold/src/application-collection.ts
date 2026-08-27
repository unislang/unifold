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
import type { UiExecutionContext } from "@unislang/unifold-runtime";

type ApplyCandidate = (candidate: unknown) => UnifoldApplicationUpdateResult;

interface CollectionExecution {
  readonly context: UiExecutionContext;
  readonly metadata: UiCollectionReconcileMetadata;
}

interface CollectionOrigin {
  readonly causationId?: string;
  readonly correlationId?: string;
}

export class ApplicationCollectionCoordinator {
  current: CollectionExecution | undefined;

  apply(
    source: PreparedUnifoldDocument,
    operation: UnifoldCollectionOperation,
    revision: number,
    applyCandidate: ApplyCandidate,
    origin?: CollectionOrigin
  ): UnifoldApplicationUpdateResult {
    try {
      const candidate = createAuthoredCollectionCandidate(source, operation);
      return this.applyCandidate(candidate, applyCandidate, origin);
    } catch (error) {
      return rejectedCollectionOperation(error, revision);
    }
  }

  private applyCandidate(
    candidate: ReturnType<typeof createAuthoredCollectionCandidate>,
    apply: ApplyCandidate,
    origin?: CollectionOrigin
  ): UnifoldApplicationUpdateResult {
    this.current = { context: executionContext(origin), metadata: candidate.metadata };
    try {
      return apply(candidate.authored);
    } finally {
      this.current = undefined;
    }
  }
}

function executionContext(origin: CollectionOrigin | undefined): UiExecutionContext {
  if (origin === undefined) return {};
  const { causationId, correlationId } = origin;
  return {
    ...optionalContextId("causationId", causationId),
    ...optionalContextId("correlationId", correlationId)
  };
}

function optionalContextId<K extends string>(key: K, value: string | undefined) {
  return value === undefined ? {} : { [key]: value };
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
