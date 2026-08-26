import { CatalogPropertyType, type CatalogPropertyDescriptor } from "@unislang/unifold-catalog";
import { split } from "@sagold/json-pointer";
import { compileSchema, draft2020, type JsonSchema, type SchemaNode } from "json-schema-library";

import { isPlainObject } from "./json-safety.js";

const JSON_SCHEMA_2020 = "https://json-schema.org/draft/2020-12/schema";

export enum StoreSchemaCompilationStatus {
  Invalid = "invalid",
  Valid = "valid"
}

export enum StorePathCompatibility {
  Compatible = "compatible",
  Incompatible = "incompatible",
  Invalid = "invalid",
  Missing = "missing"
}

interface StoreSchemaCompilation {
  readonly message?: string;
  readonly schema?: SchemaNode;
  readonly status: StoreSchemaCompilationStatus;
}

export function compileStoreSchema(value: unknown): StoreSchemaCompilation {
  const schema = draftStoreSchema(value);
  if (schema === undefined) return invalid(DRAFT_MESSAGE);
  if (containsRemoteReference(schema)) return invalid(REMOTE_MESSAGE);
  return compileAcceptedSchema(schema);
}

export function storePathCompatibility(
  schema: SchemaNode,
  pointer: string,
  property: CatalogPropertyDescriptor
): StorePathCompatibility {
  if (!isSafeStorePointer(pointer)) return StorePathCompatibility.Invalid;
  const node = schema.getNode(pointer, undefined, { withSchemaWarning: true }).node;
  if (node === undefined) return StorePathCompatibility.Missing;
  return pathTypeCompatibility(node.schema, property);
}

function pathTypeCompatibility(
  schema: JsonSchema,
  property: CatalogPropertyDescriptor
): StorePathCompatibility {
  return compatibleType(schema, property)
    ? StorePathCompatibility.Compatible
    : StorePathCompatibility.Incompatible;
}

const POINTER_PATTERN = /^(?:\/(?:[^~/]|~[01])*)*$/u;
const MAX_POINTER_LENGTH = 2048;
const unsafePointerTokens = new Set(["__proto__", "constructor", "prototype"]);

export function isSafeStorePointer(pointer: string): boolean {
  if (pointer.length > MAX_POINTER_LENGTH) return false;
  if (!POINTER_PATTERN.test(pointer)) return false;
  return split(pointer).every((token) => !unsafePointerTokens.has(token));
}

const DRAFT_MESSAGE = "Store schema must be an embedded Draft 2020-12 schema.";
const REMOTE_MESSAGE = "Store schemas cannot contain remote references.";
const INVALID_MESSAGE = "Store schema is not valid Draft 2020-12 JSON Schema.";

function draftStoreSchema(value: unknown): Readonly<Record<string, unknown>> | undefined {
  if (!isPlainObject(value)) return undefined;
  if (value["$schema"] !== JSON_SCHEMA_2020) return undefined;
  return value;
}

function compileAcceptedSchema(value: Readonly<Record<string, unknown>>): StoreSchemaCompilation {
  try {
    const schema = compileSchema(value as JsonSchema, {
      drafts: [draft2020],
      throwOnInvalidRef: true,
      throwOnInvalidSchema: true
    });
    return { schema, status: StoreSchemaCompilationStatus.Valid };
  } catch {
    return invalid(INVALID_MESSAGE);
  }
}

function containsRemoteReference(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsRemoteReference);
  if (!isPlainObject(value)) return false;
  return containsRemoteReferenceInRecord(value);
}

function containsRemoteReferenceInRecord(value: Readonly<Record<string, unknown>>): boolean {
  if (remoteReference(value["$ref"])) return true;
  return Object.values(value).some(containsRemoteReference);
}

function remoteReference(value: unknown): boolean {
  return typeof value === "string" && !value.startsWith("#");
}

function compatibleType(schema: JsonSchema, property: CatalogPropertyDescriptor): boolean {
  const checker = typeCompatibility[property.valueType];
  if (checker === undefined) return false;
  return checker(schema);
}

const typeCompatibility: Partial<Record<CatalogPropertyType, (schema: JsonSchema) => boolean>> = {
  [CatalogPropertyType.Boolean]: (schema) => schema["type"] === "boolean",
  [CatalogPropertyType.DataGridValue]: compatibleDataGridValue,
  [CatalogPropertyType.SearchResultsValue]: compatibleSearchResultsValue,
  [CatalogPropertyType.StepId]: (schema) => schema["type"] === "string",
  [CatalogPropertyType.String]: (schema) => schema["type"] === "string",
  [CatalogPropertyType.StringArray]: compatibleStringArray
};

function compatibleSearchResultsValue(schema: JsonSchema): boolean {
  if (!isClosedObjectSchema(schema)) return false;
  const properties = schema["properties"];
  if (!isPlainObject(properties)) return false;
  return [
    stringSchema(properties["query"]),
    stringSchema(properties["selectedResultId"]),
    requiredProperty(schema["required"], "query"),
    requiredProperty(schema["required"], "selectedResultId")
  ].every(Boolean);
}

function isClosedObjectSchema(schema: JsonSchema): boolean {
  return schema["type"] === "object" && schema["additionalProperties"] === false;
}

function compatibleStringArray(schema: JsonSchema): boolean {
  if (schema["type"] !== "array") return false;
  const items = schema["items"];
  if (!isPlainObject(items)) return false;
  return items["type"] === "string";
}

function compatibleDataGridValue(schema: JsonSchema): boolean {
  return [
    schema["type"] === "object",
    schema["additionalProperties"] === false,
    compatibleDataGridProperties(schema["properties"]),
    requiredProperty(schema["required"], "selectedRowIds")
  ].every(Boolean);
}

function compatibleDataGridProperties(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  const selected = value["selectedRowIds"];
  const sort = value["sort"];
  return [
    isPlainObject(selected) && compatibleStringArray(selected as JsonSchema),
    compatibleDataGridSort(sort)
  ].every(Boolean);
}

function compatibleDataGridSort(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  const properties = value["properties"];
  return [
    value["type"] === "object",
    value["additionalProperties"] === false,
    isPlainObject(properties) && compatibleSortProperties(properties),
    requiredProperty(value["required"], "direction"),
    requiredProperty(value["required"], "key")
  ].every(Boolean);
}

function compatibleSortProperties(properties: Readonly<Record<string, unknown>>): boolean {
  return [stringSchema(properties["key"]), directionSchema(properties["direction"])].every(Boolean);
}

function stringSchema(value: unknown): boolean {
  return isPlainObject(value) && value["type"] === "string";
}

function directionSchema(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  const choices = value["enum"];
  if (!Array.isArray(choices)) return false;
  return [
    choices.length === 2,
    choices.includes("ascending"),
    choices.includes("descending")
  ].every(Boolean);
}

function requiredProperty(value: unknown, name: string): boolean {
  return Array.isArray(value) && value.includes(name);
}

function invalid(message: string): StoreSchemaCompilation {
  return { message, status: StoreSchemaCompilationStatus.Invalid };
}
