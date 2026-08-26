import { expect, it } from "vitest";

import { expandLayoutRoot } from "./layout-nodes.js";

const repeatVariables = {
  invalidKey: [{ id: null }],
  items: [{ id: "first", label: "One" }],
  missingKey: [{ label: "Missing" }],
  notArray: "invalid",
  primitives: ["invalid"]
};

const invalidRepeatNodes = [
  { for: 1, id: "row", key: "id", type: "Text" },
  { for: "invalid", id: "row", key: "id", type: "Text" },
  { for: "item in {{items}}", id: "row", key: "constructor", type: "Text" },
  { for: "item in {{notArray}}", id: "row", key: "id", type: "Text" },
  { for: "item in {{primitives}}", id: "row", key: "id", type: "Text" },
  { for: "item in {{missingKey}}", id: "row", key: "id", type: "Text" },
  { for: "item in {{invalidKey}}", id: "row", key: "id", type: "Text" }
];

it("expands one nested root and rejects a non-object root", () => {
  const diagnostics: Parameters<typeof expandLayoutRoot>[2] = [];
  const sourcePointers: Record<string, string> = {};
  const options = { rootPointer: "/layouts/0/template", sourcePointers, variablePointers: {} };
  expect(expandLayoutRoot({ id: "root", type: "Stack" }, {}, diagnostics, options)).toEqual({
    $comp: "Stack",
    id: "root"
  });
  expect(sourcePointers).toEqual({ root: "/layouts/0/template" });
  expect(expandLayoutRoot("invalid", {}, diagnostics, options)).toBeUndefined();
  expect(diagnostics).not.toHaveLength(0);
});

it("rejects invalid conditions, identities, types, and node content at exact pointers", () => {
  const cases = [
    { node: { id: "root", if: "yes", type: "Stack" }, path: "/root/if" },
    { node: { id: "constructor", type: "Stack" }, path: "/root/id" },
    { node: { id: "root", type: [] }, path: "/root/type" },
    { node: { id: "root", props: [], type: "Stack" }, path: "/root/props" },
    { node: { children: "nope", id: "root", type: "Stack" }, path: "/root/children" },
    { node: { events: "nope", id: "root", type: "Stack" }, path: "/root/events" }
  ];
  cases.forEach(({ node, path }) => {
    const result = expand(node);
    expect(result.value).toBeUndefined();
    expect(result.diagnostics.some((diagnostic) => diagnostic.path === path)).toBe(true);
  });
  expect(expand({ id: "root", if: false, type: "Stack" }).value).toBeUndefined();
});

it("validates repeat syntax, sources, records, and durable keys", () => {
  invalidRepeatNodes.forEach((node) => {
    const result = expand(node, repeatVariables);
    expect(result.value).toBeUndefined();
    expect(result.diagnostics).not.toHaveLength(0);
  });

  const valid = expand(
    {
      for: "item in {{items}}",
      id: "row",
      key: "id",
      props: { content: "{{item.label}}" },
      type: "Text"
    },
    repeatVariables
  );
  expect(valid.value?.["id"]).toBe("row::first");
  expect(valid.diagnostics).toEqual([]);
  expect(
    expand({ for: "item in {{items}}", id: "row", key: "id", type: "Text" }, { items: [{ id: 2 }] })
      .value?.["id"]
  ).toBe("row::2");
});

it("rejects duplicate resolved IDs and accepts nested children", () => {
  const duplicate = expand({
    children: [
      { id: "same", type: "Text" },
      { id: "same", type: "Text" }
    ],
    id: "root",
    type: "Stack"
  });
  expect(duplicate.value).toBeDefined();
  expect(duplicate.diagnostics.some(({ message }) => message.includes("Duplicate node id"))).toBe(
    true
  );
});

function expand(
  node: unknown,
  variables: Readonly<Record<string, never>> | Readonly<Record<string, unknown>> = {}
): {
  readonly diagnostics: Parameters<typeof expandLayoutRoot>[2];
  readonly value: ReturnType<typeof expandLayoutRoot>;
} {
  const diagnostics: Parameters<typeof expandLayoutRoot>[2] = [];
  const value = expandLayoutRoot(
    node,
    variables as Parameters<typeof expandLayoutRoot>[1],
    diagnostics,
    { rootPointer: "/root", sourcePointers: {}, variablePointers: {} }
  );
  return { diagnostics, value };
}
