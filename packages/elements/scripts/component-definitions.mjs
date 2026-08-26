import {
  CatalogBindingKind,
  CatalogPropertyType,
  ComponentCapability,
  ComponentDefinitionSchemaVersion,
  ErrorSummaryItemProperty,
  FileMetadataProperty,
  MAXIMUM_BREADCRUMB_ITEMS,
  MAXIMUM_ERROR_SUMMARY_ITEMS,
  MAXIMUM_FILE_ACCEPT_LENGTH,
  MAXIMUM_FILE_COUNT,
  MAXIMUM_FILE_ID_LENGTH,
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
  [CatalogPropertyType.ErrorSummaryItemList]: {
    items: {
      additionalProperties: false,
      properties: {
        [ErrorSummaryItemProperty.Message]: { maxLength: 4_096, minLength: 1, type: "string" },
        [ErrorSummaryItemProperty.TargetId]: identifierSchema
      },
      required: Object.values(ErrorSummaryItemProperty),
      type: "object"
    },
    maxItems: MAXIMUM_ERROR_SUMMARY_ITEMS,
    type: "array"
  },
  [CatalogPropertyType.FileAccept]: {
    maxLength: MAXIMUM_FILE_ACCEPT_LENGTH,
    type: "string"
  },
  [CatalogPropertyType.FileMetadataList]: {
    items: {
      additionalProperties: false,
      properties: {
        [FileMetadataProperty.Id]: {
          maxLength: MAXIMUM_FILE_ID_LENGTH,
          minLength: MAXIMUM_FILE_ID_LENGTH,
          pattern:
            "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
          type: "string"
        },
        [FileMetadataProperty.Size]: {
          maximum: Number.MAX_SAFE_INTEGER,
          minimum: 0,
          type: "integer"
        },
        [FileMetadataProperty.Type]: { maxLength: 255, type: "string" }
      },
      required: Object.values(FileMetadataProperty),
      type: "object"
    },
    maxItems: MAXIMUM_FILE_COUNT,
    type: "array",
    uniqueItems: true
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
  [CatalogPropertyType.NullableNumber]: { type: ["number", "null"] },
  [CatalogPropertyType.Number]: { type: "number" },
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
  [CatalogPropertyType.PositiveInteger]: {
    maximum: Number.MAX_SAFE_INTEGER,
    minimum: 1,
    type: "integer"
  },
  [CatalogPropertyType.PositiveNumber]: { exclusiveMinimum: 0, type: "number" },
  [CatalogPropertyType.SafeResourceUrl]: { type: "string" },
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
  [CatalogPropertyType.StringArray]: {
    items: { type: "string" },
    maxItems: 10_000,
    type: "array",
    uniqueItems: true
  },
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
  return defaultedSchema(descriptor, boundedSchema(descriptor, base));
}

function boundedSchema(descriptor, base) {
  const schema = { ...base };
  addBound(schema, "maxItems", descriptor.maximumItems);
  addBound(schema, "minItems", descriptor.minimumItems);
  addBound(schema, "minLength", descriptor.minimumLength);
  return schema;
}

function addBound(schema, name, value) {
  if (value !== undefined) schema[name] = value;
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
  return bindingKind !== CatalogBindingKind.Attribute;
}
