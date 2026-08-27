import type { UiEvent } from "@unislang/unifold-events";
import { Observable, Subject, type Subscription } from "rxjs";

import type { UnifoldApplicationPort } from "./types.js";

const maximumObservationTargets = 64;
const maximumIdentityLength = 128;
const identityPattern = /^[A-Za-z0-9](?:[A-Za-z0-9._:-]*[A-Za-z0-9])?$/u;

export interface UnifoldApplicationObservationIdentity {
  readonly applicationId: string;
  readonly tenantId: string;
}

export interface UnifoldApplicationObservationTarget extends UnifoldApplicationObservationIdentity {
  readonly application: Pick<UnifoldApplicationPort, "runtime">;
}

export interface UnifoldApplicationObservation extends UnifoldApplicationObservationIdentity {
  readonly event: UiEvent;
}

export interface UnifoldApplicationObserverOptions {
  readonly authorize: (identity: UnifoldApplicationObservationIdentity) => boolean;
}

export interface UnifoldApplicationObserver {
  readonly events$: Observable<UnifoldApplicationObservation>;
  dispose(): void;
}

export class UnifoldApplicationObservationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnifoldApplicationObservationError";
  }
}

export function createUnifoldApplicationObserver(
  targets: readonly UnifoldApplicationObservationTarget[],
  options: UnifoldApplicationObserverOptions
): UnifoldApplicationObserver {
  const identities = validateTargets(targets);
  const subject = new Subject<UnifoldApplicationObservation>();
  let active = identities.length;
  let disposed = false;
  const subscriptions = targets.map((target, index) =>
    target.application.runtime.events$.subscribe({
      complete: () => {
        active -= 1;
        if (active === 0) subject.complete();
      },
      next: (event) => publishAuthorized(subject, identities[index], event, options)
    })
  );
  return {
    events$: subject.asObservable(),
    dispose() {
      if (disposed) return;
      disposed = true;
      subscriptions.forEach(unsubscribe);
      subject.complete();
    }
  };
}

function validateTargets(
  targets: readonly UnifoldApplicationObservationTarget[]
): readonly Readonly<UnifoldApplicationObservationIdentity>[] {
  if (!validTargetCount(targets.length)) {
    throw new UnifoldApplicationObservationError(
      `Application observation requires 1-${maximumObservationTargets} targets.`
    );
  }
  const identities = targets.map(({ applicationId, tenantId }) =>
    Object.freeze({
      applicationId: validIdentity(applicationId, "application"),
      tenantId: validIdentity(tenantId, "tenant")
    })
  );
  requireUnique(
    identities.map(({ applicationId }) => applicationId),
    "Observed application IDs must be unique."
  );
  requireUnique(
    targets.map(({ application }) => application.runtime),
    "Observed application runtimes must be unique."
  );
  return identities;
}

function validIdentity(value: string, kind: string): string {
  if (!validIdentityLength(value.length) || !identityPattern.test(value)) {
    throw new UnifoldApplicationObservationError(`Invalid ${kind} observation identity.`);
  }
  return value;
}

function validTargetCount(count: number): boolean {
  return count > 0 && count <= maximumObservationTargets;
}

function validIdentityLength(length: number): boolean {
  return length > 0 && length <= maximumIdentityLength;
}

function requireUnique(values: readonly unknown[], message: string): void {
  if (new Set(values).size !== values.length) {
    throw new UnifoldApplicationObservationError(message);
  }
}

function publishAuthorized(
  subject: Subject<UnifoldApplicationObservation>,
  identity: Readonly<UnifoldApplicationObservationIdentity> | undefined,
  event: UiEvent,
  options: UnifoldApplicationObserverOptions
): void {
  if (identity === undefined || !isAuthorized(identity, options)) return;
  subject.next(Object.freeze({ ...identity, event }));
}

function isAuthorized(
  identity: Readonly<UnifoldApplicationObservationIdentity>,
  options: UnifoldApplicationObserverOptions
): boolean {
  try {
    return options.authorize(identity) === true;
  } catch {
    return false;
  }
}

function unsubscribe(subscription: Subscription): void {
  subscription.unsubscribe();
}
