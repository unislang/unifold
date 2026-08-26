import { fileURLToPath } from "node:url";
import { preview } from "vite";

const fixtureRoot = fileURLToPath(new URL("..", import.meta.url));

export function previewConfiguration(root, port) {
  return {
    logLevel: "silent",
    preview: { host: "127.0.0.1", port, strictPort: true },
    root
  };
}

export default async function startPreview() {
  const port = Number(process.env["PLAYWRIGHT_STATIC_EXPORT_PORT"] ?? "4175");
  const server = await preview(previewConfiguration(fixtureRoot, port));
  return () => server.close();
}
