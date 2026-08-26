import { describe, expect, it } from "vitest";

import { ThemeDensity, ThemeToken } from "./index.js";

describe("theme contracts", () => {
  it("exposes stable CSS custom-property names", () => {
    expect(ThemeToken.Primary).toBe("--unifold-color-primary");
    expect(ThemeToken.Focus).toBe("--unifold-color-focus");
    expect(ThemeToken.SurfaceSubtle).toBe("--unifold-color-surface-subtle");
    expect(ThemeToken.Success).toBe("--unifold-color-success");
    expect(ThemeToken.Warning).toBe("--unifold-color-warning");
  });

  it("uses an enum for density choices", () => {
    expect(Object.values(ThemeDensity)).toEqual(["comfortable", "compact"]);
  });
});
