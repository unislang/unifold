import type { PreparedUnifoldDocument } from "./types.js";
import type { DomRenderController } from "@unislang/unifold-renderer-dom";
import type { UnifoldRuntime, UnifoldRuntimeCoordination } from "@unislang/unifold-runtime";

import { commitRuntimeCoordination } from "./application-atomicity.js";
import type { ApplicationProjectionController } from "./application-projection.js";
import type { UiMachineCoordinator } from "./machine-coordinator.js";
import type { UiMachineReplacement } from "./machine-replacement.js";
import type { UiSemanticCoordinator } from "./semantic-coordinator.js";

interface PrepareCandidateOptions {
  readonly coordination: UnifoldRuntimeCoordination;
  readonly document: PreparedUnifoldDocument;
  readonly machines: UiMachineCoordinator;
  readonly projection: ApplicationProjectionController;
  readonly renderer: DomRenderController;
  readonly runtime: UnifoldRuntime;
  readonly semantics?: UiSemanticCoordinator;
}

interface CommitCandidateOptions {
  readonly coordination: UnifoldRuntimeCoordination;
  readonly projection: ApplicationProjectionController;
  readonly replacement: UiMachineReplacement;
  readonly revision: number;
}

export function prepareApplicationCandidate(
  options: PrepareCandidateOptions
): UiMachineReplacement {
  const { coordination, document, machines, projection, renderer, runtime, semantics } = options;
  renderer.update(document.document);
  projection.projectAll(document.document);
  semantics?.publishRuntime(document.document, runtime);
  return machines.prepareReplacement(
    document.document.machines,
    document.document.nodesById,
    coordination
  );
}

export function commitApplicationCandidate(options: CommitCandidateOptions): void {
  const { coordination, projection, replacement, revision } = options;
  replacement.activate();
  projection.ignoreRevision(revision);
  commitRuntimeCoordination(coordination);
  replacement.commit();
  projection.finishCommit();
}
