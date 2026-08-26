import { getCoreDescriptor, type ChoiceOption } from "@unislang/unifold-catalog";
import { CoreComponentType, DataClassification, type JsonValue } from "@unislang/unifold-contracts";
import type { UnifoldIrDocument, UnifoldIrNode } from "@unislang/unifold-ir";
import { escapeHtml } from "./html-escape.js";
import { staticNodeClassification } from "./static-classification.js";
import * as staticComponents from "./static-components.js";
export { staticNodeClassification } from "./static-classification.js";
type NodeRenderer = (context: RenderContext) => string;
interface RenderContext {
  readonly childContent: readonly string[];
  readonly children: string;
  readonly document: UnifoldIrDocument;
  readonly node: UnifoldIrNode;
}
const renderers: Readonly<Record<CoreComponentType, NodeRenderer>> = {
  [CoreComponentType.Accordion]: renderAccordion,
  [CoreComponentType.Alert]: renderAlert,
  [CoreComponentType.AuditLog]: staticComponents.renderStaticAuditLog,
  [CoreComponentType.Box]: renderContainer,
  [CoreComponentType.Button]: renderButton,
  [CoreComponentType.Checkbox]: renderCheckbox,
  [CoreComponentType.Combobox]: renderSelect,
  [CoreComponentType.Composition]: renderSection,
  [CoreComponentType.DataGrid]: staticComponents.renderStaticDataGrid,
  [CoreComponentType.Form]: renderForm,
  [CoreComponentType.Grid]: renderContainer,
  [CoreComponentType.Heading]: renderHeading,
  [CoreComponentType.Icon]: renderIcon,
  [CoreComponentType.Link]: renderLink,
  [CoreComponentType.MasterDetail]: staticComponents.renderStaticMasterDetail,
  [CoreComponentType.MenuButton]: staticComponents.renderStaticMenuButton,
  [CoreComponentType.MultiSelect]: renderMultiSelect,
  [CoreComponentType.RadioGroup]: renderRadioGroup,
  [CoreComponentType.SearchResults]: staticComponents.renderStaticSearchResults,
  [CoreComponentType.Select]: renderSelect,
  [CoreComponentType.Stack]: renderContainer,
  [CoreComponentType.Stepper]: staticComponents.renderStaticStepper,
  [CoreComponentType.Tabs]: staticComponents.renderStaticTabs,
  [CoreComponentType.Table]: staticComponents.renderStaticTable,
  [CoreComponentType.Text]: renderText,
  [CoreComponentType.TextArea]: renderTextArea,
  [CoreComponentType.TextField]: renderTextField,
  [CoreComponentType.VirtualList]: staticComponents.renderStaticVirtualList,
  [CoreComponentType.Wizard]: staticComponents.renderStaticWizard
};

export function renderStaticTree(document: UnifoldIrDocument): string {
  return renderNode(document, document.rootNodeId, true);
}

function renderNode(document: UnifoldIrDocument, id: string, root: boolean): string {
  const node = requireNode(document, id);
  const childContent = node.childIds.map((childId) => renderNode(document, childId, false));
  const children = childContent.join("");
  const content = requireRenderer(node)({ childContent, children, document, node });
  return wrapNode(document, node, content, root);
}

function wrapNode(
  document: UnifoldIrDocument,
  node: UnifoldIrNode,
  content: string,
  root: boolean
): string {
  const documentMarker = root ? attribute("data-unifold-static-document", document.documentId) : "";
  return `<div${attribute("data-unifold-static-node-id", node.id)}${attribute(
    "data-unifold-static-component",
    node.componentType
  )}${documentMarker}>${content}</div>`;
}

function renderAccordion({ children, document, node }: RenderContext): string {
  const open = publicBoolean(document, node, "value");
  return `<details${booleanAttribute("open", open)}><summary${attribute(
    "aria-disabled",
    String(booleanProperty(node, "disabled"))
  )}>${textProperty(node, "label")}</summary><section>${children}</section></details>`;
}

function renderAlert({ node }: RenderContext): string {
  const urgent = ["danger", "warning"].includes(stringProperty(node, "tone"));
  const role = urgent ? "alert" : "status";
  const live = urgent ? "assertive" : "polite";
  return `<div${attribute("role", role)}${attribute("aria-live", live)}>${optionalStrong(
    stringProperty(node, "title")
  )}<span>${textProperty(node, "content")}</span></div>`;
}

function renderContainer({ children, node }: RenderContext): string {
  return `<div${optionalAriaLabel(node)}>${children}</div>`;
}

