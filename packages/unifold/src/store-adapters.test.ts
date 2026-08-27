// @vitest-environment happy-dom
import {
  DataClassification,
  UiStoreAccess,
  UiStoreInitialDataPolicy
} from "@unislang/unifold-contracts";
import type {
  UnifoldMasterDetail,
  UnifoldSearchResults,
  UnifoldWizard
} from "@unislang/unifold-elements";
import { UiCommandType } from "@unislang/unifold-events";
import { createNodeSnapshot } from "@unislang/unifold-renderer-dom";
import { expect, it, vi } from "vitest";

import { prepareUnifoldDocument } from "./compiler.js";
import {
  mountUnifoldApplication,
  UnifoldApplicationMountStatus,
  type UnifoldApplicationPort
} from "./index.js";
import { masterDetailStoreDocument } from "./master-detail-store.test-data.js";
import { defineUnifoldMasterDetail } from "./master-detail.js";
import { searchResultsStoreDocument } from "./search-results-store.test-data.js";
import { defineUnifoldSearchResults } from "./search-results.js";
import { defineUnifoldWizard } from "./wizard.js";
import { boundDocument, storeDefinition } from "./store-adapters-base.test-data.js";
import {
  UiStoreConfigurationError,
  applyStoreSnapshot,
  createMemoryStoreAdapter,
  prepareApplicationStores,
  prepareUpdatedStores
} from "./store-adapters.js";
import { createStoreCommandPort } from "./store-command-port.js";
import { workflowStoreDocument } from "./workflow-store.test-data.js";

it("loads, validates, resolves, classifies, and writes through trusted adapters", () => {
  const document = compiledDocument();
  const adapter = createMemoryStoreAdapter("2.1.0", { name: "Ada" });
  const stores = prepareApplicationStores(document, { customer: adapter });
  const node = document.nodesById["name"];
  if (node === undefined) throw new Error("Bound node is missing.");
  const snapshot = applyStoreSnapshot(document, node, createNodeSnapshot(node, 0), stores);
  expect(snapshot.control?.value).toBe("Ada");
  expect(snapshot.base.dataClassification).toBe(DataClassification.Internal);
  createStoreCommandPort(document, stores, { customer: adapter }).execute(
    {
      id: "name",
      path: "/name",
      storeId: "customer",
      type: UiCommandType.StoreWrite,
      value: "Grace"
    },
    { causationId: "cause", correlationId: "correlation", transactionId: "transaction" }
  );
  expect(adapter.snapshot()).toEqual({ name: "Grace" });
  expect(stores.values["customer"]).toEqual({ name: "Grace" });
});

it("normalizes non-Error failures while preparing replacement stores", () => {
  const storesById = new Proxy(
    {},
    {
      ownKeys: () => {
        throw "private registry detail";
      }
    }
  );
  const result = prepareUpdatedStores({ ...compiledDocument(), storesById }, {});
  expect(result).toEqual(new Error("Unknown store preparation failure."));
});

it("hydrates and writes a bound MasterDetail selection", async () => {
  defineUnifoldMasterDetail(customElements);
  const container = document.createElement("main");
  document.body.append(container);
  const adapter = createMemoryStoreAdapter("2.1.0", { selection: "grace" });
  const application = requireApplication(
    mountUnifoldApplication(masterDetailStoreDocument(), container, {
      storeAdapters: { customer: adapter }
    })
  );
  const workspace = requireWorkspace(application);
  await workspace.updateComplete;

  expect(workspace.value).toBe("grace");
  expect(detailText(workspace)).toContain("Pending");
  workspace.moveActive(-1);
  workspace.selectActive();
  await workspace.updateComplete;
  expect(adapter.snapshot()).toEqual({ selection: "ada" });
  expect(detailText(workspace)).toContain("Active");

  application.dispose();
  container.remove();
});

it("hydrates and writes a complete bound SearchResults value", async () => {
  defineUnifoldSearchResults(customElements);
  const container = document.createElement("main");
  document.body.append(container);
  const initial = { query: "Grace", selectedResultId: "grace" };
  const adapter = createMemoryStoreAdapter("2.1.0", { search: initial });
  const application = requireApplication(
    mountUnifoldApplication(searchResultsStoreDocument(), container, {
      storeAdapters: { customer: adapter }
    })
  );
  const search = requireSearchResults(application);
  await search.updateComplete;

  expect(search.value).toEqual(initial);
  expect(search.shadowRoot?.querySelector('[aria-selected="true"]')?.textContent).toContain(
    "Grace"
  );
  search.moveActive(-1);
  search.selectActive();
  await search.updateComplete;
  expect(adapter.snapshot()).toEqual({
    search: { query: "Grace", selectedResultId: "ada" }
  });

  application.dispose();
  container.remove();
});

