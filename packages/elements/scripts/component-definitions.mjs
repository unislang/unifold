import {
  CatalogBindingKind,
  CatalogPropertyType,
  ComponentCapability,
  ComponentDefinitionSchemaVersion,
  MAXIMUM_BREADCRUMB_ITEMS,
  MAXIMUM_MENU_ITEMS,
  componentDefinitionSidecars,
  coreCatalog,
  getCoreDescriptor
} from "@unislang/unifold-catalog";

const capabilities = Object.freeze(Object.values(ComponentCapability));
const identifierSchema = Object.freeze({
  maxLength: 128,
  minLength: 1,
  not: { enum: ["__proto__", "constructor", "prototype"] },
  type: "string"
});
const tableCellSchema = Object.freeze({
  anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }, { type: "null" }]
});
const scalarSchemas = Object.freeze({
  [CatalogPropertyType.AuditLogEntryList]: {
    items: {
      additionalProperties: false,
      properties: {
        action: { maxLength: 512, minLength: 1, type: "string" },
        actor: { maxLength: 512, minLength: 1, type: "string" },
        correlationId: identifierSchema,
        id: identifierSchema,
        summary: { maxLength: 4_096, minLength: 1, type: "string" },
        timestamp: { format: "date-time", type: "string" }
      },
      required: ["action", "actor", "id", "summary", "timestamp"],
      type: "object"
    },
    maxItems: 10_000,
    type: "array",
    uniqueItems: true
  },
  [CatalogPropertyType.Boolean]: { type: "boolean" },
  [CatalogPropertyType.BreadcrumbItemList]: {
    items: {
      additionalProperties: false,
      properties: {
        href: { type: "string" },
        id: identifierSchema,
        label: { maxLength: 512, minLength: 1, type: "string" }
      },
      required: ["id", "label"],
      type: "object"
    },
    maxItems: MAXIMUM_BREADCRUMB_ITEMS,
    minItems: 1,
    type: "array"
  },
  [CatalogPropertyType.DataGridValue]: {
    additionalProperties: false,
    properties: {
      selectedRowIds: { items: identifierSchema, maxItems: 10_000, type: "array" },
      sort: {
        additionalProperties: false,
        properties: {
          direction: { enum: ["ascending", "descending"], type: "string" },
          key: identifierSchema
        },
        required: ["direction", "key"],
        type: "object"
      }
    },
    required: ["selectedRowIds"],
    type: "object"
  },
  [CatalogPropertyType.MenuItemList]: {
    items: {
      additionalProperties: false,
      properties: {
        disabled: { type: "boolean" },
        label: { maxLength: 512, minLength: 1, type: "string" },
        value: identifierSchema
      },
      required: ["label", "value"],
      type: "object"
    },
    maxItems: MAXIMUM_MENU_ITEMS,
    minItems: 1,
    type: "array"
  },
  [CatalogPropertyType.OptionList]: {
    items: {
      additionalProperties: false,
      properties: {
        disabled: { type: "boolean" },
        label: { type: "string" },
        value: { type: "string" }
      },
      required: ["label", "value"],
      type: "object"
    },
    type: "array"
  },
  [CatalogPropertyType.PositiveInteger]: { minimum: 1, type: "integer" },
  [CatalogPropertyType.SafeUrl]: { type: "string" },
  [CatalogPropertyType.SearchResultList]: {
    items: {
      additionalProperties: false,
      properties: {
        description: { maxLength: 4_096, type: "string" },
        href: { type: "string" },
        id: identifierSchema,
        title: { maxLength: 512, minLength: 1, type: "string" }
      },
      required: ["id", "title"],
      type: "object"
    },
    maxItems: 10_000,
    type: "array"
  },
  [CatalogPropertyType.SearchResultsValue]: {
    additionalProperties: false,
    properties: {
      query: { maxLength: 2_048, type: "string" },
      selectedResultId: { anyOf: [{ const: "" }, identifierSchema] }
    },
    required: ["query", "selectedResultId"],
    type: "object"
  },
  [CatalogPropertyType.StepId]: identifierSchema,
  [CatalogPropertyType.StepList]: {
    items: {
      additionalProperties: false,
      properties: {
        description: { maxLength: 4_096, type: "string" },
        disabled: { type: "boolean" },
        id: identifierSchema,
        label: { maxLength: 512, minLength: 1, type: "string" }
      },
      required: ["id", "label"],
      type: "object"
    },
    maxItems: 100,
    minItems: 1,
    type: "array"
  },
  [CatalogPropertyType.String]: { type: "string" },
  [CatalogPropertyType.StringArray]: { items: { type: "string" }, type: "array" },
  [CatalogPropertyType.TableColumnList]: {
    items: {
      additionalProperties: false,
      properties: { key: identifierSchema, label: { type: "string" } },
      required: ["key", "label"],
      type: "object"
    },
    maxItems: 64,
    minItems: 1,
    type: "array"
  },
  [CatalogPropertyType.TableRowList]: {
    items: {
      additionalProperties: false,
      properties: {
        cells: {
          additionalProperties: tableCellSchema,
          propertyNames: identifierSchema,
          type: "object"
        },
        id: identifierSchema
      },
      required: ["cells", "id"],
      type: "object"
    },
    maxItems: 10_000,
    type: "array"
  }
});

