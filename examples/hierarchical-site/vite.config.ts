import { defineConfig } from "vite";

export default defineConfig({
  build: {
    manifest: true,
    terserOptions: { compress: { passes: 3 }, module: true, toplevel: true }
  }
});
