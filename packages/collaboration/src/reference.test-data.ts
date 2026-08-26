import { initialDocument } from "./collaboration.test-data.js";
import {
  CollaborationActorType,
  CollaborationErrorCode,
  type CollaborationRevision,
  type ReferenceCollaborationOptions
} from "./types.js";

export function referenceOptions(
  overrides: Partial<ReferenceCollaborationOptions> = {}
): ReferenceCollaborationOptions {
  return {
    clock: { now: () => new Date("2026-08-25T12:00:00.000Z") },
    initialDocument: initialDocument(),
    tenantId: "tenant-1",
    validation: {
      validate: (document) =>
        typeof (document["view"] as { title?: unknown }).title === "string"
          ? []
          : [
              {
                code: CollaborationErrorCode.SchemaRejected,
                messageKey: "document.title.required"
              }
            ]
    },
    ...overrides
  };
}

export function revision(overrides: Partial<CollaborationRevision> = {}): CollaborationRevision {
  return {
    actorId: "author-1",
    actorType: CollaborationActorType.Human,
    branchId: "main",
    changedPaths: ["/view/title"],
    committedAt: "2026-08-25T12:00:00.000Z",
    correlationId: "correlation-1",
    document: initialDocument(),
    parentRevision: "r1",
    removedPaths: [],
    revision: "r2",
    sequence: 2,
    tenantId: "tenant-1",
    ...overrides
  };
}
