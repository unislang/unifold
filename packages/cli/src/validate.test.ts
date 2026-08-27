import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, expect, it } from "vitest";

import { UnifoldCliDiagnosticCode, UnifoldCliStatus } from "./enums.js";
import { validateUnifoldDocument } from "./validate.js";

let root = "";

beforeEach(async () => {
  root = join(tmpdir(), `unifold-cli-validate-${crypto.randomUUID()}`);
  await mkdir(root);
});

afterEach(async () => {
  await rm(root, { force: true, recursive: true });
});

it("validates through the public hierarchical preparation boundary", async () => {
  await writeFile(join(root, "ui.json"), JSON.stringify(validLayoutDocument()));
  await expect(validateUnifoldDocument("ui.json", root)).resolves.toMatchObject({
    diagnostics: [],
    status: UnifoldCliStatus.Succeeded
  });
});

it("returns preparation diagnostics for invalid documents", async () => {
  await writeFile(join(root, "ui.json"), JSON.stringify({ id: "missing-contract" }));
  const result = await validateUnifoldDocument("ui.json", root);
  expect(result.status).toBe(UnifoldCliStatus.Failed);
  expect(result.diagnostics).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: UnifoldCliDiagnosticCode.DocumentInvalid })
    ])
  );
});

it("rejects malformed, missing, non-file, and oversized inputs", async () => {
  await writeFile(join(root, "bad.json"), "{");
  await mkdir(join(root, "folder"));
  await writeFile(join(root, "large.json"), " ".repeat(2 * 1024 * 1024 + 1));
  await expect(validateUnifoldDocument("bad.json", root)).resolves.toMatchObject({
    diagnostics: [{ code: UnifoldCliDiagnosticCode.InputInvalid }]
  });
  for (const path of ["missing.json", "folder", "large.json"]) {
    await expect(validateUnifoldDocument(path, root)).resolves.toMatchObject({
      diagnostics: [{ code: UnifoldCliDiagnosticCode.InputReadFailed }]
    });
  }
});

function validLayoutDocument() {
  return {
    $schema: "https://schemas.unifold.org/layout-document/1.0/schema.json",
    catalog: { name: "unifold-core", version: "1.0.0" },
    id: "starter",
    layoutType: "starter-page",
    layoutVersion: "1.0.0",
    layouts: [
      {
        layoutType: "starter-page",
        template: { id: "root", props: { label: "Starter" }, type: "Stack" },
        variables: {},
        version: "1.0.0"
      }
    ],
    revision: "1",
    schemaVersion: "1.0.0",
    variables: {}
  };
}
