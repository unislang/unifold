// @vitest-environment happy-dom
import { registerCoreElements } from "@unislang/unifold-elements";
import {
  CoreComponentType,
  UiNodeKind,
  UnifoldIrVersion,
  type UnifoldIrDocument
} from "@unislang/unifold-ir";
import { UiValidationSeverity } from "@unislang/unifold-events";
import { describe, expect, it } from "vitest";

import { createNodeSnapshot, FocusRestoreStatus, renderIrDocument } from "./index.js";

describe("renderIrDocument", () => {
  it("preserves unrelated elements during a property-only update", preservesSibling);
  it("projects a committed control snapshot without touching its sibling", projectsSnapshot);
  it("projects an aggregate-owned issue onto its affected control", projectsRoutedError);
  it("reconciles a sibling subtree without remounting stable nodes", reconcilesSubtree);
  it("preflights an update before mutating the mounted document", rejectsUnknownDescriptor);
  it("restores focus to the upgraded native control", restoresFocus);
});

async function preservesSibling(): Promise<void> {
  const { container, controller } = await renderTestDocument();
  const button = controller.getElement("submit");
  controller.update(createDocument("Full name"));
  await waitForUpdate(controller.getElement("name"));
  expect(controller.getElement("submit")).toBe(button);
  expect(controller.getElement("name")?.getAttribute("data-unifold-render-count")).toBe("2");
  expect(button?.getAttribute("data-unifold-render-count")).toBe("1");
  container.remove();
}

async function restoresFocus(): Promise<void> {
  const { container, controller } = await renderTestDocument();
  await expect(controller.restoreFocus("missing")).resolves.toBe(FocusRestoreStatus.NotFocused);
  await expect(controller.restoreFocus("name")).resolves.toBe(FocusRestoreStatus.Focused);
  const name = requiredElement(controller.getElement("name"));
  expect(activeElement(name)).toBe(requiredInput(name));
  requiredInput(name).blur();
  await expect(controller.restoreFocus("name", 0)).resolves.toBe(FocusRestoreStatus.Focused);
  expect(activeElement(name)).toBe(requiredInput(name));
  requiredInput(name).blur();
  await expect(controller.restoreFocus("name", 99)).resolves.toBe(FocusRestoreStatus.Focused);
  expect(activeElement(name)).toBe(requiredInput(name));
  requiredInput(name).disabled = true;
  requiredInput(name).blur();
  await expect(controller.restoreFocus("name", 0)).resolves.toBe(FocusRestoreStatus.NotFocused);
  expect(requiredInput(name).disabled).toBe(true);
  container.remove();
}

function activeElement(element: HTMLElement): Element | null | undefined {
  return element.shadowRoot?.activeElement;
}

async function projectsSnapshot(): Promise<void> {
  const { container, controller, document } = await renderTestDocument();
  const name = requiredElement(controller.getElement("name"));
  const button = requiredElement(controller.getElement("submit"));
  const initial = createNodeSnapshot(requiredNode(document, "name"), 1);
  if (initial.control === undefined) throw new Error("Control snapshot is missing.");
  controller.project({
    ...initial,
    control: { ...initial.control, rawValue: "Ada", value: "Ada" }
  });
  await waitForUpdate(name);
  expect(Reflect.get(name, "value")).toBe("Ada");
  expect(name.dataset["unifoldRenderCount"]).toBe("2");
  expect(button.dataset["unifoldRenderCount"]).toBe("1");
  container.remove();
}

async function projectsRoutedError(): Promise<void> {
  const { container, controller, document } = await renderTestDocument();
  const name = requiredElement(controller.getElement("name"));
  const snapshot = createNodeSnapshot(requiredNode(document, "name"), 1);
  if (snapshot.control === undefined) throw new Error("Control snapshot is missing.");
  controller.project({ ...snapshot, control: { ...snapshot.control, touched: true } }, [
    {
      affectedIds: ["name"],
      code: "match",
      messageKey: "validation.match",
      ownerId: "form",
      parameters: { message: "Names must match." },
      severity: UiValidationSeverity.Error,
      validatorId: "match"
    }
  ]);
  await waitForUpdate(name);
  expect(Reflect.get(name, "errorMessage")).toBe("Names must match.");
  container.remove();
}

async function reconcilesSubtree(): Promise<void> {
  const { container, controller } = await renderTestDocument();
  const form = requiredElement(controller.getElement("form"));
  const name = requiredElement(controller.getElement("name"));
  const submit = requiredElement(controller.getElement("submit"));
  const input = requiredInput(name);
  const renderCount = name.dataset["unifoldRenderCount"];
  input.focus();
  controller.update(createDocument("Name", true));
  await waitForUpdate(controller.getElement("details"));
  expect(controller.getElement("form")).toBe(form);
  expect(controller.getElement("name")).toBe(name);
  expect(controller.getElement("submit")).toBe(submit);
  expect(childIds(form)).toEqual(["name", "details", "submit"]);
  expect(name.shadowRoot?.activeElement).toBe(input);
  expect(name.dataset["unifoldRenderCount"]).toBe(renderCount);
  controller.update(createDocument("Name", true, true));
  expect(childIds(form)).toEqual(["details", "name", "submit"]);
  expect(name.shadowRoot?.activeElement).toBe(input);
  controller.update(createDocument("Name"));
  expect(controller.getElement("details")).toBeUndefined();
  expect(childIds(form)).toEqual(["name", "submit"]);
  container.remove();
}

