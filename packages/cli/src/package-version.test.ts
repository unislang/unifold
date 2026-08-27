import { rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, expect, it } from "vitest";

import { readCliPackageVersion } from "./package-version.js";

const paths: string[] = [];

afterEach(async () => {
  await Promise.all(paths.splice(0).map((path) => rm(path, { force: true })));
});

it("reads and validates the owning package version", async () => {
  const valid = await manifest({ version: "1.2.3" });
  const invalid = await manifest({ version: 1 });
  await expect(readCliPackageVersion(pathToFileURL(valid))).resolves.toBe("1.2.3");
  await expect(readCliPackageVersion(pathToFileURL(invalid))).rejects.toThrow(
    /version is missing/u
  );
});

async function manifest(value: unknown): Promise<string> {
  const path = join(tmpdir(), `unifold-cli-version-${crypto.randomUUID()}.json`);
  paths.push(path);
  await writeFile(path, JSON.stringify(value));
  return path;
}
