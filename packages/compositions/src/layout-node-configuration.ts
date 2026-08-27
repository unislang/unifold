import type { JsonValue } from "@unislang/unifold-contracts";

import type { LayoutCollectionControlMember } from "./layout-collection-controls.js";
import type { CompositionDiagnostic, LayoutCollectionDefinition } from "./types.js";

export interface LayoutNodeExpansionContext {
  readonly collectionControlMembers: LayoutCollectionControlMember[];
  readonly collectionsById: Record<string, LayoutCollectionDefinition>;
  readonly diagnostics: CompositionDiagnostic[];
  readonly ids: Set<string>;
  readonly repeatNamespace?: string;
  readonly sourcePointers: Record<string, string>;
  readonly variablePointers: Readonly<Record<string, string>>;
  readonly variables: Readonly<Record<string, JsonValue>>;
}

export interface LayoutRootExpansionOptions {
  readonly collectionControlMembers?: LayoutCollectionControlMember[];
  readonly collectionsById?: Record<string, LayoutCollectionDefinition>;
  readonly rootPointer: string;
  readonly sourcePointers: Record<string, string>;
  readonly variablePointers: Readonly<Record<string, string>>;
}

export enum ConditionDecision {
  Exclude = "exclude",
  Include = "include",
  Invalid = "invalid"
}

export const LAYOUT_NODE_KEYS = new Set(
  "children collection emptyFocusTarget events for id if key props type".split(" ")
);

export const BOOLEAN_CONDITION_DECISIONS = {
  false: ConditionDecision.Exclude,
  true: ConditionDecision.Include
} as const;
