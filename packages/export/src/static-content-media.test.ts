import { expect, it } from "vitest";

import { documentWithView, prepareTestDocument } from "./static-html.test-data.js";
import { renderStaticTree } from "./static-renderer.js";

it("renders native Card and safe dimensioned Image fallback markup", () => {
  const html = renderStaticTree(prepareTestDocument(documentWithView(contentMediaView())).document);
  expect(html).toContain('<article aria-label="Profile summary">');
  expect(html).toContain(
    '<img src="/profile-placeholder.svg" alt="A geometric profile placeholder" width="320" height="240" loading="lazy" decoding="async" data-unifold-image-fit="cover">'
  );
});

function contentMediaView() {
  return {
    $children: [
      {
        $comp: "Image",
        alt: "A geometric profile placeholder",
        height: 240,
        id: "profile-image",
        src: "/profile-placeholder.svg",
        width: 320
      }
    ],
    $comp: "Card",
    id: "profile-card",
    label: "Profile summary"
  };
}
