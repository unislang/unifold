import {
  JsonPatchOperationType,
  UiPatchRisk,
  type UiJsonPatchOperation,
  type UiPatchProposal
} from "./types.js";

const MAXIMUM_INSPECTED_VALUES = 10_000;
const externalEffectKeys = new Set([
  "effect",
  "effectid",
  "effects",
  "endpoint",
  "href",
  "src",
  "target",
  "url"
]);
const dataKeys = new Set([
  "binding",
  "bindings",
  "cells",
  "columns",
  "data",
  "dataclassification",
  "entities",
  "entries",
  "errors",
  "items",
  "mutation",
  "name",
  "options",
  "properties",
  "query",
  "results",
  "rows",
  "semantics",
  "store",
  "stores",
  "types",
  "value",
  "values"
]);
const behaviorKeys = new Set([
  "accept",
  "action",
  "activationmode",
  "asyncvalidators",
  "disabled",
  "events",
  "guard",
  "linear",
  "loading",
  "machine",
  "maximumfilebytes",
  "multiple",
  "readonly",
  "required",
  "rules",
  "selectionmode",
  "sortablecolumns",
  "updateon",
  "validators"
]);
const interactionKeys = new Set(["$children", "$comp", "$slot", "slots"]);
const presentationKeys = new Set([
  "align",
  "columns",
  "content",
  "direction",
  "gap",
  "helptext",
  "label",
  "level",
  "padding",
  "placeholder",
  "size",
  "surface",
  "title",
  "tone",
  "variant",
  "weight"
]);
const riskKeyCategories: readonly (readonly [ReadonlySet<string>, UiPatchRisk])[] = [
  [externalEffectKeys, UiPatchRisk.ExternalEffect],
  [dataKeys, UiPatchRisk.Data],
  [behaviorKeys, UiPatchRisk.Behavior],
  [interactionKeys, UiPatchRisk.Interaction],
  [presentationKeys, UiPatchRisk.Presentation]
];
const riskRanks: Readonly<Record<UiPatchRisk, number>> = Object.freeze({
  [UiPatchRisk.Presentation]: 0,
  [UiPatchRisk.Interaction]: 1,
  [UiPatchRisk.Behavior]: 2,
  [UiPatchRisk.Data]: 3,
  [UiPatchRisk.ExternalEffect]: 4
});

export function classifyUiPatchRisk(proposal: UiPatchProposal): UiPatchRisk {
  return highestRisk(proposal.operations.map(operationRisk));
}

export function effectiveUiPatchRisk(proposal: UiPatchProposal): UiPatchRisk {
  return highestRisk([proposal.risk, classifyUiPatchRisk(proposal)]);
}

function operationRisk(operation: UiJsonPatchOperation): UiPatchRisk {
  if (operation.op === JsonPatchOperationType.Test) return UiPatchRisk.Presentation;
  if (operation.path === "/revision") return UiPatchRisk.Presentation;
  return highestRisk([pathRisk(operation.path), valueRisk(operation.value)]);
}

function pathRisk(path: string): UiPatchRisk {
  const tokens = pathTokens(path);
  if (tokens.includes("semantics")) return UiPatchRisk.Data;
  return propertyRisk(tokens.at(-1));
}

function propertyRisk(property: string | undefined): UiPatchRisk {
  if (property === undefined) return UiPatchRisk.Behavior;
  const risk = keyRisk(property);
  return risk === undefined ? UiPatchRisk.Behavior : risk;
}

function keyRisk(key: string): UiPatchRisk | undefined {
  const normalized = key.toLowerCase();
  for (const [keys, risk] of riskKeyCategories) {
    if (keys.has(normalized)) return risk;
  }
  return undefined;
}

function valueRisk(value: unknown): UiPatchRisk {
  const pending = [value];
  const risks: UiPatchRisk[] = [];
  let inspected = 0;
  while (pending.length > 0) {
    const exhausted = exhaustedRisk(inspected);
    if (exhausted !== undefined) return exhausted;
    inspectValue(pending.pop(), pending, risks);
    inspected += 1;
  }
  return collectedRisk(risks);
}

function exhaustedRisk(inspected: number): UiPatchRisk | undefined {
  return inspected >= MAXIMUM_INSPECTED_VALUES ? UiPatchRisk.ExternalEffect : undefined;
}

function collectedRisk(risks: readonly UiPatchRisk[]): UiPatchRisk {
  return risks.length === 0 ? UiPatchRisk.Presentation : highestRisk(risks);
}

function inspectValue(value: unknown, pending: unknown[], risks: UiPatchRisk[]): void {
  if (Array.isArray(value)) {
    pending.push(...value);
    return;
  }
  if (!isRecord(value)) return;
  Object.entries(value).forEach(([key, child]) => {
    const risk = keyRisk(key);
    if (risk !== undefined) risks.push(risk);
    pending.push(child);
  });
}

function pathTokens(path: string): string[] {
  return path.split("/").slice(1).map(unescapePointerToken);
}

function unescapePointerToken(value: string): string {
  return value.replaceAll("~1", "/").replaceAll("~0", "~");
}

function highestRisk(risks: readonly UiPatchRisk[]): UiPatchRisk {
  return risks.reduce(moreConservativeRisk, UiPatchRisk.Presentation);
}

function moreConservativeRisk(current: UiPatchRisk, candidate: UiPatchRisk): UiPatchRisk {
  return riskRanks[candidate] > riskRanks[current] ? candidate : current;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (value === null) return false;
  if (typeof value !== "object") return false;
  return !Array.isArray(value);
}
