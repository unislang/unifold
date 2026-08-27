// @vitest-environment happy-dom
import { CoreComponentType } from "@unislang/unifold-contracts";
import { UiNodeKind, type UnifoldIrNode } from "@unislang/unifold-ir";
import { expect, it } from "vitest";

import { validateStaticToast } from "./toast-hydration.js";

it("accepts the exact persistent Toast fallback contract", () => {
  const element = fixture("status", "Profile ready", "Changes ready");
  expect(() => validateStaticToast(toastNode(), element, invalid)).not.toThrow();
});

it("rejects live-region, content, and structural drift", () => {
  const wrongRole = fixture("alert", "Profile ready", "Changes ready");
  const wrongMessage = fixture("status", "Profile ready", "Tampered");
  const extraControl = fixture("status", "Profile ready", "Changes ready", "<button>x</button>");
  [wrongRole, wrongMessage, extraControl].forEach((element) => {
    expect(() => validateStaticToast(toastNode(), element, invalid)).toThrow("invalid toast");
  });
});

it("requires assertive semantics for urgent Toast status", () => {
  const element = fixture("alert", "Profile ready", "Changes ready");
  element.querySelector("section")?.setAttribute("data-status", "error");
  const urgent = toastNode({ status: "error" });
  expect(() => validateStaticToast(urgent, element, invalid)).not.toThrow();
});

it("matches arbitrary node ids without interpolating a selector", () => {
  const id = `ready"] [data-unifold-static-toast="other`;
  const element = fixture("status", "Profile ready", "Changes ready");
  element.dataset["unifoldStaticNodeId"] = id;
  requiredElement(element, "section").dataset["unifoldStaticToast"] = id;
  requiredElement(element, "div").dataset["unifoldStaticToastAnnouncement"] = id;
  expect(() => validateStaticToast(toastNode({}, id), element, invalid)).not.toThrow();
});

it("accepts a hidden Toast only without live semantics", () => {
  const element = fixture("status", "Profile ready", "Changes ready");
  const surface = requiredElement(element, "section");
  surface.dataset["visible"] = "false";
  surface.hidden = true;
  surface.replaceChildren();
  expect(() => validateStaticToast(toastNode({ visible: false }), element, invalid)).not.toThrow();
  surface.innerHTML = '<div role="status">Tampered announcement</div>';
  expect(() => validateStaticToast(toastNode({ visible: false }), element, invalid)).toThrow();
});

it("rejects duplicate, unowned, and indirectly nested Toast surfaces", () => {
  const duplicate = fixture("status", "Profile ready", "Changes ready");
  requiredElement(duplicate, "section").after(
    requiredElement(duplicate, "section").cloneNode(true)
  );
  expect(() => validateStaticToast(toastNode(), duplicate, invalid)).toThrow("invalid toast");

  const unowned = fixture("status", "Profile ready", "Changes ready");
  const boundary = document.createElement("div");
  boundary.dataset["unifoldStaticNodeId"] = "nested";
  const surface = requiredElement(unowned, "section");
  surface.replaceWith(boundary);
  boundary.append(surface);
  expect(() => validateStaticToast(toastNode(), unowned, invalid)).toThrow("invalid toast");

  const indirect = fixture("status", "Profile ready", "Changes ready");
  const wrapper = document.createElement("section");
  const announcement = requiredElement(indirect, "div");
  announcement.replaceWith(wrapper);
  wrapper.append(announcement);
  expect(() => validateStaticToast(toastNode(), indirect, invalid)).toThrow("invalid toast");
});

it("applies the documented Toast defaults during hydration", () => {
  const element = fixture("status", "Profile ready", "Changes ready");
  requiredElement(element, "section").dataset["status"] = "info";
  expect(() =>
    validateStaticToast(toastNode({ status: undefined, variant: undefined }), element, invalid)
  ).not.toThrow();
});

function fixture(role: string, label: string, message: string, extra = ""): HTMLElement {
  const element = document.createElement("div");
  element.dataset["unifoldStaticNodeId"] = "ready";
  element.innerHTML = `<section data-unifold-static-toast="ready" data-status="success" data-variant="subtle" data-visible="true"><div data-unifold-static-toast-announcement="ready" role="${role}" aria-atomic="true"><strong>${label}</strong><span>${message}</span></div>${extra}</section>`;
  return element;
}

function toastNode(properties = {}, id = "ready"): UnifoldIrNode {
  return {
    childIds: [],
    componentType: CoreComponentType.Toast,
    eventBindings: {},
    id,
    kind: UiNodeKind.Component,
    parentId: "root",
    properties: {
      label: "Profile ready",
      message: "Changes ready",
      status: "success",
      variant: "subtle",
      ...properties
    },
    scopePath: [id]
  };
}

function requiredElement(owner: HTMLElement, selector: string): HTMLElement {
  const element = owner.querySelector<HTMLElement>(selector);
  if (element === null) throw new Error(`Missing fixture ${selector}.`);
  return element;
}

function invalid(): Error {
  return new Error("invalid toast");
}
