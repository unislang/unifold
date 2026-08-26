import type { JsonObject, JsonValue } from "@unislang/unifold-contracts";

import { CompositionDiagnosticCode } from "./enums.js";
import { resolveLayoutEvents } from "./layout-events.js";
import { layoutValueSourcePointer } from "./layout-source-pointers.js";
import { isLayoutObject, resolveLayoutValue } from "./layout-values.js";
import type { CompositionDiagnostic } from "./types.js";

interface LayoutNodeContent {
  readonly children: readonly JsonObject[];
  readonly events: JsonObject;
  readonly props: JsonObject;
}

interface LayoutNodeResolutionContext {
  readonly diagnostics: CompositionDiagnostic[];
  readonly variablePointers: Readonly<Record<string, string>>;
  readonly variables: Readonly<Record<string, JsonValue>>;
}

type ChildExpander = (value: unknown, path: string) => readonly JsonObject[];

export function resolveLayoutNodeContent(
  value: Readonly<Record<string, unknown>>,
  path: string,
  context: LayoutNodeResolutionContext,
  expandChild: ChildExpander
): LayoutNodeContent | undefined {
  const props = resolveProps(value["props"], `${path}/props`, context);
  if (props === undefined) return undefined;
  return resolveChildrenAndEvents(value, props, path, context, expandChild);
}

function resolveChildrenAndEvents(
  value: Readonly<Record<string, unknown>>,
  props: JsonObject,
  path: string,
  context: LayoutNodeResolutionContext,
  expandChild: ChildExpander
): LayoutNodeContent | undefined {
  const children = resolveChildren(value["children"], `${path}/children`, context, expandChild);
  if (children === undefined) return undefined;
  const events = resolveLayoutEvents(value["events"], `${path}/events`, context.diagnostics);
  return events === undefined ? undefined : { children, events, props };
}

function resolveProps(
  value: unknown,
  path: string,
  context: LayoutNodeResolutionContext
): JsonObject | undefined {
  if (value === undefined) return {};
  return resolvePropsObject(value, path, context);
}

function resolvePropsObject(
  value: unknown,
  path: string,
  context: LayoutNodeResolutionContext
): JsonObject | undefined {
  if (!isLayoutObject(value)) return report(path, context, "Node props must be an object.");
  const resolved = resolveValue(value, path, context);
  if (isLayoutObject(resolved)) return resolved as JsonObject;
  return report(path, context, "Resolved props must be an object.");
}

function resolveChildren(
  value: unknown,
  path: string,
  context: LayoutNodeResolutionContext,
  expandChild: ChildExpander
): readonly JsonObject[] | undefined {
  if (value === undefined) return [];
  const resolved = childArrayValue(value, path, context);
  if (!Array.isArray(resolved))
    return report(path, context, "Node children must resolve to an array.");
  const sourcePointer = layoutValueSourcePointer(value, path, context.variablePointers);
  return resolved.flatMap((child, index) =>
    expandChild(child, `${sourcePointer}/${String(index)}`)
  );
}

function childArrayValue(
  value: unknown,
  path: string,
  context: LayoutNodeResolutionContext
): unknown {
  if (Array.isArray(value)) return value;
  return resolveValue(value, path, context);
}

function resolveValue(value: unknown, path: string, context: LayoutNodeResolutionContext): unknown {
  return resolveLayoutValue(value, path, context.variables, context.diagnostics);
}

function report(path: string, context: LayoutNodeResolutionContext, message: string): undefined {
  context.diagnostics.push({ code: CompositionDiagnosticCode.InvalidLayoutNode, message, path });
  return undefined;
}
