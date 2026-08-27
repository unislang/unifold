// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";

import { focusMayBeRetried, focusMayBeStarted, focusRenderedElement } from "./focus-target.js";
import type { UnifoldElementHost } from "./types.js";

afterEach(() => document.body.replaceChildren());

describe("rendered focus target", () => {
  it("focuses the first enabled control through a nested child container", () => {
    const layout = connectedHost();
    const container = document.createElement("div");
    const control = document.createElement("x-control") as UnifoldElementHost;
    const root = control.attachShadow({ mode: "open" });
    root.innerHTML = "<button disabled>Skip</button><input aria-label='Target'>";
    Object.defineProperty(layout, "unifoldChildContainer", { value: container });
    container.append(control);
    layout.append(container);
    expect(focusRenderedElement(layout)).toBe(root.querySelector("input"));
    expect(root.activeElement).toBe(root.querySelector("input"));
  });

  it("uses the requested enabled shadow control and falls back when it is disabled", () => {
    const host = connectedHost();
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = "<input><button disabled>Skip</button><button>Use</button>";
    expect(focusRenderedElement(host, 2)).toBe(root.querySelectorAll("button")[1]);
    expect(focusRenderedElement(host, 1)).toBe(root.querySelector("input"));
  });
});

describe("rendered focus fallback", () => {
  it("does not invent a focus stop for an empty or inert host", () => {
    const host = connectedHost();
    expect(focusRenderedElement(host)).toBeUndefined();
    expect(host.hasAttribute("tabindex")).toBe(false);
    const inert = connectedHost();
    inert.setAttribute("inert", "");
    expect(focusRenderedElement(inert)).toBeUndefined();
    expect(inert.hasAttribute("tabindex")).toBe(false);
  });

  it("rejects semantic and CSS-hidden composed targets", () => {
    expect(focusRenderedElement(hostWithInput("aria-hidden", "true"))).toBeUndefined();
    expect(focusRenderedElement(hostWithInput("style", "display: none"))).toBeUndefined();
    expect(focusRenderedElement(hostWithInput("style", "visibility: hidden"))).toBeUndefined();
    const hiddenInput = connectedHost();
    hiddenInput.innerHTML = "<input type='hidden'>";
    expect(focusRenderedElement(hiddenInput)).toBeUndefined();
  });
});

describe("rendered focus ownership", () => {
  it("requires native focus to become the deepest active element", () => {
    const host = connectedHost();
    const button = document.createElement("button");
    host.append(button);
    vi.spyOn(button, "focus").mockImplementation(() => undefined);

    expect(focusRenderedElement(host)).toBeUndefined();
    expect(document.activeElement).not.toBe(button);
  });

  it("does not retry after the user focuses another connected control", () => {
    const host = connectedHost();
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = "<input>";
    const previous = focusRenderedElement(host);
    const other = document.createElement("button");
    document.body.append(other);
    other.focus();
    if (previous === undefined) throw new Error("Expected a rendered focus target.");
    expect(focusMayBeRetried(host, previous)).toBe(false);
    expect(focusMayBeStarted(host, host)).toBe(false);
  });
});

function connectedHost(): UnifoldElementHost {
  const host = document.createElement("x-host") as UnifoldElementHost;
  document.body.append(host);
  return host;
}

function hostWithInput(attribute: string, value: string): UnifoldElementHost {
  const host = connectedHost();
  const container = document.createElement("section");
  container.setAttribute(attribute, value);
  container.innerHTML = "<input>";
  host.append(container);
  return host;
}
