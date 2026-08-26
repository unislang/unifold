import { defineConfig } from "vite";

export default defineConfig({
  build: {
    terserOptions: {
      compress: { passes: 3 },
      module: true,
      toplevel: true
    }
  }
});
