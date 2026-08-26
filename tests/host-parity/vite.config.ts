import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

const page = (name: string): string => fileURLToPath(new URL(`./${name}.html`, import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        plain: page("plain"),
        react: page("react"),
        svelte: page("svelte"),
        vue: page("vue")
      }
    }
  },
  plugins: [svelte()]
});
