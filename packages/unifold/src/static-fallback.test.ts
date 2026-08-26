// @vitest-environment happy-dom
import { expect, it } from "vitest";

import { captureStaticDomFallback } from "./static-fallback.js";

it("restores original node identity, edited values, and focus", () => {
  const container = document.createElement("main");
  container.innerHTML = '<label>Name<input value="Ada"></label>';
  document.body.append(container);
  const input = requireInput(container);
  input.value = "Grace";
  input.focus();
  const fallback = captureStaticDomFallback(container);

  container.replaceChildren(document.createElement("unifold-form"));
  fallback.restore();

  expect(requireInput(container)).toBe(input);
  expect(input.value).toBe("Grace");
  expect(document.activeElement).toBe(input);
  container.remove();
});

function requireInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector("input");
  if (!(input instanceof HTMLInputElement)) throw new Error("Fixture input is missing.");
  return input;
}
