import { MAXIMUM_PAGINATION_ITEMS, PaginationItemKind } from "@unislang/unifold-catalog";

const identifierSchema = Object.freeze({
  maxLength: 128,
  minLength: 1,
  not: { enum: ["__proto__", "constructor", "prototype"] },
  type: "string"
});

export const paginationItemListSchema = Object.freeze({
  items: {
    additionalProperties: false,
    properties: {
      accessibleLabel: { maxLength: 512, minLength: 1, type: "string" },
      current: { type: "boolean" },
      disabled: { type: "boolean" },
      href: { type: "string" },
      id: identifierSchema,
      kind: { enum: Object.values(PaginationItemKind), type: "string" },
      label: { maxLength: 512, minLength: 1, type: "string" }
    },
    required: ["accessibleLabel", "id", "kind", "label"],
    type: "object"
  },
  maxItems: MAXIMUM_PAGINATION_ITEMS,
  minItems: 1,
  type: "array"
});
