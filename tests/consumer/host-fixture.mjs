import { cp, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const ignoredDirectories = new Set(["dist", "node_modules", "test-results"]);

export async function copyConsumerFixture(source, target) {
  await cp(source, target, {
    filter: (path) => !ignoredDirectories.has(relative(source, path).split(/[\\/]/u)[0]),
    recursive: true
  });
}

export async function writeHostManifest(consumerRoot, tarballs) {
  const path = join(consumerRoot, "package.json");
  const manifest = JSON.parse(await readFile(path, "utf8"));
  const specifications = Object.fromEntries(
    [...tarballs].map(([name, tarball]) => [name, tarballSpecifier(consumerRoot, tarball)])
  );
  manifest.dependencies = { ...manifest.dependencies, ...specifications };
  manifest.pnpm = { overrides: specifications };
  await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`);
}

export function tarballSpecifier(consumerRoot, tarballPath) {
  return `file:${relative(consumerRoot, tarballPath).replaceAll("\\", "/")}`;
}
