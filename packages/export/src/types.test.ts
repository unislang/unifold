import { describe, expect, it } from "vitest";
import * as subject from "./types.js";

describe("types module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
    expect(subject.UnifoldExportFormat.StaticHtml).toBe("static-html");
    expect(subject.UnifoldExportMediaType.Html).toBe("text/html");
    expect(subject.UnifoldExportFileName.StaticHtml).toBe("index.html");
  });
});
