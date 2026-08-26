import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { createStaticHtmlExport, UnifoldExportStatus } from "@unislang/unifold-export";

const fixtureUrl = new URL("../ui.json", import.meta.url);
const defaultOutputUrl = new URL("../index.html", import.meta.url);
const defaultManifestUrl = new URL("../unifold-manifest.json", import.meta.url);

export async function generateStaticHtml(outputUrl, manifestUrl) {
  const authored = JSON.parse(await readFile(fixtureUrl, "utf8"));
  const result = await createStaticHtmlExport(authored);
  if (result.status !== UnifoldExportStatus.Exported) {
    throw new Error(`Static export failed: ${JSON.stringify(result.diagnostics)}`);
  }
  await writeFile(outputUrl, result.output.content, "utf8");
  await writeFile(manifestUrl, result.output.manifestContent, "utf8");
  return result.output;
}

function isMainModule() {
  return process.argv[1] === fileURLToPath(import.meta.url);
}

if (isMainModule()) await generateStaticHtml(defaultOutputUrl, defaultManifestUrl);
