import {
  JsonUiProfileName,
  JsonUiProfileVersion,
  JsonUiUpstreamRevision,
  UiContractSchemaUri,
  UiSchemaVersion,
  type JsonObject
} from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { DiagnosticCode } from "./enums.js";
import { validateUiDocument } from "./validation.js";

it("accepts catalog-declared choice properties", () => {
  const result = validateUiDocument(choiceDocument());
  expect(result.diagnostics).toEqual([]);
});

it("rejects invalid option, array, and undeclared properties", () => {
  const document = choiceDocument();
  const view = document["view"] as JsonObject;
  const children = view["$children"] as readonly JsonObject[];
  const invalid = {
    ...document,
    view: {
      ...view,
      $children: [
        { ...children[0], options: "invalid", unknown: true },
        { ...children[1], value: "not-an-array" }
      ]
    }
  };
  const codes = validateUiDocument(invalid).diagnostics.map(({ code }) => code);
  expect(codes).toEqual(
    expect.arrayContaining([
      DiagnosticCode.InvalidProperty,
      DiagnosticCode.InvalidProperty,
      DiagnosticCode.UnsupportedProperty
    ])
  );
});

it("rejects duplicate options and selections absent from the catalog choices", () => {
  expect(validateUiDocument(invalidChoiceDocument()).diagnostics).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: DiagnosticCode.DuplicateOptionValue,
        path: "/view/$children/0/options/1/value"
      }),
      expect.objectContaining({
        code: DiagnosticCode.UnknownOptionSelection,
        path: "/view/$children/1/value/0"
      })
    ])
  );
});

it("rejects non-positive TextArea rows", () => {
  const document = choiceDocument();
  const invalid = { ...document, view: { $comp: "TextArea", id: "bio", rows: 0 } };
  expect(validateUiDocument(invalid).diagnostics).toContainEqual(
    expect.objectContaining({ code: DiagnosticCode.InvalidProperty, path: "/view/rows" })
  );
});

it("accepts a bounded virtual-list contract and rejects invalid geometry", () => {
  const document = choiceDocument();
  const valid = {
    ...document,
    view: {
      $comp: "VirtualList",
      id: "records",
      itemHeight: 32,
      options: [{ label: "Record", value: "record-1" }],
      overscan: 4,
      value: "record-1",
      viewportHeight: 480
    }
  };
  expect(validateUiDocument(valid).diagnostics).toEqual([]);
  expect(
    validateUiDocument({ ...valid, view: { ...valid.view, itemHeight: 0 } }).diagnostics
  ).toContainEqual(
    expect.objectContaining({ code: DiagnosticCode.InvalidProperty, path: "/view/itemHeight" })
  );
});

it("accepts bounded table data and rejects malformed cells", () => {
  const document = choiceDocument();
  const valid = {
    ...document,
    view: {
      $comp: "Table",
      caption: "People",
      columns: [{ key: "name", label: "Name" }],
      id: "people",
      rows: [{ cells: { name: "Ada" }, id: "ada" }]
    }
  };
  expect(validateUiDocument(valid).diagnostics).toEqual([]);
  expect(
    validateUiDocument({
      ...valid,
      view: { ...valid.view, rows: [{ cells: { name: [] }, id: "ada" }] }
    }).diagnostics
  ).toContainEqual(
    expect.objectContaining({ code: DiagnosticCode.InvalidProperty, path: "/view/rows" })
  );
});

it("validates exact AuditLog entries and reports duplicate IDs precisely", () => {
  const event = auditEntry();
  const valid = {
    ...choiceDocument(),
    view: { $comp: "AuditLog", entries: [event], id: "audit", label: "History" }
  };
  expect(validateUiDocument(valid).diagnostics).toEqual([]);
  expect(
    validateUiDocument({ ...valid, view: { ...valid.view, entries: [event, event] } }).diagnostics
  ).toContainEqual(
    expect.objectContaining({
      code: DiagnosticCode.DuplicateAuditLogEntryId,
      path: "/view/entries/1/id"
    })
  );
  expect(
    validateUiDocument({
      ...valid,
      view: { ...valid.view, entries: [{ ...event, timestamp: "not-a-date" }] }
    }).diagnostics
  ).toContainEqual(
    expect.objectContaining({ code: DiagnosticCode.InvalidProperty, path: "/view/entries" })
  );
});

function auditEntry() {
  return {
    action: "updated",
    actor: "Ada",
    id: "event-1",
    summary: "Changed account status",
    timestamp: "2026-08-25T12:34:56Z"
  };
}

it("requires every structural table property", () => {
  const document = choiceDocument();
  const invalid = { ...document, view: { $comp: "Table", id: "people" } };
  expect(validateUiDocument(invalid).diagnostics).toEqual(
    expect.arrayContaining(
      ["caption", "columns", "rows"].map((name) =>
        expect.objectContaining({
          code: DiagnosticCode.MissingRequiredProperty,
          path: `/view/${name}`
        })
      )
    )
  );
});

