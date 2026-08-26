import { CoreComponentType, UiUpdateTrigger } from "@unislang/unifold-contracts";

import { CatalogConstraintKind, CatalogPropertyType, CoreElementTag } from "./enums.js";
import type { ComponentDescriptor } from "./types.js";
import {
  catalogEnumProperty as enumProperty,
  catalogProperty as property,
  catalogTestIdProperty as testId
} from "./catalog-properties.js";

export const MAXIMUM_FILE_COUNT = 32;
export const DEFAULT_MAXIMUM_FILE_BYTES = 10 * 1024 * 1024;
export const MAXIMUM_FILE_NAME_LENGTH = 255;
export const MAXIMUM_FILE_ID_LENGTH = 36;
export const MAXIMUM_FILE_ACCEPT_LENGTH = 512;
export const MAXIMUM_FILE_ACCEPT_TOKENS = 32;

export const fileInputDescriptor: ComponentDescriptor = {
  componentType: CoreComponentType.FileInput,
  constraints: [
    {
      kind: CatalogConstraintKind.FileInputData,
      maximumFileBytesProperty: "maximumFileBytes",
      multipleProperty: "multiple",
      valueProperty: "value"
    }
  ],
  properties: [
    property("accept", CatalogPropertyType.FileAccept, ""),
    property("disabled", CatalogPropertyType.Boolean, false),
    property("errorMessage", CatalogPropertyType.String, ""),
    property("label", CatalogPropertyType.String, undefined, true),
    property("maximumFileBytes", CatalogPropertyType.PositiveInteger, DEFAULT_MAXIMUM_FILE_BYTES),
    property("multiple", CatalogPropertyType.Boolean, false),
    property("name", CatalogPropertyType.String, ""),
    property("required", CatalogPropertyType.Boolean, false),
    enumProperty("updateOn", UiUpdateTrigger.Input, Object.values(UiUpdateTrigger)),
    property("value", CatalogPropertyType.FileMetadataList, []),
    property("validators", CatalogPropertyType.StringArray, []),
    property("asyncValidators", CatalogPropertyType.StringArray, []),
    testId
  ],
  tagName: CoreElementTag.FileInput,
  version: "1.0.0"
};

export function isValidFileAccept(value: string): boolean {
  if (value.length > MAXIMUM_FILE_ACCEPT_LENGTH) return false;
  if (value.trim().length === 0) return true;
  const tokens = value.split(",").map((token) => token.trim());
  return validAcceptTokens(tokens);
}

function validAcceptTokens(tokens: readonly string[]): boolean {
  if (tokens.length > MAXIMUM_FILE_ACCEPT_TOKENS) return false;
  return tokens.every(isValidAcceptToken);
}

function isValidAcceptToken(token: string): boolean {
  if (/^\.[a-z0-9][a-z0-9._+-]*$/iu.test(token)) return true;
  return /^[a-z0-9][a-z0-9!#$&^_.+-]*\/(?:\*|[a-z0-9][a-z0-9!#$&^_.+-]*)$/iu.test(token);
}
