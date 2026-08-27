import type { UiNodeSnapshot } from "@unislang/unifold-events";
import type { UnifoldIrDocument } from "@unislang/unifold-ir";
import type { UnifoldRuntime } from "@unislang/unifold-runtime";
import {
  SemanticCompilationStatus,
  compileSemanticGraph,
  publishJsonLd,
  removeJsonLd
} from "@unislang/unifold-semantics";

import { UnifoldSemanticPublicationMode } from "./types.js";

let ownerSequence = 0;
const publicationSelector = "script[type='application/ld+json'][data-unifold-semantics]";

export class UiSemanticConfigurationError extends Error {}

export class UiSemanticCoordinator {
  private readonly ownerId: string;

  constructor(
    private readonly owner: Document,
    private readonly mode: UnifoldSemanticPublicationMode,
    private adoptedOwnerId?: string
  ) {
    this.ownerId = nextOwnerId(owner);
  }

  validate(document: UnifoldIrDocument, snapshots: Readonly<Record<string, UiNodeSnapshot>>): void {
    if (!this.enabled()) return;
    this.assertAdoptableOwner();
    compile(document, snapshots);
  }

  publish(document: UnifoldIrDocument, snapshots: Readonly<Record<string, UiNodeSnapshot>>): void {
    if (!this.enabled()) return;
    this.assertAdoptableOwner();
    const serialized = compile(document, snapshots);
    this.publishCompiled(serialized);
  }

  publishRuntime(document: UnifoldIrDocument, runtime: UnifoldRuntime): void {
    this.publish(document, runtimeSnapshots(document, runtime));
  }

  validateRuntime(document: UnifoldIrDocument, runtime: UnifoldRuntime): void {
    this.validate(document, runtimeSnapshots(document, runtime));
  }

  refresh(document: UnifoldIrDocument, snapshots: Readonly<Record<string, UiNodeSnapshot>>): void {
    try {
      this.publish(document, snapshots);
    } catch {
      // Runtime changes retain the last-known-good semantic publication.
    }
  }

  refreshRuntime(document: UnifoldIrDocument, runtime: UnifoldRuntime): void {
    this.refresh(document, runtimeSnapshots(document, runtime));
  }

  dispose(): void {
    removeJsonLd(this.owner, this.ownerId);
  }

  private enabled(): boolean {
    return this.mode === UnifoldSemanticPublicationMode.Automatic;
  }

  private assertAdoptableOwner(): void {
    if (this.adoptedOwnerId === undefined) return;
    const current = publicationOwner(requireStaticPublication(this.owner, this.adoptedOwnerId));
    if (current === this.adoptedOwnerId) return;
    throw new UiSemanticConfigurationError(`Semantic head is already owned by ${current}.`);
  }

  private publishCompiled(serialized: string | undefined): void {
    if (serialized === undefined) removeJsonLd(this.owner, this.ownerId, this.adoptedOwnerId);
    else publishJsonLd(this.owner, serialized, this.ownerId, this.adoptedOwnerId);
    this.adoptedOwnerId = undefined;
  }
}

export function semanticSnapshotRecord(
  snapshots: readonly UiNodeSnapshot[]
): Readonly<Record<string, UiNodeSnapshot>> {
  return Object.fromEntries(snapshots.map((snapshot) => [snapshot.id, snapshot]));
}

function compile(
  document: UnifoldIrDocument,
  snapshots: Readonly<Record<string, UiNodeSnapshot>>
): string | undefined {
  if (document.semantics === undefined) return undefined;
  const result = compileSemanticGraph(document.semantics, {
    compositionsByInstanceId: document.compositionsByInstanceId,
    snapshots
  });
  if (result.status === SemanticCompilationStatus.Invalid) throw semanticError(result.diagnostics);
  return result.serialized;
}

function semanticError(
  diagnostics: readonly { readonly code: unknown; readonly path: string }[]
): UiSemanticConfigurationError {
  const first = diagnostics[0];
  const detail =
    first === undefined ? "unknown semantic failure" : `${String(first.code)} at ${first.path}`;
  return new UiSemanticConfigurationError(`Semantic graph rejected: ${detail}.`);
}

function nextOwnerId(document: Document): string {
  const ownerIds = existingOwnerIds(document);
  let ownerId = ownerCandidate();
  while (ownerIds.has(ownerId)) ownerId = ownerCandidate();
  return ownerId;
}

function ownerCandidate(): string {
  ownerSequence += 1;
  return `unifold-application-${ownerSequence}`;
}

function existingOwnerIds(document: Document): ReadonlySet<string | undefined> {
  return new Set(existingPublications(document).map(publicationOwner));
}

function existingPublications(document: Document): readonly HTMLScriptElement[] {
  return [...document.head.querySelectorAll<HTMLScriptElement>(publicationSelector)];
}

function requireStaticPublication(document: Document, ownerId: string): HTMLScriptElement {
  const publications = existingPublications(document).filter(
    (publication) => publicationOwner(publication) === ownerId
  );
  const publication = publications[0];
  if (publications.length === 1 && publication !== undefined) return publication;
  throw new UiSemanticConfigurationError(
    `Static semantic owner ${ownerId} must contain exactly one publication; found ${publications.length}.`
  );
}

function publicationOwner(publication: HTMLScriptElement): string | undefined {
  return publication.dataset["unifoldSemantics"];
}

function runtimeSnapshots(
  document: UnifoldIrDocument,
  runtime: UnifoldRuntime
): Readonly<Record<string, UiNodeSnapshot>> {
  return Object.fromEntries(document.renderOrder.map((id) => [id, runtime.getSnapshot(id)]));
}
