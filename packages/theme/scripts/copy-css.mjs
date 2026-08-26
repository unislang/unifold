import { cp, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

if (isMain()) await copyThemeCss(resolve(packageRoot, "src"), resolve(packageRoot, "dist"));

export async function copyThemeCss(sourceRoot, outputRoot) {
  await mkdir(outputRoot, { recursive: true });
  await Promise.all(
    ["tailwind.css", "tokens.css"].map((name) =>
      cp(resolve(sourceRoot, name), resolve(outputRoot, name))
    )
  );
}

function isMain() {
  return (
    process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])
  );
}
