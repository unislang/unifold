import type { UiNodeSnapshot } from "@unislang/unifold-events";
import { createNodeSnapshot } from "@unislang/unifold-renderer-dom";
import {
  SemanticCompilationStatus,
  compileSemanticGraph,
  schemaOrgContext,
  serializeJsonLd,
  type SemanticDiagnostic,
  type SemanticGraph
} from "@unislang/unifold-semantics";
import {
  UnifoldApplicationDiagnosticStage,
  type PreparedUnifoldDocument,
  type UnifoldApplicationDiagnostic
} from "@unislang/unifold";

import { staticNodeClassification } from "./static-renderer.js";

interface StaticSemanticResult {
  readonly diagnostics: readonly UnifoldApplicationDiagnostic[];
  readonly serialized?: string;
}

export function compileStaticSemantics(prepared: PreparedUnifoldDocument): StaticSemanticResult {
  const definition = prepared.document.semantics;
  if (definition === undefined) return emptySemantics();
  return compileGraph(definition, prepared);
}

function compileGraph(
  graph: SemanticGraph,
  prepared: PreparedUnifoldDocument
): StaticSemanticResult {
  const document = prepared.document;
  const result = compileSemanticGraph(graph, {
    compositionsByInstanceId: document.compositionsByInstanceId,
    snapshots: staticSnapshots(prepared)
  });
  if (result.status === SemanticCompilationStatus.Invalid) {
    return { diagnostics: result.diagnostics.map(semanticDiagnostic) };
  }
  return { diagnostics: [], serialized: requireSerialized(result.serialized) };
}

function semanticDiagnostic(diagnostic: SemanticDiagnostic): UnifoldApplicationDiagnostic {
  return {
    code: String(diagnostic.code),
    message: diagnostic.message,
    path: `/semantics${diagnostic.path}`,
    stage: UnifoldApplicationDiagnosticStage.Compilation
  };
}

function staticSnapshots(prepared: PreparedUnifoldDocument) {
  const document = prepared.document;
  return Object.fromEntries(
    document.renderOrder.map((id) => [id, classifiedSnapshot(prepared, id)] as const)
  );
}

function classifiedSnapshot(prepared: PreparedUnifoldDocument, id: string): UiNodeSnapshot {
  const document = prepared.document;
  const node = document.nodesById[id];
  if (node === undefined) throw new Error(`Static semantic node is missing: ${id}.`);
  const snapshot = createNodeSnapshot(node, 0);
  return {
    ...snapshot,
    base: { ...snapshot.base, dataClassification: staticNodeClassification(document, node) }
  };
}

function emptySemantics(): StaticSemanticResult {
  return {
    diagnostics: [],
    serialized: serializeJsonLd({ "@context": schemaOrgContext, "@graph": [] })
  };
}

function requireSerialized(value: string | undefined): string {
  if (value === undefined) throw new Error("Valid static semantics have no serialized graph.");
  return value;
}
