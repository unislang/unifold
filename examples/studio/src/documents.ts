import type { JsonObject } from "@unislang/unifold-contracts";

import { resolveStudioModuleArtifacts } from "./module-reference.js";

export enum StudioControlId {
  Apply = "studio-apply",
  Cancel = "studio-cancel",
  Export = "studio-export",
  ExternalEdit = "studio-external-edit",
  Generate = "studio-generate",
  Prompt = "studio-prompt",
  Status = "studio-status"
}

export async function controlSurfaceDocument(): Promise<JsonObject> {
  const artifacts = await resolveStudioModuleArtifacts();
  return cloneDocument(artifacts.controlSurface.composedDocument);
}

export async function liveApplicationDocument(): Promise<JsonObject> {
  const artifacts = await resolveStudioModuleArtifacts();
  return cloneDocument(artifacts.liveApplication.composedDocument);
}

export function externallyEditedApplicationDocument(document: JsonObject): JsonObject {
  const copy = cloneDocument(document);
  const view = requireObject(copy["view"]);
  const children = requireChildren(view["$children"]);
  const summary = requireObject(children[1]);
  return {
    ...copy,
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

function cloneDocument(document: JsonObject): JsonObject {
  return structuredClone(document);
}

function requireChildren(value: unknown): readonly JsonObject[] {
  if (!Array.isArray(value)) throw new TypeError("The Studio fixture requires view children.");
  return value.map(requireObject);
}

function requireObject(value: unknown): JsonObject {
  if (!isObject(value)) throw new TypeError("The Studio fixture requires a JSON object.");
  return value;
}

function isObject(value: unknown): value is JsonObject {
  if (value === null) return false;
  if (typeof value !== "object") return false;
  return !Array.isArray(value);
}
