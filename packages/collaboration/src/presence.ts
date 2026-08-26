import { freezeDocument } from "./reference-support.js";
import type {
  CollaborationActorContext,
  CollaborationPresence,
  CollaborationPresenceRequest
} from "./types.js";

export class CollaborationPresenceRegistry {
  readonly #entries = new Map<string, CollaborationPresence>();

  update(
    request: CollaborationPresenceRequest,
    actor: CollaborationActorContext,
    nowMs: number
  ): CollaborationPresence {
    this.sweep(nowMs);
    const presence = freezePresence({
      actorId: actor.actorId,
      actorType: actor.actorType,
      branchId: request.branchId,
      ...(request.cursor === undefined ? {} : { cursor: freezeDocument(request.cursor) }),
      draft: request.draft,
      expiresAt: new Date(nowMs + request.expiresInMs).toISOString(),
      ...(request.selectedId === undefined ? {} : { selectedId: request.selectedId }),
      tenantId: actor.tenantId
    });
    this.#entries.set(presenceKey(actor.tenantId, request.branchId, actor.actorId), presence);
    return presence;
  }

  snapshot(tenantId: string, branchId: string, nowMs: number): readonly CollaborationPresence[] {
    this.sweep(nowMs);
    return [...this.#entries.values()].filter(
      (presence) => presence.tenantId === tenantId && presence.branchId === branchId
    );
  }

  remove(tenantId: string, branchId: string, actorId: string): boolean {
    return this.#entries.delete(presenceKey(tenantId, branchId, actorId));
  }

  sweep(nowMs: number): number {
    let removed = 0;
    for (const [key, presence] of this.#entries) {
      if (Date.parse(presence.expiresAt) > nowMs) continue;
      this.#entries.delete(key);
      removed += 1;
    }
    return removed;
  }
}

function presenceKey(tenantId: string, branchId: string, actorId: string): string {
  return `${tenantId}\u0000${branchId}\u0000${actorId}`;
}

function freezePresence(value: CollaborationPresence): CollaborationPresence {
  return Object.freeze(value);
}