it("hydrates and writes a bound Wizard step while preserving its panels", async () => {
  defineUnifoldWizard(customElements);
  const container = document.createElement("main");
  document.body.append(container);
  const adapter = createMemoryStoreAdapter("2.1.0", { step: "review" });
  const application = requireApplication(
    mountUnifoldApplication(workflowStoreDocument(), container, {
      storeAdapters: { workflow: adapter }
    })
  );
  const wizard = requireWizard(application);
  await wizard.updateComplete;
  expect(wizard.value).toBe("review");
  expect(wizard.children[1]?.hasAttribute("hidden")).toBe(false);

  requireAction(wizard, "back").click();
  await wizard.updateComplete;
  expect(adapter.snapshot()).toEqual({ step: "account" });
  expect(wizard.children[0]?.hasAttribute("hidden")).toBe(false);

  application.dispose();
  container.remove();
});

it("rejects missing, corrupt, incompatible, and non-writable adapters before mount", () => {
  const document = compiledDocument();
  expect(() => prepareApplicationStores(document)).toThrow(UiStoreConfigurationError);
  expect(() =>
    prepareApplicationStores(document, {
      customer: createMemoryStoreAdapter("2.1.0", { name: 42 })
    })
  ).toThrow("invalid");
  expect(() =>
    prepareApplicationStores(document, {
      customer: createMemoryStoreAdapter("3.0.0", { name: "Ada" })
    })
  ).toThrow("version-mismatch");
  expect(() =>
    prepareApplicationStores(document, {
      customer: { load: () => ({ name: "Ada" }), version: "2.1.0" }
    })
  ).toThrow("no write method");
});

it("preserves the component default when optional store data is absent", () => {
  const source = boundDocument();
  source.stores = [storeDefinition(UiStoreInitialDataPolicy.Optional)];
  const result = prepareUnifoldDocument(source);
  const document = requirePreparedDocument(result);
  const stores = prepareApplicationStores(document, {
    customer: { load: () => undefined, version: "2.1.0", write: vi.fn() }
  });
  const node = requireNode(document.nodesById["name"]);
  const snapshot = applyStoreSnapshot(document, node, createNodeSnapshot(node, 0), stores);
  expect(controlValue(snapshot)).toBe("");
});

it("does not hydrate inherited object properties or mutate object prototypes", () => {
  const source = boundDocument();
  source.view = { $comp: "TextField", id: "name", path: "/toString", store: "customer" };
  const result = prepareUnifoldDocument(source);
  const document = requirePreparedDocument(result);
  const adapter = createMemoryStoreAdapter("2.1.0", { name: "Ada" });
  const stores = prepareApplicationStores(document, { customer: adapter });
  const node = requireNode(document.nodesById["name"]);
  const snapshot = applyStoreSnapshot(document, node, createNodeSnapshot(node, 0), stores);
  expect(controlValue(snapshot)).toBe("");
  expect(() => adapter.write?.("/__proto__/polluted", true)).toThrow("invalid");
  expect(() => adapter.write?.("/constructor/polluted", true)).toThrow("invalid");
  expect(() => adapter.write?.("/prototype/polluted", true)).toThrow("invalid");
  expect(Reflect.get({}, "polluted")).toBeUndefined();
});

it("replaces a memory store at the root pointer", () => {
  const adapter = createMemoryStoreAdapter("2.1.0", { name: "Ada" });
  adapter.write?.("", { name: "Grace" });
  expect(adapter.snapshot()).toEqual({ name: "Grace" });
});

it("authorizes exact bindings and validates the complete candidate store", () => {
  const document = compiledDocument();
  const adapter = createMemoryStoreAdapter("2.1.0", { name: "Ada" });
  const stores = prepareApplicationStores(document, { customer: adapter });
  const port = createStoreCommandPort(document, stores, { customer: adapter });
  expect(() => port.execute(storeCommand({ id: "other" }), context())).toThrow("not authorized");
  expect(() => port.execute(storeCommand({ path: "/other" }), context())).toThrow("not authorized");
  expect(() => port.execute(storeCommand({ value: "" }), context())).toThrow("invalid");
  expect(() => port.execute(storeCommand({ value: "x".repeat(70_000) }), context())).toThrow(
    "invalid"
  );
  expect(adapter.snapshot()).toEqual({ name: "Ada" });
});

