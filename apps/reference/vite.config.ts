import { defineConfig } from "vite";

export default defineConfig({
  build: {
    terserOptions: {
      compress: { passes: 2 }
    }
  }
});