export function createComponentDefinitions(manifest) {
  const declarations = manifest.modules.flatMap((module) => module.declarations ?? []);
  return {
    catalog: { name: coreCatalog.name, version: coreCatalog.version },
    definitions: Object.values(componentDefinitionSidecars).map((sidecar) =>
      joinDefinition(sidecar, declarations)
    ),
    schemaVersion: ComponentDefinitionSchemaVersion.Version1
  };
}

function joinDefinition(sidecar, declarations) {
  const descriptor = getCoreDescriptor(sidecar.componentType);
  if (descriptor === undefined) throw new Error(`Missing descriptor: ${sidecar.componentType}.`);
  const customElement = declarations.find(({ tagName }) => tagName === descriptor.tagName);
  if (customElement === undefined) throw new Error(`Missing manifest tag: ${descriptor.tagName}.`);
  const control = controlAdapter(descriptor);
  return {
    ...sidecar,
    attributesSchema: attributeSchema(customElement),
    catalogDescriptor: descriptor,
    commonCapabilities: capabilities,
    ...controlField(control),
    customElement,
    propertiesSchema: descriptorSchema(descriptor),
    publicSnapshotSchema: snapshotSchema(descriptor),
    tagName: descriptor.tagName,
    version: descriptor.version
  };
}

function descriptorSchema(descriptor) {
  return objectSchema(descriptor.properties, ({ name }) => name);
}

function snapshotSchema(descriptor) {
  const properties = descriptor.properties.filter(isPropertyBinding);
  return objectSchema(properties, ({ name }) => name);
}

function attributeSchema(customElement) {
  const entries = (customElement.attributes ?? []).map(({ name }) => [name, { type: "string" }]);
  return { additionalProperties: false, properties: Object.fromEntries(entries), type: "object" };
}

function objectSchema(descriptors, keyFor) {
  const entries = descriptors.map((descriptor) => [keyFor(descriptor), propertySchema(descriptor)]);
  const required = descriptors.filter(({ required }) => required).map(keyFor);
  const schema = {
    additionalProperties: false,
    properties: Object.fromEntries(entries),
    type: "object"
  };
  return required.length === 0 ? schema : { ...schema, required };
}

function propertySchema(descriptor) {
  const base = basePropertySchema(descriptor);
  if (base === undefined) throw new Error(`Unsupported property type: ${descriptor.valueType}.`);
  return defaultedSchema(descriptor, base);
}

function controlAdapter(descriptor) {
  const value = descriptor.properties.find(({ name }) => name === "value");
  if (value === undefined) return undefined;
  const updateOn = descriptor.properties.find(({ name }) => name === "updateOn");
  const validators = descriptor.properties
    .filter(({ name }) => name === "asyncValidators" || name === "validators")
    .map(({ name }) => name);
  return {
    ...updateTriggerField(updateOn),
    validatorProperties: validators,
    valueProperty: value.name,
    valueSchema: propertySchema(value)
  };
}

function basePropertySchema(descriptor) {
  if (descriptor.valueType === CatalogPropertyType.Enum)
    return { enum: descriptor.enumValues, type: "string" };
  return scalarSchemas[descriptor.valueType];
}

function defaultedSchema(descriptor, base) {
  if (descriptor.defaultValue === undefined) return base;
  return { ...base, default: descriptor.defaultValue };
}

function controlField(control) {
  return control === undefined ? {} : { control };
}

function updateTriggerField(updateOn) {
  return updateOn === undefined ? {} : { updateTriggerProperty: updateOn.name };
}

function isPropertyBinding({ bindingKind }) {
  return bindingKind === CatalogBindingKind.Property;
}
