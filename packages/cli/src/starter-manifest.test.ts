import { expect, it } from "vitest";

import { createStarterManifest } from "./starter-manifest.js";

it("creates a deterministic strict starter manifest", () => {
  const first = createStarterManifest({ packageName: "my-app", unifoldVersion: "1.2.3" });
  const second = createStarterManifest({ packageName: "my-app", unifoldVersion: "1.2.3" });
  expect(first).toBe(second);
  expect(JSON.parse(first)).toMatchObject({
    dependencies: {
      "@unislang/unifold": "1.2.3",
      "@unislang/unifold-events": "1.2.3",
      "@unislang/unifold-theme": "1.2.3"
    },
    name: "my-app",
    scripts: { build: "tsc --noEmit && vite build", "test:e2e": "playwright test" },
    devDependencies: { "@types/node": "24.3.0" }
  });
});
