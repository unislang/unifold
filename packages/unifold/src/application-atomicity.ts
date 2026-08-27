import { UiMachineConfigurationError } from "./machine-coordinator.js";
import { UiSemanticConfigurationError } from "./semantic-coordinator.js";
import { errorDiagnostic } from "./application-update.js";
import { UnifoldApplicationDiagnosticStage, type UnifoldApplicationDiagnostic } from "./types.js";

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
  if (error instanceof UiMachineConfigurationError) {
    return UnifoldApplicationDiagnosticStage.Workflow;
  }
  return UnifoldApplicationDiagnosticStage.Renderer;
}

function rollbackFailureDiagnostic(): UnifoldApplicationDiagnostic {
  return {
    code: "application-update-rollback-failed",
    message: "The update rollback failed and the application was quarantined.",
    path: "/",
    stage: UnifoldApplicationDiagnosticStage.Coordination
  };
}
