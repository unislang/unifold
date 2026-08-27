import { expect, it } from "vitest";

import { CompositionDiagnosticCode, LayoutExpansionStatus } from "./enums.js";
import { expandLayoutDocument } from "./layout-authoring.js";
import { createTrustedLayoutDefinitionRegistry } from "./layout-registry.js";
import {
  configureRepeatedActions,
  expectedLoweredView,
  layoutDocument
} from "./layout-authoring.test-data.js";

it("lowers layout variables, nested nodes, and named events deterministically", () => {
  const result = expandLayoutDocument(layoutDocument());
  expect(result.status).toBe(LayoutExpansionStatus.Valid);
  const view = requireView(result);
  expect(view).toEqual(expectedLoweredView());
  const children = requireChildren(view);
  expect(children[0]?.["events"]).toEqual({ input: "FORM_FIELD_CHANGE" });
  expect(children[1]?.["events"]).toEqual({ activated: "FORM_SUBMIT" });
  expect(result.sourcePointersByNodeId).toEqual({
    name: "/variables/fields/0",
    root: "/layouts/0/template",
    save: "/variables/fields/1"
  });
});

it("applies defaults and preserves whole-value reference types", () => {
  const source = layoutDocument();
  Reflect.deleteProperty(source.variables, "heading");
  source.layouts[0].variables["heading"] = {
    default: "Default heading",
    required: false,
    type: "string"
  };
  const result = expandLayoutDocument(source);
  expect((result.document?.["view"] as Record<string, unknown>)["label"]).toBe("Default heading");
});

it("preserves an explicit control topology on the Scratch-style authoring document", () => {
  const source = layoutDocument();
  source["controls"] = {
    contractVersion: "1.0.0",
    nodes: [
      { id: "root", kind: "form" },
      { id: "name", key: "name", kind: "control", parentId: "root" }
    ]
  };
  expect(expandLayoutDocument(source).document?.["controls"]).toEqual(source["controls"]);
});

it("rejects missing variables, unknown references, duplicate ids, and unsafe events", () => {
  const missing = layoutDocument();
  Reflect.deleteProperty(missing.variables, "heading");
  expect(codes(expandLayoutDocument(missing))).toContain(
    CompositionDiagnosticCode.InvalidLayoutVariable
  );

  const invalid = layoutDocument();
  invalid.layouts[0].template["props"] = { label: { $var: "missing" } };
  invalid.variables.fields.push({ id: "name", props: {}, type: "Button" });
  expect(codes(expandLayoutDocument(invalid))).toEqual(
    expect.arrayContaining([
      CompositionDiagnosticCode.UnknownLayoutVariable,
      CompositionDiagnosticCode.InvalidLayoutNode
    ])
  );

  const unsafeEvent = layoutDocument();
  const firstField = unsafeEvent.variables.fields[0];
  if (firstField === undefined) throw new Error("Missing field fixture.");
  firstField["events"] = { onClick: "constructor" };
  expect(codes(expandLayoutDocument(unsafeEvent))).toContain(
    CompositionDiagnosticCode.InvalidLayoutEvent
  );
});

it("leaves ordinary UiDocuments for the existing compiler path", () => {
  expect(expandLayoutDocument({ view: {} })).toEqual({
    diagnostics: [],
    status: LayoutExpansionStatus.NotLayout
  });
});

it("executes the published layout schema before lowering", () => {
  const source = Object.assign(layoutDocument(), { executable: "alert(1)" });
  expect(codes(expandLayoutDocument(source))).toContain(CompositionDiagnosticCode.InvalidLayout);
});

it("rejects non-JSON authoring values before recursively lowering them", () => {
  const cyclic = layoutDocument();
  cyclic.variables["cycle"] = cyclic.variables;
  const result = expandLayoutDocument(cyclic);
  expect(result.status).toBe(LayoutExpansionStatus.Invalid);
  expect(result.diagnostics[0]).toMatchObject({
    code: CompositionDiagnosticCode.InvalidLayout,
    path: "/variables/cycle"
  });
});

it("expands keyed repetitions and boolean conditions with stable identities", () => {
  const source = layoutDocument();
  configureRepeatedActions(source);

  const result = expandLayoutDocument(source);
  expect(result).toMatchObject({ diagnostics: [], status: LayoutExpansionStatus.Valid });
  const view = result.document?.["view"] as { $children: Record<string, unknown>[] };
  expect(view.$children.map(({ id }) => id)).toEqual(["action::edit", "action::archive"]);
  expect(view.$children.map(({ label }) => label)).toEqual(["Edit", "Archive"]);
  expect(result.sourcePointersByNodeId).toMatchObject({
    "action::archive": "/layouts/0/template/children/0",
    "action::edit": "/layouts/0/template/children/0"
  });

  source.variables["showActions"] = false;
  expect(
    (expandLayoutDocument(source).document?.["view"] as Record<string, unknown>)["$children"]
  ).toBeUndefined();
});

it("selects an exact host-trusted external definition without runtime lookup", () => {
  const source = layoutDocument();
  const registry = createTrustedLayoutDefinitionRegistry(source.layouts);
  Reflect.deleteProperty(source, "layouts");
  const result = expandLayoutDocument(source, { registry });
  expect(result.status).toBe(LayoutExpansionStatus.Valid);
  expect(requireView(result)).toEqual(expectedLoweredView());
  expect(result.sourcePointersByNodeId).toEqual({
    name: "/variables/fields/0",
    root: "/$layoutRegistry/definitions/0/template",
    save: "/variables/fields/1"
  });
});

it("rejects local/registry collisions, version misses, and unsafe registry data", () => {
  const collision = layoutDocument();
  const registry = createTrustedLayoutDefinitionRegistry(collision.layouts);
  expect(codes(expandLayoutDocument(collision, { registry }))).toContain(
    CompositionDiagnosticCode.UnknownLayout
  );

  const missing = layoutDocument();
  missing.layoutVersion = "2.0.0";
  expect(codes(expandLayoutDocument(missing, { registry }))).toContain(
    CompositionDiagnosticCode.UnknownLayout
  );

  const unsafe = createTrustedLayoutDefinitionRegistry([new Date() as never]);
  const external = layoutDocument();
  Reflect.deleteProperty(external, "layouts");
  const result = expandLayoutDocument(external, { registry: unsafe });
  expect(result.diagnostics[0]?.path).toBe("/$layoutRegistry/definitions/0");

  const forged = expandLayoutDocument(external, {
    registry: {} as ReturnType<typeof createTrustedLayoutDefinitionRegistry>
  });
  expect(forged.diagnostics[0]).toMatchObject({ path: "/$layoutRegistry" });
});

function codes(result: ReturnType<typeof expandLayoutDocument>) {
  expect(result.status).toBe(LayoutExpansionStatus.Invalid);
  return result.diagnostics.map(({ code }) => code);
}

function requireView(result: ReturnType<typeof expandLayoutDocument>): Record<string, unknown> {
  const view = result.document?.["view"];
  if (Object.prototype.toString.call(view) !== "[object Object]")
    throw new Error("Expected expanded view.");
  return view as Record<string, unknown>;
}

function requireChildren(view: Record<string, unknown>): Record<string, unknown>[] {
  const children = view["$children"];
  if (!Array.isArray(children)) throw new Error("Expected expanded children.");
  return children as Record<string, unknown>[];
}
