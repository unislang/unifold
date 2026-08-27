import { readFile } from "node:fs/promises";

interface PackageManifest {
  readonly version?: unknown;
}

export async function readCliPackageVersion(
  manifestUrl = new URL("../package.json", import.meta.url)
): Promise<string> {
  const manifest = JSON.parse(await readFile(manifestUrl, "utf8")) as PackageManifest;
  if (!isVersion(manifest.version)) {
    throw new Error("The CLI package version is missing.");
  }
  return manifest.version;
}

function isVersion(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
