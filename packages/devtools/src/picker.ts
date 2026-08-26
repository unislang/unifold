import type { UiRuntimeInspectionSnapshot } from "@unislang/unifold-runtime";

import { projectNode } from "./privacy.js";
import type { DevtoolsNodeFilter, DevtoolsNodeInspection } from "./types.js";

export function inspectNodes(
  inspection: UiRuntimeInspectionSnapshot,
  filter: DevtoolsNodeFilter = {}
): readonly DevtoolsNodeInspection[] {
  const limit = filter.limit ?? 200;
  validateLimit(limit);
  const query = normalizedQuery(filter.query);
  return Object.freeze(
    inspection.nodes
      .filter((node) => matchesScope(node, filter.scopeId))
      .filter((node) => matchesQuery(node, query))
      .slice(0, limit)
      .map(projectNode)
  );
}

function normalizedQuery(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const query = value.trim().toLowerCase();
  validateQuery(query);
  return query.length === 0 ? undefined : query;
}

function validateLimit(limit: number): void {
  const valid = [Number.isInteger(limit), limit >= 1, limit <= 500].every(Boolean);
  if (!valid)
    throw new RangeError("Devtools node result limits must be integers from 1 through 500.");
}

function validateQuery(query: string): void {
  if (query.length > 128)
    throw new RangeError("Devtools node queries are limited to 128 characters.");
}

function matchesScope(
  node: UiRuntimeInspectionSnapshot["nodes"][number],
  scopeId: string | undefined
): boolean {
  return scopeId === undefined || node.scopePath.includes(scopeId);
}

function matchesQuery(
  node: UiRuntimeInspectionSnapshot["nodes"][number],
  query: string | undefined
): boolean {
  return query === undefined || nodeSearchText(node).includes(query);
}

function nodeSearchText(node: UiRuntimeInspectionSnapshot["nodes"][number]): string {
  return `${node.id} ${node.type} ${node.kind}`.toLowerCase();
}
