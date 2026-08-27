import { getCoreDescriptor, type CatalogPropertyDescriptor } from "@unislang/unifold-catalog";
import {
  DataClassification,
  UiStoreAccess,
  UiStoreInitialDataPolicy,
  UiStoreOwnership,
  UiStorePersistence,
  UiStoreSchemaVersion,
  UiStoreSourceKind,
  type UiStoreBinding,
  type UiStoreDefinition
} from "@unislang/unifold-contracts";
import type { SchemaNode } from "json-schema-library";
import gte from "semver/functions/gte.js";
import valid from "semver/functions/valid.js";
import { errorDiagnostic } from "./diagnostics.js";
import { DiagnosticCode } from "./enums.js";
import { isPlainObject } from "./json-safety.js";
import {
  StorePathCompatibility,
  StoreSchemaCompilationStatus,
  compileStoreSchema,
  storePathCompatibility
} from "./store-schema.js";
import type { CompilerDiagnostic } from "./types.js";

const MAX_STORE_COUNT = 32;
const MAX_STORE_BYTES = 10_485_760;
const STORE_ID_PATTERN = /^[A-Za-z][A-Za-z0-9._-]{0,127}$/u;
const storeKeys = new Set(
  "access classification id initialData maxBytes migrations ownership persistence schema schemaVersion source".split(
    " "
  )
);
const sourceKeys = new Set("kind".split(" "));
const migrationKeys = new Set("maximum minimum".split(" "));
interface CompiledStore {
  readonly definition: UiStoreDefinition;
  readonly schema: SchemaNode;
}

export interface StoreValidationIndex {
  readonly stores: ReadonlyMap<string, CompiledStore>;
}

export function validateStoreDefinitions(
  value: unknown,
  diagnostics: CompilerDiagnostic[]
): StoreValidationIndex {
  const stores = new Map<string, CompiledStore>();
  if (value === undefined) return { stores };
  return validateStoreCollection(value, stores, diagnostics);
}

function validateStoreCollection(
  value: unknown,
  stores: Map<string, CompiledStore>,
  diagnostics: CompilerDiagnostic[]
): StoreValidationIndex {
  if (!Array.isArray(value)) return invalidCollection(diagnostics, stores);
  indexStoreCollection(value, stores, diagnostics);
  return { stores };
}

function indexStoreCollection(
  value: readonly unknown[],
  stores: Map<string, CompiledStore>,
  diagnostics: CompilerDiagnostic[]
): void {
  if (value.length > MAX_STORE_COUNT) addInvalid("Store count exceeds 32.", "/stores", diagnostics);
  value.forEach((item, index) => addStore(item, index, stores, diagnostics));
}

export function validateNodeStoreBinding(
  node: Readonly<Record<string, unknown>>,
  component: string | undefined,
  path: string,
  index: StoreValidationIndex,
  diagnostics: CompilerDiagnostic[]
): void {
  const binding = readStoreBinding(node);
  if (binding === undefined) return;
  validateReadBinding(binding, component, path, index, diagnostics);
}

function readStoreBinding(
  node: Readonly<Record<string, unknown>>
): UiStoreBinding | null | undefined {
  const store = node["store"];
  const path = node["path"];
  if (store === undefined) return path === undefined ? undefined : null;
  return bindingWithStore(store, path);
}

function bindingWithStore(store: unknown, path: unknown): UiStoreBinding | null {
  if (typeof store !== "string") return null;
  if (typeof path !== "string") return null;
  return { path, store };
}

function validateReadBinding(
  binding: UiStoreBinding | null,
  component: string | undefined,
  path: string,
  index: StoreValidationIndex,
  diagnostics: CompilerDiagnostic[]
): void {
  if (binding === null) {
    return addInvalidBinding("A binding requires string store and path values.", path, diagnostics);
  }
  validateResolvedBinding(binding, component, path, index, diagnostics);
}

