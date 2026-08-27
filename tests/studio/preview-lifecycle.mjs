import { fileURLToPath } from "node:url";
import { preview } from "vite";

const root = fileURLToPath(new URL("../../examples/studio", import.meta.url));

export default async function startPreview() {
  const port = Number(process.env["PLAYWRIGHT_STUDIO_PORT"] ?? "4184");
  const server = await preview({
    logLevel: "silent",
    preview: { host: "127.0.0.1", port, strictPort: true },
    root
  });
  return () => server.close();
}
