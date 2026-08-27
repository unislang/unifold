import type { JsonObject } from "@unislang/unifold-contracts";

import controlSurface from "./control-surface.json" with { type: "json" };
import liveApplication from "./live-application.json" with { type: "json" };

export enum StudioControlId {
  Apply = "studio-apply",
  Cancel = "studio-cancel",
  Export = "studio-export",
  ExternalEdit = "studio-external-edit",
  Generate = "studio-generate",
  Prompt = "studio-prompt",
  Status = "studio-status"
}

export function controlSurfaceDocument(): JsonObject {
  return structuredClone(controlSurface) as JsonObject;
}

export function liveApplicationDocument(): JsonObject {
  return structuredClone(liveApplication) as JsonObject;
}

export function externallyEditedApplicationDocument(): JsonObject {
  const document = liveApplicationDocument();
  const view = requireObject(document["view"]);
  const children = requireChildren(view["$children"]);
  const summary = requireObject(children[1]);
  return {
    ...document,
    revision: "external-edit",
    view: {
      ...view,
      $children: [
        children[0] ?? {},
        { ...summary, content: "This summary was changed outside Studio." },
        ...children.slice(2)
      ]
    }
  };
}

function requireChildren(value: unknown): readonly JsonObject[] {
  if (!Array.isArray(value)) throw new TypeError("The Studio fixture requires view children.");
  return value.map(requireObject);
}

function requireObject(value: unknown): JsonObject {
  if (!isObject(value)) {
    throw new TypeError("The Studio fixture requires a JSON object.");
  }
  return value;
}

function isObject(value: unknown): value is JsonObject {
  if (value === null) return false;
  if (typeof value !== "object") return false;
  return !Array.isArray(value);
}
