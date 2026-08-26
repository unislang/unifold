import { IconName } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { getCoreIcon } from "./icon-registry.js";

it("resolves every allowlisted name and falls back safely", () => {
  Object.values(IconName).forEach((name) => {
    const icon = getCoreIcon(name);
    expect(icon.node.length).toBeGreaterThan(0);
    expect(icon.name).toBeTruthy();
  });
  expect(getCoreIcon("unknown").name).toBe("info");
});