async function rejectsUnknownDescriptor(): Promise<void> {
  const { container, controller } = await renderTestDocument();
  const name = controller.getElement("name");
  const invalid = createDocument("Name", true);
  const nodes = {
    ...invalid.nodesById,
    details: { ...requiredNode(invalid, "details"), componentType: "Missing" }
  };
  expect(() => controller.update({ ...invalid, nodesById: nodes })).toThrow("No DOM descriptor");
  expect(controller.getElement("name")).toBe(name);
  expect(controller.getElement("details")).toBeUndefined();
  container.remove();
}

async function renderTestDocument() {
  registerCoreElements(customElements);
  const container = document.createElement("div");
  document.body.append(container);
  const irDocument = createDocument("Name");
  const controller = renderIrDocument(irDocument, container);
  await waitForUpdate(controller.getElement("name"));
  await waitForUpdate(controller.getElement("submit"));
  return { container, controller, document: irDocument };
}

async function waitForUpdate(element: HTMLElement | undefined): Promise<void> {
  if (element === undefined) throw new Error("Rendered element is missing.");
  await (element as HTMLElement & { readonly updateComplete: Promise<boolean> }).updateComplete;
}

function createDocument(
  label: string,
  withDetails = false,
  detailsFirst = false
): UnifoldIrDocument {
  return {
    collectionBehaviorsById: {},
    compositionsByInstanceId: {},
    machines: [],
    nodeIdentityAliases: {},
    documentId: "test",
    documentRevision: label,
    irVersion: UnifoldIrVersion.Version1,
    nodesById: createNodes(label, withDetails, detailsFirst),
    renderOrder: nodeIds(withDetails, detailsFirst),
    rootNodeId: "form",
    rules: [],
    source: {
      documentSchemaVersion: "1.0.0" as never,
      jsonUiProfile: "test",
      jsonUiUpstreamRevision: "test" as never
    },
    sourcePointersByNodeId: sourcePointers(),
    storesById: {}
  };
}

function createNodes(
  label: string,
  withDetails: boolean,
  detailsFirst: boolean
): UnifoldIrDocument["nodesById"] {
  const nodes = {
    form: node(
      "form",
      CoreComponentType.Form,
      UiNodeKind.Form,
      childNodeIds(withDetails, detailsFirst),
      { label: "Test" }
    ),
    name: node("name", CoreComponentType.TextField, UiNodeKind.Control, [], { label }, "form"),
    submit: buttonNode("submit", "Save"),
    details: buttonNode("details", "Details")
  };
  if (withDetails) return nodes;
  const withoutDetails = { ...nodes };
  Reflect.deleteProperty(withoutDetails, "details");
  return withoutDetails;
}

function buttonNode(id: string, label: string) {
  return node(id, CoreComponentType.Button, UiNodeKind.Component, [], { label }, "form");
}

function nodeIds(withDetails: boolean, detailsFirst: boolean): string[] {
  return ["form", ...childNodeIds(withDetails, detailsFirst)];
}

function childNodeIds(withDetails: boolean, detailsFirst: boolean): string[] {
  if (!withDetails) return ["name", "submit"];
  return detailsFirst ? ["details", "name", "submit"] : ["name", "details", "submit"];
}

function sourcePointers(): UnifoldIrDocument["sourcePointersByNodeId"] {
  return {
    form: "/view",
    name: "/view/$children/0",
    submit: "/view/$children/1"
  };
}

function node(
  id: string,
  componentType: CoreComponentType,
  kind: UiNodeKind,
  childIds: readonly string[],
  properties: Record<string, string>,
  parentId?: string
) {
  const value = {
    childIds,
    componentType,
    eventBindings: {},
    id,
    kind,
    properties,
    scopePath: ["form", id]
  };
  return parentId === undefined ? value : { ...value, parentId };
}

function requiredNode(document: UnifoldIrDocument, id: string) {
  const value = document.nodesById[id];
  if (value === undefined) throw new Error(`IR node is missing: ${id}.`);
  return value;
}

function requiredElement(element: HTMLElement | undefined): HTMLElement {
  if (element === undefined) throw new Error("Rendered element is missing.");
  return element;
}

function requiredInput(element: HTMLElement): HTMLInputElement {
  const input = element.shadowRoot?.querySelector("input");
  if (!(input instanceof HTMLInputElement)) throw new Error("Rendered input is missing.");
  return input;
}

function childIds(element: HTMLElement): string[] {
  const host = element as HTMLElement & { readonly unifoldChildContainer?: HTMLElement };
  return [...(host.unifoldChildContainer ?? host).children].map((child) => requiredNodeId(child));
}

function requiredNodeId(element: Element): string {
  const id = (element as HTMLElement).dataset["unifoldNodeId"];
  if (id === undefined) throw new Error("Rendered node ID is missing.");
  return id;
}
