// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { publishJsonLd, removeJsonLd } from "./index.js";

describe("semantic head publisher", () => {
  it("atomically replaces content for its owner", () => {
    const first = publishJsonLd(document, '{"name":"Ada"}', "app-one");
    const second = publishJsonLd(document, '{"name":"Grace"}', "app-one");
    expect(first.isConnected).toBe(false);
    expect(second.textContent).toBe('{"name":"Grace"}');
    expect(document.head.querySelectorAll("[data-unifold-semantics]")).toHaveLength(1);
    removeJsonLd(document, "another-owner");
    expect(second.isConnected).toBe(true);
    removeJsonLd(document, "app-one");
    expect(second.isConnected).toBe(false);
  });

  it("rejects competing owners", () => {
    publishJsonLd(document, "{}", "app-one");
    expect(() => publishJsonLd(document, "{}", "app-two")).toThrow(/already owned/);
    removeJsonLd(document, "app-one");
  });
});

describe("semantic publication cardinality", () => {
  it("rejects duplicate publications without modifying either one", () => {
    const first = publishJsonLd(document, '{"name":"Ada"}', "app-one");
    const duplicate = first.cloneNode(true) as HTMLScriptElement;
    document.head.append(duplicate);

    expect(() => publishJsonLd(document, '{"name":"Grace"}', "app-one")).toThrow(
      /multiple publications/
    );
    expect([...document.head.querySelectorAll("[data-unifold-semantics]")]).toEqual([
      first,
      duplicate
    ]);
    removeJsonLd(document, "app-one");
  });
});

describe("static semantic ownership", () => {
  it("atomically adopts an expected static-export owner", () => {
    const exported = publishJsonLd(document, '{"name":"Ada"}', "document-one");
    const runtime = publishJsonLd(document, '{"name":"Grace"}', "app-one", "document-one");

    expect(exported.isConnected).toBe(false);
    expect(runtime.dataset["unifoldSemantics"]).toBe("app-one");
    expect(runtime.textContent).toBe('{"name":"Grace"}');
    expect(document.head.querySelectorAll("[data-unifold-semantics]")).toHaveLength(1);
    removeJsonLd(document, "app-one");
  });

  it("removes an expected static-export owner without touching competitors", () => {
    const exported = publishJsonLd(document, "{}", "document-one");
    removeJsonLd(document, "app-one", "document-one");
    expect(exported.isConnected).toBe(false);

    const competitor = publishJsonLd(document, "{}", "another-document");
    removeJsonLd(document, "app-one", "document-one");
    expect(competitor.isConnected).toBe(true);
    removeJsonLd(document, "another-document");
  });
});