function validateResolvedBinding(
  binding: UiStoreBinding,
  component: string | undefined,
  path: string,
  index: StoreValidationIndex,
  diagnostics: CompilerDiagnostic[]
): void {
  const store = index.stores.get(binding.store);
  if (store === undefined) return addUnknownStore(binding.store, path, diagnostics);
  const property = valueProperty(component);
  if (property === undefined) {
    return addInvalidBinding(
      "Only value-bearing controls can bind a store path.",
      path,
      diagnostics
    );
  }
  validatePointer(store.schema, binding.path, property, path, diagnostics);
}

function addStore(
  value: unknown,
  index: number,
  stores: Map<string, CompiledStore>,
  diagnostics: CompilerDiagnostic[]
): void {
  const path = `/stores/${index}`;
  const definition = readStoreDefinition(value, path, diagnostics);
  if (definition === undefined) return;
  addStoreDefinition(definition, path, stores, diagnostics);
}

function readStoreDefinition(
  value: unknown,
  path: string,
  diagnostics: CompilerDiagnostic[]
): UiStoreDefinition | undefined {
  if (!isPlainObject(value)) {
    addInvalid("Expected a store object.", path, diagnostics);
    return undefined;
  }
  if (!validStoreFields(value, path, diagnostics)) return undefined;
  return value as unknown as UiStoreDefinition;
}

function addStoreDefinition(
  definition: UiStoreDefinition,
  path: string,
  stores: Map<string, CompiledStore>,
  diagnostics: CompilerDiagnostic[]
): void {
  if (stores.has(definition.id)) return addDuplicate(definition.id, `${path}/id`, diagnostics);
  const schema = validatedStoreSchema(definition.schema, `${path}/schema`, diagnostics);
  if (schema !== undefined) stores.set(definition.id, { definition, schema });
}

function validStoreFields(
  value: Readonly<Record<string, unknown>>,
  path: string,
  diagnostics: CompilerDiagnostic[]
): boolean {
  const checks = [
    knownKeys(value, storeKeys),
    validStoreId(value["id"]),
    value["schemaVersion"] === UiStoreSchemaVersion.Version1,
    validSource(value["source"]),
    enumValue(UiStoreAccess, value["access"]),
    enumValue(UiStoreOwnership, value["ownership"]),
    enumValue(UiStorePersistence, value["persistence"]),
    enumValue(DataClassification, value["classification"]),
    enumValue(UiStoreInitialDataPolicy, value["initialData"]),
    validByteLimit(value["maxBytes"]),
    validMigrationRange(value["migrations"]),
    validSourcePolicy(value)
  ];
  if (checks.every(Boolean)) return true;
  addInvalid("Store policy fields are invalid or inconsistent.", path, diagnostics);
  return false;
}

function validSource(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  if (!knownKeys(value, sourceKeys)) return false;
  return enumValue(UiStoreSourceKind, value["kind"]);
}

function validByteLimit(value: unknown): boolean {
  if (!Number.isSafeInteger(value)) return false;
  return Number(value) > 0 && Number(value) <= MAX_STORE_BYTES;
}

function validMigrationRange(value: unknown): boolean {
  const range = migrationRange(value);
  if (range === undefined) return false;
  const [minimum, maximum] = range;
  if (!validVersions(minimum, maximum)) return false;
  return gte(maximum, minimum);
}

function migrationRange(value: unknown): readonly [string, string] | undefined {
  if (!isPlainObject(value)) return undefined;
  if (!knownKeys(value, migrationKeys)) return undefined;
  return textMigrationRange(value);
}

function textMigrationRange(
  value: Readonly<Record<string, unknown>>
): readonly [string, string] | undefined {
  const minimum = value["minimum"];
  const maximum = value["maximum"];
  if (typeof minimum !== "string") return undefined;
  if (typeof maximum !== "string") return undefined;
  return [minimum, maximum];
}

function validVersions(minimum: string, maximum: string): boolean {
  return valid(minimum) !== null && valid(maximum) !== null;
}

