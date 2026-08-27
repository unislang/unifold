import { cp, readdir, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const TEMPLATE_MODULES = Object.freeze([
  { source: "playwright.config.ts", target: "playwright.config.ts" },
  { source: "src/main.unit.ts", target: "src/main.test.ts" },
  { source: "src/main.ts", target: "src/main.ts" },
  { source: "tests/starter.spec.ts", target: "tests/starter.spec.ts" }
]);

export async function materializeStarterTemplate(directory: string): Promise<void> {
  await Promise.all(
    TEMPLATE_MODULES.map(({ source, target }) =>
      rename(join(directory, `${source}.template`), join(directory, target))
    )
  );
}

export async function copyStarterTemplate(source: URL, target: string): Promise<void> {
  const sourcePath = fileURLToPath(source);
  const entries = await readdir(sourcePath);
  await Promise.all(
    entries.map((name) =>
      cp(join(sourcePath, name), join(target, name), {
        errorOnExist: true,
        force: false,
        recursive: true
      })
    )
  );
}
