import { evaluateUiPatchProposal } from "@unislang/unifold-ai/evaluation";
import type { JsonObject } from "@unislang/unifold-contracts";
import { ElementEventType } from "@unislang/unifold-elements";
import { UiCommandType, type UiEvent } from "@unislang/unifold-events";
import { UnifoldExportStatus } from "@unislang/unifold-export";
import {
  UnifoldApplicationMountStatus,
  UnifoldApplicationUpdateStatus,
  defineUnifoldElements,
  mountUnifoldApplication,
  type UnifoldApplicationPort
} from "@unislang/unifold";
import {
  StudioDiagnosticCode,
  StudioExportStatus,
  StudioSessionState,
  UnifoldStudioSession,
  createUnifoldStudioPreview,
  type StudioExportBundle,
  type StudioProposalClient,
  type StudioSessionSnapshot
} from "@unislang/unifold-studio";

import { StudioControlId, externallyEditedApplicationDocument } from "./documents.js";
import { LocalMockProposalClient } from "./local-mock-proposal.js";
import { resolveStudioModuleArtifacts, type StudioModuleIntegrities } from "./module-reference.js";

export interface StudioDogfoodTargets {
  readonly controls: HTMLElement;
  readonly diff: HTMLElement;
  readonly exports: HTMLElement;
  readonly live: HTMLElement;
  readonly preview: HTMLElement;
}

const statusMessages: Readonly<Record<StudioSessionState, string>> = {
  [StudioSessionState.Applied]: "Applied to the live application. Export is available.",
  [StudioSessionState.Applying]: "Applying the validated candidate atomically.",
  [StudioSessionState.Disposed]: "Studio session disposed.",
  [StudioSessionState.Failed]: "The local proposal failed validation. Review the diagnostics.",
  [StudioSessionState.Generating]: "Generating with the deterministic local mock.",
  [StudioSessionState.Idle]: "Ready for a deterministic local request.",
  [StudioSessionState.PreviewReady]: "Isolated preview ready. The live application is unchanged.",
  [StudioSessionState.ReviewRequired]: "Review is required before this proposal can be previewed."
};
const cancellableStates = new Set([
  StudioSessionState.Generating,
  StudioSessionState.PreviewReady,
  StudioSessionState.ReviewRequired
]);

export class StudioDogfoodController {
  private readonly actions = new Map<string, () => Promise<unknown>>();
  private readonly subscription: { unsubscribe(): void };

  constructor(
    private readonly targets: StudioDogfoodTargets,
    readonly controlApplication: UnifoldApplicationPort,
    readonly liveApplication: UnifoldApplicationPort,
    private readonly session: UnifoldStudioSession,
    readonly moduleIntegrities: StudioModuleIntegrities,
    private readonly liveDocument: JsonObject
  ) {
    this.actions.set(StudioControlId.Generate, () => this.generate());
    this.actions.set(StudioControlId.Cancel, () => Promise.resolve(this.cancel()));
    this.actions.set(StudioControlId.Apply, () => this.apply());
    this.actions.set(StudioControlId.ExternalEdit, () =>
      Promise.resolve(this.simulateExternalEdit())
    );
    this.actions.set(StudioControlId.Export, () => this.export());
    this.subscription = controlApplication.runtime.events$.subscribe(this.onControlEvent);
  }

  get snapshot(): StudioSessionSnapshot {
    return this.session.snapshot;
  }

  async generate(prompt = this.promptValue()): Promise<StudioSessionSnapshot> {
    const pending = this.session.request({ prompt });
    this.projectSession(this.session.snapshot);
    const snapshot = await pending;
    this.projectSession(snapshot);
    return snapshot;
  }

  async apply(): Promise<StudioSessionSnapshot> {
    const pending = this.session.apply();
    this.projectSession(this.session.snapshot);
    const snapshot = await pending;
    this.projectSession(snapshot);
    return snapshot;
  }

  async export(): Promise<void> {
    this.setStatus("Creating portable JSON and standalone static HTML.");
    const result = await this.session.export();
    if (result.status !== StudioExportStatus.Exported) {
      this.targets.diff.textContent = JSON.stringify({ diagnostics: result.diagnostics }, null, 2);
      this.setStatus("Export is unavailable until a proposal is applied.");
      return;
    }
    this.renderExport(result.bundle);
  }

  cancel(): StudioSessionSnapshot {
    const snapshot = this.session.cancel();
    this.projectSession(snapshot);
    return snapshot;
  }

  simulateExternalEdit(): void {
    const result = this.liveApplication.update(
      externallyEditedApplicationDocument(this.liveDocument)
    );
    if (result.status !== UnifoldApplicationUpdateStatus.Applied) {
      throw new Error("The deterministic external edit was rejected.");
    }
    this.setStatus("External edit applied. The pending proposal is now stale.");
  }

  dispose(): void {
    this.subscription.unsubscribe();
    this.session.dispose();
    this.controlApplication.dispose();
    this.liveApplication.dispose();
  }

