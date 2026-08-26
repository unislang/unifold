import type { JsonObject } from "@unislang/unifold-contracts";

export function largeVirtualListNode(): JsonObject {
  return {
    $comp: "VirtualList",
    id: "records",
    label: "Records",
    options: Array.from({ length: 205 }, (_, index) => ({
      disabled: index === 204,
      label: index === 204 ? "" : `Item ${index}`,
      value: `item-${index}`
    })),
    value: "item-204"
  };
}
