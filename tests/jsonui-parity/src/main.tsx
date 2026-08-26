import { JsonUI, type JsonUINode } from "@jsonui/react";
import {
  UnifoldPreparationStatus,
  mountUnifoldApplication,
  prepareUnifoldDocument,
  type PreparedUnifoldDocument
} from "@unislang/unifold";
import {
  CoreCatalogName,
  CoreCatalogVersion,
  JsonUiProfileName,
  JsonUiProfileVersion,
  JsonUiUpstreamRevision,
  UiContractSchemaUri,
  UiSchemaVersion
} from "@unislang/unifold-contracts";
import { validateJsonUiProfileDocument } from "@unislang/unifold-jsonui";
import { createRoot } from "react-dom/client";

import officialQuickExample from "../fixtures/upstream/official-quick-example.json" with { type: "json" };
import { PARITY_CASES } from "./cases.js";
import { BEHAVIOR_PARITY_CASE_ID, mountBehaviorParity } from "./behavior-parity.js";
import { normalizeAuthored, normalizeIr } from "./normalize.js";
import { oracleComponents } from "./oracle-components.js";
import { ParityPreparationStatus, type ParityCaseResult } from "./types.js";

const results: Record<string, ParityCaseResult> = {};
const root = requireElement("parity-root");
const requestedCase = new URL(window.location.href).searchParams.get("case");
PARITY_CASES.filter(({ id }) => requestedCase === null || id === requestedCase).forEach((item) =>
  mountCase(item.id, item.view)
);
if (requestedCase === null || requestedCase === "official-readme-quick-example") {
  mountCase("official-readme-quick-example", officialQuickExample as JsonUINode, true);
}
const behavior = requestedCase === BEHAVIOR_PARITY_CASE_ID ? mountBehaviorParity(root) : undefined;
window.__jsonUiParity = { cases: results, ...(behavior === undefined ? {} : { behavior }) };

function mountCase(id: string, view: JsonUINode, upstreamOnly = false): void {
  const section = document.createElement("section");
  section.dataset["parityCase"] = id;
  const upstream = mountPoint(section, "upstream");
  const unifold = mountPoint(section, "unifold");
  root.append(section);
  createRoot(upstream).render(
    <JsonUI
      components={oracleComponents}
      defaultValues={{ data: { profile: { firstName: "John" } } }}
      model={view}
    />
  );
  results[id] = prepareCase(id, view, unifold, upstreamOnly);
}

function prepareCase(
  id: string,
  view: JsonUINode,
  host: HTMLElement,
  upstreamOnly: boolean
): ParityCaseResult {
  const expected = normalizeAuthored(view);
  let eventCount = 0;
  host.dataset["parityEventCount"] = "0";
  host.addEventListener("unifold-event", () => {
    eventCount++;
    host.dataset["parityEventCount"] = String(eventCount);
  });
  const authored = authoredDocument(id, view);
  const preparation = prepareUnifoldDocument(authored);
  if (preparation.status === UnifoldPreparationStatus.Invalid) {
    return rejectedCase(view, expected, preparation.diagnostics, eventCount);
  }
  assertExpectedSupport(upstreamOnly);
  const mounted = mountUnifoldApplication(authored, host);
  requireMounted(mounted, id);
  return {
    diagnostics: [],
    expected,
    initialEventCount: eventCount,
    ir: normalizeIr(requirePrepared(preparation.prepared).document, expected),
    profileDiagnostics: [],
    status: ParityPreparationStatus.Prepared
  };
}

function assertExpectedSupport(upstreamOnly: boolean): void {
  if (upstreamOnly) throw new Error("The official unsupported fixture unexpectedly compiled.");
}

function requireMounted(value: object, id: string): void {
  if (!("application" in value)) throw new Error(`Parity mount failed: ${id}.`);
}

function authoredDocument(id: string, view: JsonUINode) {
  return {
    $schema: UiContractSchemaUri.Version1,
    catalog: { name: CoreCatalogName.UnifoldCore, version: CoreCatalogVersion.Version1 },
    compositions: [],
    id: `jsonui-parity-${id}`,
    jsonUiProfile: profileReference(),
    revision: "1",
    schemaVersion: UiSchemaVersion.Version1,
    view
  };
}

function rejectedCase(
  view: JsonUINode,
  expected: ReturnType<typeof normalizeAuthored>,
  diagnostics: readonly { readonly code: string; readonly path: string }[],
  initialEventCount: number
): ParityCaseResult {
  const profile = validateJsonUiProfileDocument({
    jsonUiProfile: profileReference(),
    view
  });
  return {
    diagnostics: diagnostics.map(({ code, path }) => ({ code, path })),
    expected,
    initialEventCount,
    profileDiagnostics: profile.diagnostics.map(profileDiagnostic),
    status: ParityPreparationStatus.Rejected
  };
}

function profileReference() {
  return {
    name: JsonUiProfileName.Unifold,
    upstream: JsonUiUpstreamRevision.Version01025,
    version: JsonUiProfileVersion.Version1
  };
}

function profileDiagnostic(value: {
  readonly code: string;
  readonly feature?: string;
  readonly path: string;
}) {
  const base = { code: value.code, path: value.path };
  return value.feature === undefined ? base : { ...base, feature: value.feature };
}

function mountPoint(section: HTMLElement, kind: string): HTMLElement {
  const element = document.createElement("div");
  element.dataset["parityRenderer"] = kind;
  section.append(element);
  return element;
}

function requireElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`Parity root is missing: ${id}.`);
  return element;
}

function requirePrepared(value: PreparedUnifoldDocument | undefined): PreparedUnifoldDocument {
  if (value === undefined) throw new Error("Parity preparation omitted its compiled document.");
  return value;
}
