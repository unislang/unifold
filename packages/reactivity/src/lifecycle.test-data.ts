import type { UiTransactionMetadata } from "@unislang/unifold-events";
import type { NodeRecipe } from "./index.js";

export function metadata(id: string): UiTransactionMetadata {
  return {
    id,
    correlationId: `correlation-${id}`,
    timestamp: "2026-08-24T00:00:00.000Z"
  };
}

export function setValue(value: string): NodeRecipe {
  return (node) => {
    if (node.control === undefined) return;
    Object.assign(node.control, { value });
  };
}
