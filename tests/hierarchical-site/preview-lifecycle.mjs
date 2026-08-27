import { fileURLToPath } from "node:url";
import { preview } from "vite";

const root = fileURLToPath(new URL("../../examples/hierarchical-site", import.meta.url));

export default async function startPreview() {
  const server = await preview({
    configFile: false,
    logLevel: "silent",
    preview: { host: "127.0.0.1", port: 4_183, strictPort: true },
    root
  });
  return () => server.close();
}
