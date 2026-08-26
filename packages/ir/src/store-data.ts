import {
  UiStoreInitialDataPolicy,
  type JsonValue,
  type UiStoreDefinition
} from "@unislang/unifold-contracts";
import { compileSchema, draft2020, type JsonSchema } from "json-schema-library";
import { satisfies } from "semver";

import { StoreInputStatus } from "./enums.js";
import { isJsonSafe } from "./json-safety.js";

export interface StoreInputValidation {
  readonly status: StoreInputStatus;
}

export function validateStoreInput(
  definition: UiStoreDefinition,
  adapterVersion: string,
  value: unknown
): StoreInputValidation {
  const version = versionResult(definition, adapterVersion);
  if (version !== undefined) return version;
  return validateStoreValue(definition, value);
}

function versionResult(
  definition: UiStoreDefinition,
  adapterVersion: string
): StoreInputValidation | undefined {
  return supportedVersion(definition, adapterVersion)
    ? undefined
    : result(StoreInputStatus.VersionMismatch);
}

function validateStoreValue(definition: UiStoreDefinition, value: unknown): StoreInputValidation {
  if (value === undefined) return missingResult(definition.initialData);
  if (!safeJsonValue(value)) return result(StoreInputStatus.Invalid);
  return validatePresentValue(definition, value as JsonValue);
}

function safeJsonValue(value: unknown): boolean {
  try {
    return isJsonSafe(value);
  } catch {
    return false;
  }
}

function validatePresentValue(
  definition: UiStoreDefinition,
  value: JsonValue
): StoreInputValidation {
  if (definition.initialData === UiStoreInitialDataPolicy.Forbidden) {
    return result(StoreInputStatus.Forbidden);
  }
  if (encodedBytes(value) > definition.maxBytes) return result(StoreInputStatus.QuotaExceeded);
  return validSchemaValue(definition, value);
}

function supportedVersion(definition: UiStoreDefinition, version: string): boolean {
  const range = `>=${definition.migrations.minimum} <=${definition.migrations.maximum}`;
  return satisfies(version, range, { includePrerelease: true });
}

function missingResult(policy: UiStoreInitialDataPolicy): StoreInputValidation {
  if (policy === UiStoreInitialDataPolicy.Required) return result(StoreInputStatus.Missing);
  return result(StoreInputStatus.Valid);
}

function validSchemaValue(definition: UiStoreDefinition, value: JsonValue): StoreInputValidation {
  try {
    const schema = compileSchema(definition.schema as JsonSchema, {
      drafts: [draft2020],
      throwOnInvalidRef: true,
      throwOnInvalidSchema: true
    });
    return result(schema.validate(value).valid ? StoreInputStatus.Valid : StoreInputStatus.Invalid);
  } catch {
    return result(StoreInputStatus.Invalid);
  }
}

function encodedBytes(value: JsonValue): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function result(status: StoreInputStatus): StoreInputValidation {
  return { status };
}
