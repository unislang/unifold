import { describe, expect, it } from "vitest";
import * as subject from "./registry.js";

describe("registry module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });

  it("registers Schema.org 30 BreadcrumbList and positional ListItem terms", () => {
    expect(subject.schemaOrgVersion30.BreadcrumbList.properties).toEqual(
      new Set([
        "description",
        "identifier",
        "image",
        "name",
        "sameAs",
        "url",
        "itemListElement",
        "itemListOrder",
        "numberOfItems"
      ])
    );
    expect(subject.schemaOrgVersion30.ListItem.properties).toEqual(
      new Set(["description", "identifier", "image", "name", "sameAs", "url", "item", "position"])
    );
  });
});
