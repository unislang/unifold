import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, beforeEach, expect, it } from "vitest";

import { UnifoldCliDiagnosticCode, UnifoldCliStatus } from "./enums.js";
import { generateUnifoldStarter } from "./starter.js";
import { validateUnifoldDocument } from "./validate.js";

let root = "";

beforeEach(async () => {
  root = join(tmpdir(), `unifold-cli-starter-${crypto.randomUUID()}`);
  await mkdir(root);
});

afterEach(async () => {
  await rm(root, { force: true, recursive: true });
});

it("copies the packaged template and writes a version-aligned manifest", async () => {
  const result = await generateUnifoldStarter("my-app", {
    cwd: root,
    packageVersion: "1.2.3"
  });
  expect(result.status).toBe(UnifoldCliStatus.Succeeded);
  const manifest = JSON.parse(await readFile(join(root, "my-app", "package.json"), "utf8"));
  expect(manifest).toMatchObject({
    dependencies: { "@unislang/unifold": "1.2.3" },
    name: "my-app"
  });
  await expect(stat(join(root, "my-app", "src", "ui.json"))).resolves.toBeDefined();
  await expect(validateUnifoldDocument("src/ui.json", join(root, "my-app"))).resolves.toMatchObject(
    {
      status: UnifoldCliStatus.Succeeded
    }
  );
});

it("never overwrites an existing target", async () => {
  await mkdir(join(root, "my-app"));
  await writeFile(join(root, "my-app", "keep.txt"), "preserve");
  const result = await generateUnifoldStarter("my-app", {
    cwd: root,
    packageVersion: "1.2.3"
  });
  expect(result).toMatchObject({
    diagnostics: [{ code: UnifoldCliDiagnosticCode.StarterTargetExists }]
  });
  await expect(readFile(join(root, "my-app", "keep.txt"), "utf8")).resolves.toBe("preserve");
});

it("cleans staging files when template copying fails", async () => {
  const missing = pathToFileURL(join(root, "missing-template"));
  const result = await generateUnifoldStarter("my-app", {
    cwd: root,
    packageVersion: "1.2.3",
    templateUrl: missing
  });
  expect(result).toMatchObject({
    diagnostics: [{ code: UnifoldCliDiagnosticCode.StarterGenerationFailed }]
  });
  await expect(stat(join(root, "my-app"))).rejects.toThrow();
});
