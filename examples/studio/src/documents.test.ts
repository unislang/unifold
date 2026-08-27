import { CoreComponentType, type JsonObject } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { StudioControlId, controlSurfaceDocument, liveApplicationDocument } from "./documents.js";

it("authors the chat controls as one hierarchical JSON UI tree", () => {
  const document = controlSurfaceDocument();
  expect(requireNode(document, "studio-chat")["$comp"]).toBe(CoreComponentType.Stack);
  expect(requireNode(document, StudioControlId.Prompt)["$comp"]).toBe(CoreComponentType.TextArea);
  expect(actionIds(document)).toEqual([
    StudioControlId.Generate,
    StudioControlId.Cancel,
    StudioControlId.Apply,
    StudioControlId.ExternalEdit,
    StudioControlId.Export
  ]);
  expect(requireNode(document, StudioControlId.Status)["$comp"]).toBe(CoreComponentType.Alert);
});

it("returns isolated authored documents for live and control applications", () => {
  const first = controlSurfaceDocument();
  const second = controlSurfaceDocument();
  expect(first).not.toBe(second);
  expect(first["view"]).not.toBe(second["view"]);
  expect(requireNode(liveApplicationDocument(), "prototype-summary")["content"]).toBe(
    "This is the currently applied experience."
  );
});

function actionIds(document: JsonObject): readonly unknown[] {
  const children = requireNode(document, "studio-actions")["$children"];
  if (!Array.isArray(children)) throw new Error("Studio actions are missing.");
  return children.map((node) => (isObject(node) ? node["id"] : undefined));
}

function requireNode(document: JsonObject, id: string): JsonObject {
  const node = findNode(document["view"], id);
  if (node === undefined) throw new Error(`Missing authored Studio node: ${id}.`);
  return node;
}

function findNode(value: unknown, id: string): JsonObject | undefined {
  if (!isObject(value)) return undefined;
  if (value["id"] === id) return value;
  return findChild(value["$children"], id);
}

function findChild(children: unknown, id: string): JsonObject | undefined {
  if (!Array.isArray(children)) return undefined;
  return children.map((child) => findNode(child, id)).find((node) => node !== undefined);
}

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
