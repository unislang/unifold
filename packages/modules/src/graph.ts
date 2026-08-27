import { qualifiedModuleName } from "./namespacing.js";
import { uiModuleKey } from "./registry.js";
import {
  UiModuleDiagnosticCode,
  type RegisteredUiModule,
  type UiModuleDiagnostic,
  type UiModuleRegistry
} from "./types.js";

const MAXIMUM_MODULE_GRAPH_SIZE = 128;

export interface UiModuleGraphNode {
  readonly namespace: string;
  readonly registered: RegisteredUiModule;
}

export interface UiModuleGraphResult {
  readonly diagnostics: readonly UiModuleDiagnostic[];
  readonly nodes: readonly UiModuleGraphNode[];
}

interface GraphState {
  readonly diagnostics: UiModuleDiagnostic[];
  readonly nodes: UiModuleGraphNode[];
  readonly registry: UiModuleRegistry;
  readonly visiting: Set<string>;
}

export function resolveUiModuleGraph(
  registry: UiModuleRegistry,
  root: RegisteredUiModule
): UiModuleGraphResult {
  const state: GraphState = { diagnostics: [], nodes: [], registry, visiting: new Set() };
  visitModule(root, "", state);
  return { diagnostics: state.diagnostics, nodes: state.nodes };
}

function visitModule(registered: RegisteredUiModule, namespace: string, state: GraphState): void {
  if (state.nodes.length + state.visiting.size >= MAXIMUM_MODULE_GRAPH_SIZE) {
    state.diagnostics.push(
      diagnostic(UiModuleDiagnosticCode.GraphLimitExceeded, registered, "/imports")
    );
    return;
  }
  const key = uiModuleKey(registered.module.id, registered.module.version);
  if (state.visiting.has(key)) {
    state.diagnostics.push(diagnostic(UiModuleDiagnosticCode.Cycle, registered, "/imports"));
    return;
  }
  state.visiting.add(key);
  registered.module.imports.forEach((item, index) =>
    visitImport(registered, item, index, namespace, state)
  );
  state.visiting.delete(key);
  state.nodes.push({ namespace, registered });
}

function visitImport(
  owner: RegisteredUiModule,
  item: RegisteredUiModule["module"]["imports"][number],
  index: number,
  namespace: string,
  state: GraphState
): void {
  const imported = state.registry.modules.get(uiModuleKey(item.moduleId, item.version));
  if (imported === undefined) {
    state.diagnostics.push(importDiagnostic(UiModuleDiagnosticCode.ImportNotFound, owner, index));
    return;
  }
  if (!validateImport(owner, imported, item.integrity, index, state)) return;
  visitModule(imported, qualifiedModuleName(namespace, item.namespace), state);
}

function validateImport(
  owner: RegisteredUiModule,
  imported: RegisteredUiModule,
  expectedIntegrity: string,
  index: number,
  state: GraphState
): boolean {
  const importedKey = uiModuleKey(imported.module.id, imported.module.version);
  if (state.visiting.has(importedKey)) {
    state.diagnostics.push(importDiagnostic(UiModuleDiagnosticCode.Cycle, owner, index));
    return false;
  }
  if (imported.integrity !== expectedIntegrity) {
    state.diagnostics.push(
      importDiagnostic(UiModuleDiagnosticCode.ImportIntegrityMismatch, owner, index)
    );
    return false;
  }
  return true;
}

function importDiagnostic(
  code: UiModuleDiagnosticCode,
  owner: RegisteredUiModule,
  index: number
): UiModuleDiagnostic {
  return diagnostic(code, owner, `/imports/${index}`);
}

function diagnostic(
  code: UiModuleDiagnosticCode,
  registered: RegisteredUiModule,
  path: string
): UiModuleDiagnostic {
  return {
    code,
    message: `UiModule graph resolution failed: ${code}.`,
    path,
    sourceId: registered.sourceId
  };
}
