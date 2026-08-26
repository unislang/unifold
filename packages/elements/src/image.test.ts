// @vitest-environment happy-dom
import { ImageFit, ImageLoading } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldImage, UnifoldImage } from "./content-media-entry.js";

it("renders exact native image accessibility and loading attributes", async () => {
  const image = await mountImage();
  image.alt = "A geometric profile placeholder";
  image.fit = ImageFit.Contain;
  image.height = 240;
  image.loading = ImageLoading.Eager;
  image.src = "/profile-placeholder.svg";
  image.width = 320;
  await image.updateComplete;
  expect(nativeImage(image)).toMatchObject({
    alt: "A geometric profile placeholder",
    height: 240,
    loading: ImageLoading.Eager,
    width: 320
  });
  expect(nativeImage(image).getAttribute("src")).toBe("/profile-placeholder.svg");
});

it("rejects unsafe runtime sources and dimensions outside the compiler", async () => {
  const image = await mountImage();
  image.src = "data:image/svg+xml,unsafe";
  image.height = 0;
  image.width = Number.NaN;
  await image.updateComplete;
  expect(nativeImage(image).hasAttribute("src")).toBe(false);
  expect(nativeImage(image).height).toBe(1);
  expect(nativeImage(image).width).toBe(1);
});

async function mountImage(): Promise<UnifoldImage> {
  defineUnifoldImage();
  const image = document.createElement("unifold-image") as UnifoldImage;
  document.body.append(image);
  await image.updateComplete;
  return image;
}

function nativeImage(element: UnifoldImage): HTMLImageElement {
  const image = element.shadowRoot?.querySelector("img");
  if (!(image instanceof HTMLImageElement)) throw new Error("Native image is missing.");
  return image;
}