function renderSection({ children, node }: RenderContext): string {
  return `<section${optionalAriaLabel(node)}>${children}</section>`;
}

function renderButton({ node }: RenderContext): string {
  return `<button${attribute("type", stringProperty(node, "action"))}${booleanAttribute(
    "disabled",
    booleanProperty(node, "disabled")
  )}>${textProperty(node, "label")}</button>`;
}

function renderCheckbox({ document, node }: RenderContext): string {
  return `<label><input${controlMarker(node)} type="checkbox"${attribute(
    "name",
    stringProperty(node, "name")
  )}${booleanAttribute("checked", publicBoolean(document, node, "value"))}${commonControlAttributes(
    node
  )}><span>${textProperty(node, "label")}</span></label>${validationMessage(node)}`;
}

function renderForm({ children, node }: RenderContext): string {
  const label = stringProperty(node, "label");
  return `<form${attribute("aria-label", label)}><fieldset><legend>${escapeHtml(
    label
  )}</legend>${formErrors(node)}${children}</fieldset></form>`;
}

function renderHeading({ node }: RenderContext): string {
  const level = stringProperty(node, "level");
  return `<h${level}>${textProperty(node, "content")}</h${level}>`;
}

function renderIcon({ node }: RenderContext): string {
  return `<span role="img"${attribute("aria-label", stringProperty(node, "label"))}>${textProperty(
    node,
    "name"
  )}</span>`;
}

function renderLink({ node }: RenderContext): string {
  return `<a${attribute("href", stringProperty(node, "href"))}${attribute(
    "target",
    stringProperty(node, "target")
  )}>${textProperty(node, "label")}</a>`;
}

function renderMultiSelect({ document, node }: RenderContext): string {
  const selected = publicStringArray(document, node, "value");
  return renderSelectControl(node, renderOptions(node, selected), " multiple");
}
function renderRadioGroup({ document, node }: RenderContext): string {
  const selected = publicString(document, node, "value");
  const options = optionList(node).map((option, index) =>
    renderRadio(node, option, index, selected)
  );
  return `<fieldset${commonControlAttributes(node)}><legend>${textProperty(
    node,
    "label"
  )}</legend>${options.join("")}</fieldset>${validationMessage(node)}`;
}

function renderSelect({ document, node }: RenderContext): string {
  const value = publicString(document, node, "value");
  const empty = value === "" ? '<option value="" selected></option>' : "";
  return renderSelectControl(node, `${empty}${renderOptions(node, [value])}`, "");
}

function renderSelectControl(node: UnifoldIrNode, options: string, multiple: string): string {
  const select = `<select${controlMarker(node)}${attribute(
    "name",
    stringProperty(node, "name")
  )}${multiple}${commonControlAttributes(node)}>${options}</select>`;
  return `<label><span>${textProperty(node, "label")}</span>${select}</label>${validationMessage(node)}`;
}

function renderText({ node }: RenderContext): string {
  return `<p>${textProperty(node, "content")}</p>`;
}

function renderTextArea({ document, node }: RenderContext): string {
  const control = `<textarea${controlMarker(node)}${attribute(
    "name",
    stringProperty(node, "name")
  )}${attribute("placeholder", stringProperty(node, "placeholder"))}${attribute(
    "rows",
    String(numberProperty(node, "rows"))
  )}${attribute("wrap", stringProperty(node, "wrap"))}${commonControlAttributes(node)}>${escapeHtml(
    publicString(document, node, "value")
  )}</textarea>`;
  return labeledControl(node, control);
}

function renderTextField({ document, node }: RenderContext): string {
  const type = stringProperty(node, "inputType");
  const value = type === "password" ? "" : publicString(document, node, "value");
  const control = `<input${controlMarker(node)}${attribute("type", type)}${attribute(
    "name",
    stringProperty(node, "name")
  )}${attribute("placeholder", stringProperty(node, "placeholder"))}${attribute(
    "value",
    value
  )}${commonControlAttributes(node)}>`;
  return labeledControl(node, control);
}

function labeledControl(node: UnifoldIrNode, control: string): string {
  return `<label><span>${textProperty(node, "label")}</span>${control}</label>${validationMessage(node)}`;
}

function renderOptions(node: UnifoldIrNode, selected: readonly string[]): string {
  return optionList(node)
    .map((option) => renderOption(option, selected))
    .join("");
}

function renderOption(option: ChoiceOption, selected: readonly string[]): string {
  return `<option${attribute("value", option.value)}${booleanAttribute(
    "disabled",
    option.disabled === true
  )}${booleanAttribute("selected", selected.includes(option.value))}>${escapeHtml(option.label)}</option>`;
}

