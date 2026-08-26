import { fileURLToPath } from "node:url";
import { preview } from "vite";

const referenceRoot = fileURLToPath(new URL("../../../apps/reference", import.meta.url));

export function previewConfiguration(root, port) {
  return {
    configFile: false,
    logLevel: "silent",
    preview: { host: "127.0.0.1", port, strictPort: true },
    root
  };
}

export default async function startPreview() {
  const port = Number(process.env["PLAYWRIGHT_REFERENCE_PORT"] ?? "4173");
  const server = await preview(previewConfiguration(referenceRoot, port));
  return () => server.close();
}
