import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  ComponentCapability,
  ComponentDefinitionSchemaVersion,
  CoreComponentType
} from "@unislang/unifold-catalog";

import { createPackageManifest } from "./cem-manifest.mjs";
import { createComponentDefinitions } from "./component-definitions.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("joins all sidecars, catalog schemas, and CEM declarations", async () => {
  const document = await definitions();
  assert.equal(document.schemaVersion, ComponentDefinitionSchemaVersion.Version1);
  assert.deepEqual(
    document.definitions.map(({ componentType }) => componentType).toSorted(),
    Object.values(CoreComponentType).toSorted()
  );
  assert(
    document.definitions.every(({ customElement, tagName }) => customElement.tagName === tagName)
  );
});

test("derives required, enum, attribute, and public snapshot schemas", async () => {
  const document = await definitions();
  const schemas = schemaDefinitions(document);
  assert.deepEqual(schemas.icon.propertiesSchema.required, ["name"]);
  assert.deepEqual(schemas.link.propertiesSchema.required, ["href"]);
  assert.deepEqual(schemas.link.attributesSchema.properties.href, { type: "string" });
  assert.deepEqual(schemas.table.propertiesSchema.required, ["caption", "columns", "rows"]);
  assertMenuButtonSchemas(document);
  assert.deepEqual(schemas.breadcrumb.propertiesSchema.required, ["label", "items"]);
  assert.equal(schemas.breadcrumb.propertiesSchema.properties.items.maxItems, 32);
  assertOverlaySchemas(document);
  assertAuditLogSchemas(schemas.auditLog);
  assert.equal(schemas.table.propertiesSchema.properties.columns.maxItems, 64);
  assert.equal(schemas.table.propertiesSchema.properties.rows.maxItems, 10_000);
  assertDataGridSchemas(schemas.dataGrid);
  assertFileInputSchemas(schemas.fileInput);
  assertMultiSelectSchema(document);
  assertSearchResultsSchemas(schemas.searchResults);
  assertWorkflowSchemas(schemas.stepper, schemas.wizard);
  assert(schemas.link.publicSnapshotSchema.properties.testId === undefined);
  assertIconSchema(schemas.icon);
  assertImageSchema(schemas.image);
  assertNumberFieldSchema(schemas.numberField);
  assertSearchFieldSchema(schemas.searchField);
});

function assertImageSchema(image) {
  assert.deepEqual(image.propertiesSchema.required, ["alt", "height", "src", "width"]);
  assert.deepEqual(image.propertiesSchema.properties.fit.enum, ["contain", "cover"]);
  assert.deepEqual(image.propertiesSchema.properties.loading.enum, ["eager", "lazy"]);
  assert.equal(image.propertiesSchema.properties.width.minimum, 1);
}

function assertNumberFieldSchema(numberField) {
  assert.deepEqual(numberField.propertiesSchema.required, ["label"]);
  assert.deepEqual(numberField.control.valueSchema.type, ["number", "null"]);
  assert.equal(numberField.propertiesSchema.properties.step.exclusiveMinimum, 0);
}

function assertSearchFieldSchema(searchField) {
  assert.deepEqual(searchField.propertiesSchema.required, ["label"]);
  assert.deepEqual(searchField.control.valueSchema, { default: "", type: "string" });
  assert.deepEqual(searchField.propertiesSchema.properties.autocomplete.enum, ["off", "on"]);
  assert.equal(searchField.propertiesSchema.properties.maxLength.default, 2_048);
}

function assertOverlaySchemas(document) {
  const dialog = requireDefinition(document, CoreComponentType.Dialog);
  const tooltip = requireDefinition(document, CoreComponentType.Tooltip);
  const popover = requireDefinition(document, CoreComponentType.Popover);
  assert.deepEqual(tooltip.propertiesSchema.required, ["label", "content"]);
  assert.deepEqual(tooltip.propertiesSchema.properties.placement.enum, [
    "bottom",
    "end",
    "start",
    "top"
  ]);
  assert.deepEqual(popover.propertiesSchema.required, ["label", "panelLabel"]);
  assert.deepEqual(dialog.propertiesSchema.required, ["dialogLabel", "label"]);
  assert.deepEqual(popover.propertiesSchema.properties.placement.enum, [
    "bottom",
    "end",
    "start",
    "top"
  ]);
}

