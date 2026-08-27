import type { UnifoldRuntimeCoordination } from "@unislang/unifold-runtime";

import { UiMachineConfigurationError } from "./machine-coordinator.js";
import { UiSemanticConfigurationError } from "./semantic-coordinator.js";
import { errorDiagnostic } from "./application-update.js";
import { UnifoldApplicationDiagnosticStage, type UnifoldApplicationDiagnostic } from "./types.js";

export class UiApplicationRuntimeCommitError extends Error {}

export function asApplicationError(error: unknown): Error {
  return error instanceof Error ? error : new Error("Unknown rollback failure.");
}

export function atomicUpdateDiagnostic(
  rollbackError: Error | undefined,
  updateError: unknown,
  stage: UnifoldApplicationDiagnosticStage
): UnifoldApplicationDiagnostic {
  if (rollbackError !== undefined) return rollbackFailureDiagnostic();
  return errorDiagnostic(updateError, stage);
}

export function atomicUpdateFailureStage(error: unknown): UnifoldApplicationDiagnosticStage {
  if (error instanceof UiSemanticConfigurationError) {
    return UnifoldApplicationDiagnosticStage.Semantics;
  }
  return nonSemanticFailureStage(error);
}

function nonSemanticFailureStage(error: unknown): UnifoldApplicationDiagnosticStage {
  if (error instanceof UiMachineConfigurationError) {
    return UnifoldApplicationDiagnosticStage.Workflow;
  }
  if (error instanceof UiApplicationRuntimeCommitError) {
    return UnifoldApplicationDiagnosticStage.Runtime;
  }
  return UnifoldApplicationDiagnosticStage.Renderer;
}

export function commitRuntimeCoordination(coordination: UnifoldRuntimeCoordination): void {
  try {
    coordination.commit();
  } catch (error) {
    throw new UiApplicationRuntimeCommitError(asApplicationError(error).message);
  }
}

function rollbackFailureDiagnostic(): UnifoldApplicationDiagnostic {
  return {
    code: "application-update-rollback-failed",
    message: "The update rollback failed and the application was quarantined.",
    path: "/",
    stage: UnifoldApplicationDiagnosticStage.Coordination
  };
}
