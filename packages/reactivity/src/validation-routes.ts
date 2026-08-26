import type { UiNodeId, UiNodeSnapshot, UiValidationError } from "@unislang/unifold-events";
import { castDraft, type Draft } from "immer";

import type { NormalizedNodeState } from "./store-types.js";

type MutableValidationRoutes = Record<UiNodeId, UiValidationError[] | undefined>;

export type UiValidationRoutes = Readonly<
  Record<UiNodeId, readonly UiValidationError[] | undefined>
>;

export function reconcileValidationRoutes(
  state: Draft<NormalizedNodeState>,
  ownerIds?: ReadonlySet<UiNodeId>
): void {
  if (ownerIds !== undefined) return reconcileOwnedValidationRoutes(state, ownerIds);
  const next = createValidationRoutes(
    state.nodes as unknown as Readonly<Record<UiNodeId, UiNodeSnapshot>>
  );
  removeExpiredRoutes(state, next);
  applyChangedRoutes(state, next);
}

function reconcileOwnedValidationRoutes(
  state: Draft<NormalizedNodeState>,
  ownerIds: ReadonlySet<UiNodeId>
): void {
  const routes = state.validationRoutes as unknown as MutableValidationRoutes;
  removeOwnedRoutes(routes, ownerIds);
  const nodes = state.nodes as unknown as Readonly<Record<UiNodeId, UiNodeSnapshot>>;
  ownerIds.forEach((id) => {
    const node = nodes[id];
    if (node !== undefined) routeOwnedErrors(nodes, routes, node);
  });
}

function removeOwnedRoutes(routes: MutableValidationRoutes, ownerIds: ReadonlySet<UiNodeId>): void {
  Object.entries(routes).forEach(([id, errors]) =>
    reconcileOwnedRoute(routes, id, errors, ownerIds)
  );
}

function reconcileOwnedRoute(
  routes: MutableValidationRoutes,
  id: UiNodeId,
  errors: readonly UiValidationError[] | undefined,
  ownerIds: ReadonlySet<UiNodeId>
): void {
  if (errors === undefined) return;
  const retained = errors.filter((error) => retainRoutedError(error, ownerIds));
  applyRetainedRoute(routes, id, errors, retained);
}

function applyRetainedRoute(
  routes: MutableValidationRoutes,
  id: UiNodeId,
  errors: readonly UiValidationError[],
  retained: UiValidationError[]
): void {
  if (retained.length === 0) return void Reflect.deleteProperty(routes, id);
  if (!sameErrors(errors, retained)) routes[id] = retained;
}

function retainRoutedError(error: UiValidationError, ownerIds: ReadonlySet<UiNodeId>): boolean {
  if (error.ownerId === undefined) return true;
  return !ownerIds.has(error.ownerId);
}

export function createValidationRoutes(
  nodes: Readonly<Record<UiNodeId, UiNodeSnapshot>>
): UiValidationRoutes {
  const routes: Record<UiNodeId, UiValidationError[]> = {};
  Object.values(nodes).forEach((node) => routeOwnedErrors(nodes, routes, node));
  return routes;
}

function routeOwnedErrors(
  nodes: Readonly<Record<UiNodeId, UiNodeSnapshot>>,
  routes: MutableValidationRoutes,
  node: UiNodeSnapshot
): void {
  node.control?.errors.forEach((error) => {
    if (error.ownerId === node.id) routeError(nodes, routes, error);
  });
}

function routeError(
  nodes: Readonly<Record<UiNodeId, UiNodeSnapshot>>,
  routes: MutableValidationRoutes,
  error: UiValidationError
): void {
  new Set(error.affectedIds ?? []).forEach((id) => {
    if (id !== error.ownerId) appendRoute(nodes, routes, id, error);
  });
}

function appendRoute(
  nodes: Readonly<Record<UiNodeId, UiNodeSnapshot>>,
  routes: MutableValidationRoutes,
  id: UiNodeId,
  error: UiValidationError
): void {
  requireControlTarget(nodes, id);
  const route = routes[id] ?? [];
  route.push(error);
  routes[id] = route;
}

function requireControlTarget(
  nodes: Readonly<Record<UiNodeId, UiNodeSnapshot>>,
  id: UiNodeId
): void {
  const target = nodes[id];
  if (target === undefined) throw new Error(`Unknown validation target: ${id}.`);
  if (target.control === undefined) throw new Error(`Validation target is not a control: ${id}.`);
}

function removeExpiredRoutes(state: Draft<NormalizedNodeState>, next: UiValidationRoutes): void {
  Object.keys(state.validationRoutes).forEach((id) => {
    if (next[id] === undefined) Reflect.deleteProperty(state.validationRoutes, id);
  });
}

function applyChangedRoutes(state: Draft<NormalizedNodeState>, next: UiValidationRoutes): void {
  Object.entries(next).forEach(([id, errors]) => {
    const current = state.validationRoutes[id] as unknown as readonly UiValidationError[];
    if (!sameErrors(current, errors)) {
      state.validationRoutes[id] = castDraft(errors ?? []);
    }
  });
}

function sameErrors(
  current: readonly UiValidationError[] | undefined,
  next: readonly UiValidationError[] | undefined
): boolean {
  return JSON.stringify(current) === JSON.stringify(next);
}