function renderRadio(
  node: UnifoldIrNode,
  option: ChoiceOption,
  index: number,
  selected: string
): string {
  const id = `${node.id}__option_${index}`;
  return `<label${attribute("for", id)}><input${controlMarker(node)}${attribute(
    "id",
    id
  )} type="radio"${attribute("name", stringProperty(node, "name"))}${attribute(
    "value",
    option.value
  )}${booleanAttribute("checked", selected === option.value)}${booleanAttribute(
    "disabled",
    booleanProperty(node, "disabled") || option.disabled === true
  )}${booleanAttribute("required", booleanProperty(node, "required"))}><span>${escapeHtml(
    option.label
  )}</span></label>`;
}

function commonControlAttributes(node: UnifoldIrNode): string {
  return `${booleanAttribute("disabled", booleanProperty(node, "disabled"))}${booleanAttribute(
    "readonly",
    booleanProperty(node, "readonly")
  )}${booleanAttribute("required", booleanProperty(node, "required"))}`;
}

function controlMarker(node: UnifoldIrNode): string {
  return attribute("data-unifold-static-control", node.id);
}

function formErrors(node: UnifoldIrNode): string {
  const errors = stringArrayProperty(node, "errorMessages");
  const items = errors.map((message) => `<li>${escapeHtml(message)}</li>`).join("");
  return errors.length === 0 ? "" : `<div role="alert"><ul>${items}</ul></div>`;
}

function validationMessage(node: UnifoldIrNode): string {
  const message = stringProperty(node, "errorMessage");
  return message === "" ? "" : `<span role="alert">${escapeHtml(message)}</span>`;
}

function optionalStrong(value: string): string {
  return value === "" ? "" : `<strong>${escapeHtml(value)}</strong>`;
}

function optionalAriaLabel(node: UnifoldIrNode): string {
  const label = stringProperty(node, "label");
  return label === "" ? "" : attribute("aria-label", label);
}

function publicString(document: UnifoldIrDocument, node: UnifoldIrNode, name: string): string {
  return staticNodeClassification(document, node) === DataClassification.Public
    ? stringProperty(node, name)
    : "";
}

function publicBoolean(document: UnifoldIrDocument, node: UnifoldIrNode, name: string): boolean {
  return staticNodeClassification(document, node) === DataClassification.Public
    ? booleanProperty(node, name)
    : false;
}

function publicStringArray(
  document: UnifoldIrDocument,
  node: UnifoldIrNode,
  name: string
): readonly string[] {
  return staticNodeClassification(document, node) === DataClassification.Public
    ? stringArrayProperty(node, name)
    : [];
}

function property(node: UnifoldIrNode, name: string): JsonValue | undefined {
  const value = node.properties[name];
  if (value !== undefined) return value;
  return defaultProperty(node.componentType, name);
}

function defaultProperty(componentType: string, name: string): JsonValue | undefined {
  const descriptor = getCoreDescriptor(componentType);
  return descriptor?.properties.find((candidate) => candidate.name === name)?.defaultValue;
}

function stringProperty(node: UnifoldIrNode, name: string): string {
  const value = property(node, name);
  return typeof value === "string" ? value : "";
}

function textProperty(node: UnifoldIrNode, name: string): string {
  return escapeHtml(stringProperty(node, name));
}

function booleanProperty(node: UnifoldIrNode, name: string): boolean {
  return property(node, name) === true;
}

function numberProperty(node: UnifoldIrNode, name: string): number {
  const value = property(node, name);
  return typeof value === "number" ? value : 1;
}

function stringArrayProperty(node: UnifoldIrNode, name: string): readonly string[] {
  return property(node, name) as readonly string[];
}

function optionList(node: UnifoldIrNode): readonly ChoiceOption[] {
  return property(node, "options") as readonly ChoiceOption[];
}

function attribute(name: string, value: string): string {
  return ` ${name}="${escapeHtml(value)}"`;
}

function booleanAttribute(name: string, enabled: boolean): string {
  return enabled ? ` ${name}` : "";
}

function requireNode(document: UnifoldIrDocument, id: string): UnifoldIrNode {
  const node = document.nodesById[id];
  if (node === undefined) throw new Error(`Static IR node is missing: ${id}.`);
  return node;
}
function requireRenderer(node: UnifoldIrNode): NodeRenderer {
  const renderer = renderers[node.componentType as CoreComponentType];
  if (renderer === undefined) throw new Error(`No static renderer for ${node.componentType}.`);
  return renderer;
}