  private readonly onControlEvent = (event: UiEvent): void => {
    if (event.type !== ElementEventType.ComponentActivated) return;
    this.runAction(this.actions.get(sourceNodeId(event)));
  };

  private runAction(action: (() => Promise<unknown>) | undefined): void {
    if (action === undefined) return;
    void action().catch(() => this.setStatus("The requested Studio action failed safely."));
  }

  private promptValue(): string {
    const value = this.controlApplication.runtime.getSnapshot(StudioControlId.Prompt).control
      ?.value;
    return typeof value === "string" ? value : "";
  }

  private projectSession(snapshot: StudioSessionSnapshot): void {
    this.setControlState(snapshot);
    this.targets.diff.textContent = formattedDiff(snapshot);
  }

  private setControlState(snapshot: StudioSessionSnapshot): void {
    const state = snapshot.state;
    this.controlApplication.runtime.execute([
      propertyCommand(StudioControlId.Status, { content: statusMessage(snapshot) }),
      propertyCommand(StudioControlId.Cancel, { disabled: !cancellableStates.has(state) }),
      propertyCommand(StudioControlId.Apply, {
        disabled: state !== StudioSessionState.PreviewReady
      }),
      propertyCommand(StudioControlId.ExternalEdit, {
        disabled: state !== StudioSessionState.PreviewReady
      }),
      propertyCommand(StudioControlId.Export, {
        disabled: state === StudioSessionState.Generating || state === StudioSessionState.Applying
      })
    ]);
  }

  private setStatus(content: string): void {
    this.controlApplication.runtime.execute([propertyCommand(StudioControlId.Status, { content })]);
  }

  private renderExport(bundle: StudioExportBundle): void {
    if (
      bundle.portable.status !== UnifoldExportStatus.Exported ||
      bundle.staticHtml.status !== UnifoldExportStatus.Exported
    ) {
      this.setStatus("The applied document could not be exported.");
      return;
    }
    this.targets.exports.replaceChildren(
      artifact("Portable JSON", bundle.portable.output.content, "application/json", "ui.json"),
      artifact("Static HTML", bundle.staticHtml.output.content, "text/html", "index.html")
    );
    this.setStatus("Exported portable JSON and standalone static HTML.");
  }
}

export async function mountStudioDogfood(
  targets: StudioDogfoodTargets,
  proposalClient: StudioProposalClient = new LocalMockProposalClient()
): Promise<StudioDogfoodController> {
  const artifacts = await resolveStudioModuleArtifacts();
  defineUnifoldElements();
  const controls = mountApplication(artifacts.controlSurface.composedDocument, targets.controls);
  const live = mountApplication(artifacts.liveApplication.composedDocument, targets.live);
  const session = new UnifoldStudioSession({
    application: live,
    evaluator: { evaluate: evaluateUiPatchProposal },
    preview: createUnifoldStudioPreview(targets.preview),
    proposalClient
  });
  return new StudioDogfoodController(
    targets,
    controls,
    live,
    session,
    {
      controlSurface: artifacts.controlSurface.integrity,
      liveApplication: artifacts.liveApplication.integrity
    },
    artifacts.liveApplication.composedDocument
  );
}

function mountApplication(document: unknown, container: HTMLElement): UnifoldApplicationPort {
  const result = mountUnifoldApplication(document, container);
  if (result.status === UnifoldApplicationMountStatus.Mounted) return result.application;
  throw new Error(result.diagnostics.map(({ message }) => message).join(" "));
}

function propertyCommand(id: string, properties: Record<string, boolean | string>) {
  return { id, properties, type: UiCommandType.NodePatchProperties } as const;
}

function sourceNodeId(event: UiEvent): string {
  return event.data.sourceNode?.id ?? "";
}

function formattedDiff(snapshot: StudioSessionSnapshot): string {
  if (snapshot.diff !== undefined) return JSON.stringify(snapshot.diff, null, 2);
  if (snapshot.diagnostics.length > 0) {
    return JSON.stringify({ diagnostics: snapshot.diagnostics }, null, 2);
  }
  return "No proposal diff yet.";
}

function statusMessage(snapshot: StudioSessionSnapshot): string {
  const cancelled = snapshot.diagnostics.some(
    (item) => item.code === StudioDiagnosticCode.Cancelled
  );
  if (cancelled) return "Studio request cancelled. No candidate was applied.";
  return statusMessages[snapshot.state];
}

function artifact(
  title: string,
  content: string,
  mediaType: string,
  fileName: string
): HTMLElement {
  const section = document.createElement("section");
  section.className = "artifact";
  const heading = document.createElement("h3");
  heading.textContent = title;
  const download = document.createElement("a");
  download.download = fileName;
  download.href = `data:${mediaType};charset=utf-8,${encodeURIComponent(content)}`;
  download.textContent = `Download ${fileName}`;
  const preview = document.createElement("pre");
  preview.textContent = content;
  section.append(heading, download, preview);
  return section;
}
