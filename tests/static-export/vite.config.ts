import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const fixtureRoot = fileURLToPath(new URL(".", import.meta.url));
const upgradeEntry = fileURLToPath(new URL("./src/upgrade.ts", import.meta.url));
const staticHtml = fileURLToPath(new URL("./index.html", import.meta.url));
const staticManifest = fileURLToPath(new URL("./unifold-manifest.json", import.meta.url));

function exactStaticExportPlugin(): Plugin {
  return {
    generateBundle() {
      this.emitFile({ fileName: "index.html", source: readFileSync(staticHtml), type: "asset" });
      this.emitFile({
        fileName: "unifold-manifest.json",
        source: readFileSync(staticManifest),
        type: "asset"
      });
    },
    name: "exact-static-export"
  };
}

export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: "dist",
    rollupOptions: {
      input: upgradeEntry,
      output: { entryFileNames: "upgrade.js", format: "es" }
    }
  },
  plugins: [exactStaticExportPlugin()],
  root: fixtureRoot
});
