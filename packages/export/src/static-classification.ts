import { DataClassification } from "@unislang/unifold-contracts";
import type { UnifoldIrDocument, UnifoldIrNode } from "@unislang/unifold-ir";

export function staticNodeClassification(
  document: UnifoldIrDocument,
  node: UnifoldIrNode
): DataClassification {
  if (node.binding === undefined) return DataClassification.Public;
  const store = document.storesById[node.binding.store];
  return store === undefined ? DataClassification.NeverExport : store.classification;
}
