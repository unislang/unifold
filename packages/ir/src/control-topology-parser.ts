import { UiControlNodeKind, UiControlTopologyVersion } from "@unislang/unifold-contracts";

import { errorDiagnostic } from "./diagnostics.js";
import { DiagnosticCode } from "./enums.js";
import { isPlainObject } from "./json-safety.js";
import type { CompilerDiagnostic } from "./types.js";

export interface ParsedControlDefinition {
  readonly id: string;
  readonly key?: string;
  readonly kind: UiControlNodeKind;
  readonly parentId?: string;
  readonly path: string;
}

const topologyKeys = new Set(["contractVersion", "nodes"]);
const definitionKeys = new Set(["id", "key", "kind", "parentId"]);
const kinds = new Set<string>(Object.values(UiControlNodeKind));

export function parseControlTopology(
  value: unknown,
  diagnostics: CompilerDiagnostic[]
): readonly ParsedControlDefinition[] | undefined {
  const topology = readTopology(value, diagnostics);
  if (topology === undefined) return undefined;
  const nodes = readNodes(topology, diagnostics);
  if (nodes === undefined) return undefined;
  validateNodeLimit(nodes, diagnostics);
  return nodes.flatMap((node, index) => optionalDefinition(node, index, diagnostics));
}

function readTopology(
  value: unknown,
  diagnostics: CompilerDiagnostic[]
): Readonly<Record<string, unknown>> | undefined {
  if (value === undefined) return undefined;
  if (isPlainObject(value)) return validatedTopologyObject(value, diagnostics);
  add(diagnostics, "/controls", "Controls must be an object.");
  return undefined;
}

function validatedTopologyObject(
  value: Readonly<Record<string, unknown>>,
  diagnostics: CompilerDiagnostic[]
): Readonly<Record<string, unknown>> {
  rejectKeys(value, topologyKeys, "/controls", diagnostics);
  if (value["contractVersion"] !== UiControlTopologyVersion.Version1) {
    add(diagnostics, "/controls/contractVersion", 'Expected "1.0.0".');
  }
  return value;
}

function readNodes(
  topology: Readonly<Record<string, unknown>>,
  diagnostics: CompilerDiagnostic[]
): readonly unknown[] | undefined {
  const nodes = topology["nodes"];
  if (Array.isArray(nodes)) return nodes;
  add(diagnostics, "/controls/nodes", "Nodes must be an array.");
  return undefined;
}

function validateNodeLimit(nodes: readonly unknown[], diagnostics: CompilerDiagnostic[]): void {
  if (nodes.length > 10_000) {
    add(diagnostics, "/controls/nodes", "At most 10000 controls are allowed.");
  }
}

function optionalDefinition(
  value: unknown,
  index: number,
  diagnostics: CompilerDiagnostic[]
): ParsedControlDefinition[] {
  const path = `/controls/nodes/${String(index)}`;
  const object = readDefinitionObject(value, path, diagnostics);
  if (object === undefined) return [];
  rejectKeys(object, definitionKeys, path, diagnostics);
  return createDefinition(object, path, diagnostics);
}

function readDefinitionObject(
  value: unknown,
  path: string,
  diagnostics: CompilerDiagnostic[]
): Readonly<Record<string, unknown>> | undefined {
  if (isPlainObject(value)) return value;
  add(diagnostics, path, "Control definition must be an object.");
  return undefined;
}

function createDefinition(
  value: Readonly<Record<string, unknown>>,
  path: string,
  diagnostics: CompilerDiagnostic[]
): ParsedControlDefinition[] {
  const id = stringValue(value["id"], `${path}/id`, diagnostics);
  const kind = kindValue(value["kind"], `${path}/kind`, diagnostics);
  const parentId = optionalString(value["parentId"], `${path}/parentId`, diagnostics);
  const key = optionalString(value["key"], `${path}/key`, diagnostics);
  if (id === undefined) return [];
  if (kind === undefined) return [];
  return [{ id, kind, path, ...optionalParent(parentId), ...optionalKey(key) }];
}

function optionalParent(parentId: string | undefined): { readonly parentId?: string } {
  return parentId === undefined ? {} : { parentId };
}

function optionalKey(key: string | undefined): { readonly key?: string } {
  return key === undefined ? {} : { key };
}

function rejectKeys(
  value: Readonly<Record<string, unknown>>,
  allowed: ReadonlySet<string>,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  Object.keys(value)
    .filter((key) => !allowed.has(key))
    .forEach((key) => unknownKey(key, path, diagnostics));
}

function unknownKey(key: string, path: string, diagnostics: CompilerDiagnostic[]): void {
  add(diagnostics, `${path}/${escapePointer(key)}`, `Unknown control topology property "${key}".`);
}

function stringValue(
  value: unknown,
  path: string,
  diagnostics: CompilerDiagnostic[]
): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  add(diagnostics, path, "Expected a non-empty string.");
  return undefined;
}

function optionalString(
  value: unknown,
  path: string,
  diagnostics: CompilerDiagnostic[]
): string | undefined {
  return value === undefined ? undefined : stringValue(value, path, diagnostics);
}

function kindValue(
  value: unknown,
  path: string,
  diagnostics: CompilerDiagnostic[]
): UiControlNodeKind | undefined {
  if (typeof value === "string" && kinds.has(value)) return value as UiControlNodeKind;
  add(diagnostics, path, "Expected an enum-backed control kind.");
  return undefined;
}

function add(diagnostics: CompilerDiagnostic[], path: string, message: string): void {
  diagnostics.push(errorDiagnostic(DiagnosticCode.InvalidControlTopology, message, path));
}

function escapePointer(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}
