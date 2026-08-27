import { compositionError } from "./diagnostics.js";
import { CompositionDiagnosticCode } from "./enums.js";
import type { CompositionDiagnostic } from "./types.js";

export interface CompositionEdge {
  readonly key: string;
  readonly label: string;
  readonly path: string;
}

interface GraphState {
  readonly adjacency: ReadonlyMap<string, readonly CompositionEdge[]>;
  readonly diagnostics: CompositionDiagnostic[];
  readonly visited: Set<string>;
  readonly visiting: Set<string>;
}

export function detectDefinitionCycles(
  adjacency: ReadonlyMap<string, readonly CompositionEdge[]>,
  diagnostics: CompositionDiagnostic[]
): void {
  const state: GraphState = { adjacency, diagnostics, visited: new Set(), visiting: new Set() };
  adjacency.forEach((_edges, key) => visitDefinition(key, state));
}

function visitDefinition(key: string, state: GraphState): void {
  if (state.visited.has(key)) return;
  state.visiting.add(key);
  (state.adjacency.get(key) ?? []).forEach((edge) => visitDefinitionEdge(edge, state));
  state.visiting.delete(key);
  state.visited.add(key);
}

function visitDefinitionEdge(edge: CompositionEdge, state: GraphState): void {
  if (state.visiting.has(edge.key)) return reportCycle(edge, state.diagnostics);
  if (state.adjacency.has(edge.key)) visitDefinition(edge.key, state);
}

function reportCycle(edge: CompositionEdge, diagnostics: CompositionDiagnostic[]): void {
  diagnostics.push(
    compositionError(
      CompositionDiagnosticCode.Cycle,
      edge.path,
      `Composition definition cycle detected at ${edge.label}.`
    )
  );
}
