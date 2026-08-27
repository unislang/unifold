import { UiEventType, type UiEvent } from "@unislang/unifold-events";
import type { UnifoldIrDocument } from "@unislang/unifold-ir";
import type { DomRenderController } from "@unislang/unifold-renderer-dom";
import type { UnifoldRuntime } from "@unislang/unifold-runtime";

import type { UiSemanticCoordinator } from "./semantic-coordinator.js";

interface ApplicationProjectionOptions {
  readonly document: () => UnifoldIrDocument;
  readonly renderer: DomRenderController;
  readonly runtime: UnifoldRuntime;
  readonly semantics?: UiSemanticCoordinator;
  readonly updating: () => boolean;
}

export class ApplicationProjectionController {
  private ignoredRevision: number | undefined;

  constructor(private readonly options: ApplicationProjectionOptions) {}

  readonly onRuntimeEvent = (event: UiEvent): void => {
    const revision = this.transactionRevision(event);
    if (revision === undefined) return;
    this.projectTransaction(revision);
    this.refreshSemantics();
  };

  private transactionRevision(event: UiEvent): number | undefined {
    if (event.type !== UiEventType.TransactionCommitted) return undefined;
    return this.availableRevision(event.staterevision);
  }

  private availableRevision(revision: number): number | undefined {
    if (this.options.updating()) return undefined;
    if (this.consumeIgnoredRevision(revision)) return undefined;
    return revision;
  }

  private consumeIgnoredRevision(revision: number): boolean {
    if (revision !== this.ignoredRevision) return false;
    this.ignoredRevision = undefined;
    return true;
  }

  ignoreRevision(revision: number): void {
    this.ignoredRevision = revision;
  }

  finishCommit(): void {
    this.ignoredRevision = undefined;
  }

  projectAll(document: UnifoldIrDocument): void {
    document.renderOrder.forEach((id) => this.projectKnown(id));
  }

  private projectTransaction(revision: number): void {
    const record = this.options.runtime.getTransaction(revision);
    record?.changedNodeIds.forEach((id) => this.projectKnown(id));
  }

  private projectKnown(id: string): void {
    if (this.options.document().nodesById[id] === undefined) return;
    const { renderer, runtime } = this.options;
    renderer.project(runtime.getSnapshot(id), runtime.getValidationErrors(id));
  }

  private refreshSemantics(): void {
    const { runtime, semantics } = this.options;
    semantics?.refreshRuntime(this.options.document(), runtime);
  }
}