it("rejects unsafe Link URLs before rendering", () => {
  const document = choiceDocument();
  const invalid = {
    ...document,
    view: { $comp: "Link", href: "javascript:alert(1)", id: "unsafe", label: "Unsafe" }
  };
  expect(validateUiDocument(invalid).diagnostics).toContainEqual(
    expect.objectContaining({ code: DiagnosticCode.InvalidProperty, path: "/view/href" })
  );
});

it("accepts one hundred unique menu actions and rejects empty, oversized, or duplicate lists", () => {
  const items = menuItems();
  expect(menuDiagnostics(items)).toEqual([]);
  expect(menuDiagnostics([])).toContainEqual(
    expect.objectContaining({ code: DiagnosticCode.InvalidProperty, path: "/view/items" })
  );
  expect(menuDiagnostics([...items, { label: "Too many", value: "too-many" }])).toContainEqual(
    expect.objectContaining({ code: DiagnosticCode.InvalidProperty, path: "/view/items" })
  );
  expect(menuDiagnostics([...items.slice(0, 1), ...items.slice(0, 1)])).toContainEqual(
    expect.objectContaining({
      code: DiagnosticCode.DuplicateOptionValue,
      path: "/view/items/1/value"
    })
  );
});

function menuItems(): JsonObject[] {
  return Array.from({ length: 100 }, (_, index) => ({
    label: `Action ${index}`,
    value: `action-${index}`
  }));
}

function menuDiagnostics(items: readonly JsonObject[]) {
  return validateUiDocument({
    ...choiceDocument(),
    view: { $comp: "MenuButton", id: "actions", items, label: "Actions" }
  }).diagnostics;
}

it("validates required Tooltip text, placement, and leaf shape at exact pointers", () => {
  const invalid = validateUiDocument({
    ...choiceDocument(),
    view: {
      $children: [{ $comp: "Text", content: "Unexpected", id: "child" }],
      $comp: "Tooltip",
      id: "help",
      placement: "center"
    }
  });

  expect(invalid.diagnostics).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: DiagnosticCode.MissingRequiredProperty,
        path: "/view/label"
      }),
      expect.objectContaining({
        code: DiagnosticCode.MissingRequiredProperty,
        path: "/view/content"
      }),
      expect.objectContaining({ code: DiagnosticCode.InvalidProperty, path: "/view/placement" }),
      expect.objectContaining({
        code: DiagnosticCode.InvalidChildCount,
        path: "/view/$children"
      })
    ])
  );
});

it("rejects missing and unknown Icon names", () => {
  const document = choiceDocument();
  const missing = { ...document, view: { $comp: "Icon", id: "missing" } };
  const unknown = { ...document, view: { $comp: "Icon", id: "unknown", name: "custom" } };
  expect(validateUiDocument(missing).diagnostics).toContainEqual(
    expect.objectContaining({ code: DiagnosticCode.MissingRequiredProperty, path: "/view/name" })
  );
  expect(validateUiDocument(unknown).diagnostics).toContainEqual(
    expect.objectContaining({ code: DiagnosticCode.InvalidProperty, path: "/view/name" })
  );
});

function invalidChoiceDocument(): JsonObject {
  const document = choiceDocument();
  const view = document["view"] as JsonObject;
  const children = view["$children"] as readonly JsonObject[];
  return {
    ...document,
    view: {
      ...view,
      $children: [
        {
          ...children[0],
          options: [
            { label: "Canada", value: "ca" },
            { label: "Canada duplicate", value: "ca" }
          ]
        },
        { ...children[1], value: ["missing"] }
      ]
    }
  };
}

function choiceDocument(): JsonObject {
  return {
    $schema: UiContractSchemaUri.Version1,
    catalog: { name: "unifold-core", version: "1.0.0" },
    id: "choice-test",
    jsonUiProfile: {
      name: JsonUiProfileName.Unifold,
      upstream: JsonUiUpstreamRevision.Version01025,
      version: JsonUiProfileVersion.Version1
    },
    revision: "1",
    schemaVersion: UiSchemaVersion.Version1,
    view: { $children: choiceNodes(), $comp: "Form", id: "form", label: "Choices" }
  };
}

function choiceNodes(): readonly JsonObject[] {
  return [
    {
      $comp: "Select",
      id: "country",
      label: "Country",
      options: [{ label: "Canada", value: "ca" }],
      value: "ca"
    },
    {
      $comp: "MultiSelect",
      id: "skills",
      label: "Skills",
      options: [{ label: "TypeScript", value: "ts" }],
      value: ["ts"]
    }
  ];
}
