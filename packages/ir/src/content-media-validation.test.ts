import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { isSafeResourceProperty } from "./content-media-validation.js";
import { validateNodeProperties } from "./property-validation.js";
import type { CompilerDiagnostic } from "./types.js";

it("accepts only HTTP(S) and relative image resource properties", () => {
  expect(isSafeResourceProperty("/profile-placeholder.svg")).toBe(true);
  expect(isSafeResourceProperty("https://cdn.example.com/profile.png")).toBe(true);
  expect(isSafeResourceProperty("data:image/svg+xml,unsafe")).toBe(false);
  expect(isSafeResourceProperty(42)).toBe(false);
});

it("accepts an exact dimensioned safe Image inside a semantic Card", () => {
  expect(validateTree(cardWithImage())).toEqual([]);
});

it("rejects omitted alt, unsafe resources, invalid dimensions, and Image children precisely", () => {
  const source = cardWithImage();
  const image = requiredImage(source);
  Reflect.deleteProperty(image, "alt");
  image["src"] = "data:image/svg+xml,unsafe";
  image["width"] = 0;
  image["$children"] = [{ $comp: CoreComponentType.Text, content: "Invalid", id: "nested" }];
  expect(validateTree(source)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: "missing-required-property", path: "/view/$children/0/alt" }),
      expect.objectContaining({ code: "invalid-property", path: "/view/$children/0/src" }),
      expect.objectContaining({ code: "invalid-property", path: "/view/$children/0/width" }),
      expect.objectContaining({ code: "invalid-child-count", path: "/view/$children/0/$children" })
    ])
  );
});

it("rejects empty and over-bounded Cards", () => {
  const empty = cardWithImage();
  empty["$children"] = [];
  expect(validateTree(empty)).toEqual([
    expect.objectContaining({ code: "invalid-child-count", path: "/view/$children" })
  ]);
  empty["$children"] = Array.from({ length: 101 }, (_, index) => ({
    $comp: CoreComponentType.Text,
    content: String(index),
    id: `copy-${index}`
  }));
  expect(validateTree(empty)).toEqual([
    expect.objectContaining({ code: "invalid-child-count", path: "/view/$children" })
  ]);
});

function cardWithImage(): Record<string, unknown> {
  return {
    $children: [
      {
        $comp: CoreComponentType.Image,
        alt: "A geometric profile placeholder",
        height: 240,
        id: "profile-image",
        src: "/profile-placeholder.svg",
        width: 320
      }
    ],
    $comp: CoreComponentType.Card,
    id: "profile-card",
    label: "Profile summary"
  };
}

function requiredImage(source: Record<string, unknown>): Record<string, unknown> {
  const child = (source["$children"] as Record<string, unknown>[])[0];
  if (child === undefined) throw new Error("Image fixture is missing.");
  return child;
}

function validateTree(card: Record<string, unknown>): readonly CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];
  validateNodeProperties(card, CoreComponentType.Card, "/view", diagnostics);
  const children = card["$children"];
  if (!Array.isArray(children)) return diagnostics;
  children.forEach((child, index) => validateChild(child, index, diagnostics));
  return diagnostics;
}

function validateChild(child: unknown, index: number, diagnostics: CompilerDiagnostic[]): void {
  if (!isRecord(child)) return;
  validateNodeProperties(child, componentName(child), `/view/$children/${index}`, diagnostics);
}

function componentName(node: Readonly<Record<string, unknown>>): string | undefined {
  const value = node["$comp"];
  return typeof value === "string" ? value : undefined;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return [typeof value === "object", value !== null, !Array.isArray(value)].every(Boolean);
}
