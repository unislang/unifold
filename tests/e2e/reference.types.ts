import type { UnifoldApplicationUpdateStatus } from "@unislang/unifold";

export interface DynamicNode {
  $comp: string;
  $children?: DynamicNode[];
  id: string;
  label: string;
  options?: { label: string; value: string }[];
}

interface DynamicAuthoredDocument {
  compositions: [{ template: { $children: DynamicNode[] } }];
  revision: string;
}

export interface DynamicUpdateResult {
  readonly diagnostics: readonly { readonly path: string }[];
  readonly status: UnifoldApplicationUpdateStatus;
}

export interface DynamicWindow {
  __unifoldAuthoredDocument: DynamicAuthoredDocument;
  __unifoldStableNode: Element | null;
  __unifoldUpdateDocument(source: unknown): DynamicUpdateResult;
}