function assertMultiSelectSchema(document) {
  const value = requireDefinition(document, CoreComponentType.MultiSelect).control.valueSchema;
  assert.equal(value.maxItems, 10_000);
  assert.equal(value.uniqueItems, true);
}

function schemaDefinitions(document) {
  return Object.fromEntries(
    [
      "auditLog",
      "breadcrumb",
      "dataGrid",
      "dialog",
      "fileInput",
      "icon",
      "image",
      "link",
      "numberField",
      "popover",
      "searchField",
      "searchResults",
      "stepper",
      "table",
      "tooltip",
      "wizard"
    ].map((name) => [
      name,
      requireDefinition(document, CoreComponentType[name[0].toUpperCase() + name.slice(1)])
    ])
  );
}

function assertFileInputSchemas(fileInput) {
  const value = fileInput.control.valueSchema;
  assert.deepEqual(fileInput.propertiesSchema.required, ["label"]);
  assert.equal(fileInput.propertiesSchema.properties.accept.maxLength, 512);
  assert.equal(value.maxItems, 32);
  assert.equal(value.items.additionalProperties, false);
  assert.deepEqual(value.items.required, ["id", "size", "type"]);
  assert.equal(value.uniqueItems, true);
  assert.match(value.items.properties.id.pattern, /^\^\[0-9a-fA-F\]/u);
}

test("derives control adapters and enum-backed common capabilities", async () => {
  const document = await definitions();
  const textField = requireDefinition(document, CoreComponentType.TextField);
  const text = requireDefinition(document, CoreComponentType.Text);
  assert.deepEqual(textField.control, {
    updateTriggerProperty: "updateOn",
    validatorProperties: ["validators", "asyncValidators"],
    valueProperty: "value",
    valueSchema: { default: "", type: "string" }
  });
  assert(text.control === undefined);
  assert.deepEqual(text.commonCapabilities, Object.values(ComponentCapability));
});

async function definitions() {
  const manifest = await createPackageManifest(resolve(packageRoot, "src"));
  return createComponentDefinitions(manifest);
}

function requireDefinition(document, componentType) {
  const definition = document.definitions.find((item) => item.componentType === componentType);
  assert(definition, `Missing definition: ${componentType}.`);
  return definition;
}

function assertSearchResultsSchemas(searchResults) {
  assert.equal(searchResults.propertiesSchema.properties.results.maxItems, 10_000);
  assert.equal(searchResults.propertiesSchema.properties.results.items.additionalProperties, false);
  assert.equal(searchResults.control.valueSchema.properties.query.maxLength, 2_048);
  assert.deepEqual(searchResults.control.valueSchema.required, ["query", "selectedResultId"]);
}

function assertAuditLogSchemas(auditLog) {
  const entries = auditLog.propertiesSchema.properties.entries;
  assert.deepEqual(auditLog.propertiesSchema.required, ["label", "entries"]);
  assert.equal(entries.maxItems, 10_000);
  assert.equal(entries.items.additionalProperties, false);
  assert.equal(entries.items.properties.timestamp.format, "date-time");
}

function assertMenuButtonSchemas(document) {
  const menuButton = requireDefinition(document, CoreComponentType.MenuButton);
  assert.deepEqual(menuButton.propertiesSchema.required, ["label", "items"]);
  assert.equal(menuButton.propertiesSchema.properties.items.maxItems, 100);
}

function assertIconSchema(icon) {
  assert.deepEqual(icon.propertiesSchema.properties.name.enum, [
    "check",
    "external-link",
    "help",
    "info",
    "search",
    "warning"
  ]);
}

function assertDataGridSchemas(dataGrid) {
  assert.deepEqual(dataGrid.propertiesSchema.required, ["caption", "columns", "rows"]);
  assert.equal(dataGrid.control.valueSchema.properties.selectedRowIds.maxItems, 10_000);
  assert.deepEqual(dataGrid.control.valueSchema.properties.sort.properties.direction.enum, [
    "ascending",
    "descending"
  ]);
}

function assertWorkflowSchemas(stepper, wizard) {
  assert.deepEqual(stepper.propertiesSchema.required, ["label", "steps", "value"]);
  assert.equal(stepper.propertiesSchema.properties.steps.maxItems, 100);
  assert.equal(stepper.propertiesSchema.properties.steps.items.additionalProperties, false);
  assert.equal(stepper.control.valueSchema.maxLength, 128);
  assert.deepEqual(wizard.control.valueSchema, stepper.control.valueSchema);
}
