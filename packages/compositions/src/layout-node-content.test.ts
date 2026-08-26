import { expect, it } from "vitest";

import { resolveLayoutNodeContent } from "./layout-node-content.js";

it("resolves props, children, and events through one node boundary", () => {
  const diagnostics: Parameters<typeof resolveLayoutNodeContent>[2]["diagnostics"] = [];
  const content = resolveLayoutNodeContent(
    {
      children: [{ id: "child" }],
      events: { onClick: "SAVE" },
      props: { label: "{{label}}" }
    },
    "/node",
    { diagnostics, variablePointers: {}, variables: { label: "Save" } },
    (child) => [child as Record<string, never>]
  );
  expect(content).toEqual({
    children: [{ id: "child" }],
    events: { events: { activated: "SAVE" } },
    props: { label: "Save" }
  });
  expect(diagnostics).toEqual([]);
});

it("uses a referenced variable pointer for expanded children", () => {
  const diagnostics: Parameters<typeof resolveLayoutNodeContent>[2]["diagnostics"] = [];
  const paths: string[] = [];
  resolveLayoutNodeContent(
    { children: { $var: "fields" } },
    "/template",
    {
      diagnostics,
      variablePointers: { fields: "/variables/fields" },
      variables: { fields: [{ id: "name" }] }
    },
    (_child, path) => {
      paths.push(path);
      return [];
    }
  );
  expect(paths).toEqual(["/variables/fields/0"]);
});

it("rejects invalid direct and resolved props, children, and events", () => {
  const cases = [
    { input: { props: [] }, variables: {} },
    { input: { props: { $var: "label" } }, variables: { label: "Save" } },
    { input: { children: { $var: "label" } }, variables: { label: "Save" } },
    { input: { events: [] }, variables: {} }
  ];
  cases.forEach(({ input, variables }) => {
    const diagnostics: Parameters<typeof resolveLayoutNodeContent>[2]["diagnostics"] = [];
    expect(
      resolveLayoutNodeContent(
        input,
        "/node",
        { diagnostics, variablePointers: {}, variables },
        () => []
      )
    ).toBeUndefined();
    expect(diagnostics).not.toHaveLength(0);
  });
});
