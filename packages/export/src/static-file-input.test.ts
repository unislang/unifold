import { UiNodeKind } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { renderStaticFileInput } from "./static-file-input.js";

it("renders a native no-JavaScript file picker without serializing selected metadata", () => {
  const html = renderStaticFileInput({
    node: {
      childIds: [],
      componentType: "FileInput",
      eventBindings: {},
      id: "attachments",
      kind: UiNodeKind.Control,
      properties: {
        accept: ".pdf,image/*",
        errorMessage: "Choose <one>",
        label: "Supporting & files",
        multiple: true,
        name: "attachments",
        required: true,
        value: [{ id: "00000000-0000-4000-8000-000000000001", size: 2, type: "application/pdf" }]
      },
      scopePath: ["attachments"]
    }
  });
  expect(html).toContain('<input data-unifold-static-control="attachments" type="file"');
  expect(html).toContain('accept=".pdf,image/*"');
  expect(html).toContain(" multiple required>");
  expect(html).toContain("Supporting &amp; files");
  expect(html).toContain("Choose &lt;one&gt;");
  expect(html).not.toContain("private.pdf");
});

it("uses defensive empty labels and omits false booleans", () => {
  const html = renderStaticFileInput({
    node: {
      childIds: [],
      componentType: "FileInput",
      eventBindings: {},
      id: "file",
      kind: UiNodeKind.Control,
      properties: { disabled: false, label: 1, multiple: false, required: false },
      scopePath: ["file"]
    }
  });
  expect(html).toBe(
    '<label><span></span><input data-unifold-static-control="file" type="file" accept="" name=""></label>'
  );
});
