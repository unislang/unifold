// @vitest-environment happy-dom
import { LayoutSpace, SurfaceTone } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldCard, UnifoldCard } from "./content-media-entry.js";

it("renders a labeled native article with authored child order", async () => {
  defineUnifoldCard();
  const card = document.createElement("unifold-card") as UnifoldCard;
  card.label = "Account summary";
  card.padding = LayoutSpace.Large;
  card.surface = SurfaceTone.Subtle;
  card.append(document.createElement("h2"), document.createElement("p"));
  document.body.append(card);
  await card.updateComplete;
  const article = card.shadowRoot?.querySelector("article");
  expect(article?.getAttribute("aria-label")).toBe("Account summary");
  expect(card.getAttribute("padding")).toBe(LayoutSpace.Large);
  expect(card.getAttribute("surface")).toBe(SurfaceTone.Subtle);
  expect([...card.children].map(({ tagName }) => tagName)).toEqual(["H2", "P"]);
});