function validSourcePolicy(value: Readonly<Record<string, unknown>>): boolean {
  if (!isQuerySource(value["source"])) return true;
  return queryPolicy.every(([key, expected]) => value[key] === expected);
}

const queryPolicy = [
  ["access", UiStoreAccess.ReadOnly],
  ["ownership", UiStoreOwnership.RemoteQuery],
  ["persistence", UiStorePersistence.Remote]
] as const;

function isQuerySource(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  return value["kind"] === UiStoreSourceKind.Query;
}

function validatedStoreSchema(
  value: unknown,
  path: string,
  diagnostics: CompilerDiagnostic[]
): SchemaNode | undefined {
  const result = compileStoreSchema(value);
  if (result.status === StoreSchemaCompilationStatus.Invalid) {
    return rejectStoreSchema(result.message, path, diagnostics);
  }
  return requireCompiledSchema(result.schema, path, diagnostics);
}

function rejectStoreSchema(
  message: string | undefined,
  path: string,
  diagnostics: CompilerDiagnostic[]
): undefined {
  addInvalid(message ?? "Store schema is invalid.", path, diagnostics);
  return undefined;
}

function requireCompiledSchema(
  schema: SchemaNode | undefined,
  path: string,
  diagnostics: CompilerDiagnostic[]
): SchemaNode | undefined {
  if (schema !== undefined) return schema;
  addInvalid("Compiled store schema is missing.", path, diagnostics);
  return undefined;
}

function validatePointer(
  schema: SchemaNode,
  pointer: string,
  property: CatalogPropertyDescriptor,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  const compatibility = storePathCompatibility(schema, pointer, property);
  if (compatibility === StorePathCompatibility.Compatible) return;
  if (compatibility === StorePathCompatibility.Incompatible) {
    return addInvalidBinding(
      `Store path "${pointer}" is incompatible with the control value.`,
      path,
      diagnostics
    );
  }
  addInvalidPointer(pointer, path, diagnostics);
}

function valueProperty(component: string | undefined): CatalogPropertyDescriptor | undefined {
  if (component === undefined) return undefined;
  return getCoreDescriptor(component)?.properties.find(({ name }) => name === "value");
}

function enumValue(values: object, value: unknown): boolean {
  return Object.values(values).includes(value);
}

function validStoreId(value: unknown): boolean {
  return typeof value === "string" && STORE_ID_PATTERN.test(value);
}

function knownKeys(value: Readonly<Record<string, unknown>>, keys: ReadonlySet<string>): boolean {
  return Object.keys(value).every((key) => keys.has(key));
}

function invalidCollection(
  diagnostics: CompilerDiagnostic[],
  stores: ReadonlyMap<string, CompiledStore>
): StoreValidationIndex {
  addInvalid("stores must be an array.", "/stores", diagnostics);
  return { stores };
}

function addInvalid(message: string, path: string, diagnostics: CompilerDiagnostic[]): void {
  diagnostics.push(errorDiagnostic(DiagnosticCode.InvalidStoreDefinition, message, path));
}

function addInvalidBinding(message: string, path: string, diagnostics: CompilerDiagnostic[]): void {
  diagnostics.push(errorDiagnostic(DiagnosticCode.InvalidStoreBinding, message, path));
}

function addInvalidPointer(pointer: string, path: string, diagnostics: CompilerDiagnostic[]): void {
  diagnostics.push(
    errorDiagnostic(
      DiagnosticCode.InvalidStorePath,
      `Store path is not declared: ${pointer}.`,
      path
    )
  );
}

function addUnknownStore(id: string, path: string, diagnostics: CompilerDiagnostic[]): void {
  diagnostics.push(errorDiagnostic(DiagnosticCode.UnknownStore, `Unknown store: ${id}.`, path));
}

function addDuplicate(id: string, path: string, diagnostics: CompilerDiagnostic[]): void {
  diagnostics.push(
    errorDiagnostic(DiagnosticCode.DuplicateStoreId, `Store id is already defined: ${id}.`, path)
  );
}
