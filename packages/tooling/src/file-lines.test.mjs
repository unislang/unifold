import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, test } from "node:test";
import { countPhysicalLines, findLineLimitViolations } from "./file-lines.mjs";

const temporaryDirectories = [];

async function createTemporaryDirectory() {
  const directoryPath = await mkdtemp(join(tmpdir(), "unifold-lines-"));
  temporaryDirectories.push(directoryPath);
  return directoryPath;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directoryPath) => rm(directoryPath, { recursive: true }))
  );
});

test("counts files with and without a final newline", () => {
  assert.equal(countPhysicalLines("first\nsecond\n"), 2);
  assert.equal(countPhysicalLines("first\nsecond"), 2);
  assert.equal(countPhysicalLines(""), 0);
});

test("reports text files above the configured maximum", async () => {
  const directoryPath = await createTemporaryDirectory();
  const filePath = join(directoryPath, "oversized.json");
  await writeFile(filePath, "one\ntwo\nthree\n", "utf8");
  const violations = await findLineLimitViolations([directoryPath], 2);
  assert.deepEqual(violations, [{ filePath, lineCount: 3, maximumLines: 2 }]);
});

test("does not report Markdown, binary, or generated lockfiles", async () => {
  const directoryPath = await createTemporaryDirectory();
  await writeFile(join(directoryPath, "notes.md"), "one\ntwo\nthree\n", "utf8");
  await writeFile(join(directoryPath, "asset.bin"), Buffer.from([0, 1, 2, 3]));
  await writeFile(join(directoryPath, "pnpm-lock.yaml"), "one\ntwo\nthree\n", "utf8");
  await mkdir(join(directoryPath, "test-results-filtered"));
  await writeFile(join(directoryPath, "test-results-filtered", "trace.json"), "1\n2\n3\n", "utf8");
  await mkdir(join(directoryPath, "benchmark-results"));
  await writeFile(join(directoryPath, "benchmark-results", "result.json"), "1\n2\n3\n", "utf8");
  const violations = await findLineLimitViolations([directoryPath], 1);
  assert.deepEqual(violations, []);
});
