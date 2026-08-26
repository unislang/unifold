import { controlPlaneFingerprint } from "./fingerprint.js";
import type { ControlPlaneService } from "./service.js";
import { createControlPlaneService } from "./service.js";
import type { ReferenceControlPlaneOptions } from "./ports.js";
import { createReferenceAuthorizationPort, createReferenceIdentityPort } from "./reference-auth.js";
import { createReferenceEffectRegistry } from "./reference-effects.js";
import { ReferenceControlPlaneStore } from "./reference-store.js";
import { ControlPlaneTenantIsolationTier } from "./types.js";

export interface ReferenceControlPlane {
  readonly isolationTier: ControlPlaneTenantIsolationTier;
  readonly service: ControlPlaneService;
  readonly store: ReferenceControlPlaneStore;
}

export function createReferenceControlPlane(
  options: ReferenceControlPlaneOptions = {}
): ReferenceControlPlane {
  const store = new ReferenceControlPlaneStore({
    maxDocumentsPerTenant: options.maxDocumentsPerTenant,
    realtimeRetention: options.realtimeRetention
  });
  const service = createControlPlaneService({
    authorization: createReferenceAuthorizationPort(options.grants),
    clock: options.clock ?? systemClock,
    effects: createReferenceEffectRegistry(options.effects),
    fingerprint: controlPlaneFingerprint,
    identity: createReferenceIdentityPort(options.sessions),
    store
  });
  return Object.freeze({
    isolationTier: ControlPlaneTenantIsolationTier.SharedSchemaTenantKey,
    service,
    store
  });
}

const systemClock = Object.freeze({
  now: () => new Date().toISOString()
});
