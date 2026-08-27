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

  it("publishes and disposes independent application owners", () => {
    const first = publishJsonLd(document, '{"tenant":"one"}', "app-one");
    const second = publishJsonLd(document, '{"tenant":"two"}', "app-two");
    const updated = publishJsonLd(document, '{"tenant":"one-updated"}', "app-one");

    expect(first.isConnected).toBe(false);
    expect(second.isConnected).toBe(true);
    expect(publicationTexts()).toEqual(['{"tenant":"one-updated"}', '{"tenant":"two"}']);
    removeJsonLd(document, "app-two");
    expect(second.isConnected).toBe(false);
    expect(updated.isConnected).toBe(true);
    removeJsonLd(document, "app-one");
  });
});

describe("semantic publication cardinality", () => {
  it("rejects duplicate publications without modifying either one", () => {
    const first = publishJsonLd(document, '{"name":"Ada"}', "app-one");
    const duplicate = first.cloneNode(true) as HTMLScriptElement;
    document.head.append(duplicate);

    expect(() => publishJsonLd(document, '{"name":"Grace"}', "app-one")).toThrow(
      /owner app-one contains multiple publications/
    );
    expect([...document.head.querySelectorAll("[data-unifold-semantics]")]).toEqual([
      first,
      duplicate
    ]);
    removeJsonLd(document, "app-one");
  });

  it("does not let duplicated foreign scripts block or join an owner update", () => {
    const owned = publishJsonLd(document, '{"tenant":"one"}', "app-one");
    const foreign = publishJsonLd(document, '{"tenant":"two"}', "app-two");
    const duplicateForeign = foreign.cloneNode(true) as HTMLScriptElement;
    document.head.append(duplicateForeign);

    const updated = publishJsonLd(document, '{"tenant":"one-updated"}', "app-one");
    expect(owned.isConnected).toBe(false);
    expect(updated.isConnected).toBe(true);
    expect([foreign.isConnected, duplicateForeign.isConnected]).toEqual([true, true]);
    removeJsonLd(document, "app-one");
    expect([foreign.isConnected, duplicateForeign.isConnected]).toEqual([true, true]);
    removeJsonLd(document, "app-two");
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
    const competitor = publishJsonLd(document, "{}", "another-document");
    removeJsonLd(document, "app-one", "document-one");
    expect(exported.isConnected).toBe(false);
    expect(competitor.isConnected).toBe(true);
    removeJsonLd(document, "another-document");
  });

  it("adopts only the requested static owner beside another application", () => {
    const first = publishJsonLd(document, '{"tenant":"one"}', "document-one");
    const second = publishJsonLd(document, '{"tenant":"two"}', "app-two");
    const runtime = publishJsonLd(document, '{"tenant":"one-live"}', "app-one", "document-one");

    expect(first.isConnected).toBe(false);
    expect(second.isConnected).toBe(true);
    expect(runtime.isConnected).toBe(true);
    expect(publicationTexts()).toEqual(['{"tenant":"one-live"}', '{"tenant":"two"}']);
    removeJsonLd(document, "app-one");
    removeJsonLd(document, "app-two");
  });
});

function publicationTexts(): readonly (string | null)[] {
  return [...document.head.querySelectorAll<HTMLScriptElement>("[data-unifold-semantics]")].map(
    ({ textContent }) => textContent
  );
}
