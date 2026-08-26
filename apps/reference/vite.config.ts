import { defineConfig } from "vite";

export default defineConfig({
  build: {
    manifest: true,
    modulePreload: false,
    terserOptions: {
      compress: { passes: 4 },
      module: true,
      toplevel: true
    }
  }
});