it("rejects read-only writes and hides adapter failures", () => {
  const source = boundDocument();
  source.stores = [{ ...storeDefinition(), access: UiStoreAccess.ReadOnly }];
  const document = requirePreparedDocument(prepareUnifoldDocument(source));
  const write = vi.fn(() => {
    throw new Error("secret adapter detail");
  });
  const adapter = { load: () => ({ name: "Ada" }), version: "2.1.0", write };
  const stores = prepareApplicationStores(document, { customer: adapter });
  const port = createStoreCommandPort(document, stores, { customer: adapter });
  expect(() => port.execute(storeCommand(), context())).toThrow("not authorized");
  expect(write).not.toHaveBeenCalled();

  const writableDocument = compiledDocument();
  const writableStores = prepareApplicationStores(writableDocument, { customer: adapter });
  const writablePort = createStoreCommandPort(writableDocument, writableStores, {
    customer: adapter
  });
  expect(errorMessage(() => writablePort.execute(storeCommand(), context()))).toBe(
    "Store adapter failed to write."
  );
});

it("rejects thenable adapter load and write results", () => {
  const document = compiledDocument();
  const asyncLoad = (() => Promise.reject(new Error("secret load"))) as never;
  expect(() =>
    prepareApplicationStores(document, { customer: { load: asyncLoad, version: "2.1.0" } })
  ).toThrow("failed to load");

  const asyncWrite = (() => Promise.reject(new Error("secret write"))) as never;
  const adapter = { load: () => ({ name: "Ada" }), version: "2.1.0", write: asyncWrite };
  const stores = prepareApplicationStores(document, { customer: adapter });
  const port = createStoreCommandPort(document, stores, { customer: adapter });
  expect(() => port.execute(storeCommand(), context())).toThrow("failed to write");
});

function compiledDocument() {
  const result = prepareUnifoldDocument(boundDocument());
  return requirePreparedDocument(result);
}

function requirePreparedDocument(result: ReturnType<typeof prepareUnifoldDocument>) {
  if (result.prepared === undefined) {
    throw new Error(`Expected a prepared binding fixture: ${JSON.stringify(result.diagnostics)}`);
  }
  return result.prepared.document;
}

function requireNode<T>(node: T | undefined): T {
  if (node === undefined) throw new Error("Bound node is missing.");
  return node;
}

function requireApplication(
  result: ReturnType<typeof mountUnifoldApplication>
): UnifoldApplicationPort {
  if (result.status !== UnifoldApplicationMountStatus.Mounted) {
    throw new Error(`Mount rejected: ${JSON.stringify(result.diagnostics)}`);
  }
  return result.application;
}

function requireWorkspace(application: UnifoldApplicationPort): UnifoldMasterDetail {
  const element = application.renderer.getElement("accounts");
  if (element === undefined) throw new Error("Rendered MasterDetail is missing.");
  return element as UnifoldMasterDetail;
}

function requireSearchResults(application: UnifoldApplicationPort): UnifoldSearchResults {
  const element = application.renderer.getElement("customer-search");
  if (element === undefined) throw new Error("Rendered SearchResults is missing.");
  return element as UnifoldSearchResults;
}

function requireWizard(application: UnifoldApplicationPort): UnifoldWizard {
  const element = application.renderer.getElement("account-wizard");
  if (element === undefined) throw new Error("Rendered Wizard is missing.");
  return element as UnifoldWizard;
}

function requireAction(wizard: UnifoldWizard, part: string): HTMLButtonElement {
  const button = wizard.shadowRoot?.querySelector<HTMLButtonElement>(`[part="${part}"]`);
  if (!(button instanceof HTMLButtonElement)) throw new Error(`${part} action is missing.`);
  return button;
}

function detailText(workspace: UnifoldMasterDetail): string {
  const root = workspace.shadowRoot;
  if (root === null) throw new Error("MasterDetail shadow root is missing.");
  const detail = root.querySelector("[part=detail]");
  if (detail === null) throw new Error("MasterDetail detail is missing.");
  return String(detail.textContent);
}

function controlValue(snapshot: ReturnType<typeof createNodeSnapshot>) {
  return snapshot.control?.value;
}

function storeCommand(changes: Readonly<Record<string, unknown>> = {}) {
  return {
    id: "name",
    path: "/name",
    storeId: "customer",
    type: UiCommandType.StoreWrite,
    value: "Grace",
    ...changes
  } as Parameters<ReturnType<typeof createStoreCommandPort>["execute"]>[0];
}

function context() {
  return { causationId: "cause", correlationId: "correlation", transactionId: "transaction" };
}

function errorMessage(run: () => void): string {
  try {
    run();
  } catch (error) {
    return error instanceof Error ? error.message : "unknown";
  }
  return "missing error";
}
