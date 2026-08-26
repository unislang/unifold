import type { JsonObject, JsonValue } from "@unislang/unifold-contracts";

import { CompositionDiagnosticCode, CompositionParameterType } from "./enums.js";
import { compositionError } from "./diagnostics.js";
import { childPath } from "./path.js";
import type {
  CompositionDefinition,
  CompositionDiagnostic,
  CompositionInstance,
  CompositionParameterDefinition
} from "./types.js";

type ParameterMatcher = (value: JsonValue) => boolean;

const parameterMatchers: Readonly<Record<CompositionParameterType, ParameterMatcher>> = {
  [CompositionParameterType.Boolean]: (value) => typeof value === "boolean",
  [CompositionParameterType.Number]: (value) => typeof value === "number",
  [CompositionParameterType.String]: (value) => typeof value === "string"
};

export function isCompositionParameterValue(
  type: CompositionParameterType,
  value: JsonValue
): boolean {
  return parameterMatchers[type](value);
}

export function resolveCompositionParameters(
  definition: CompositionDefinition,
  instance: CompositionInstance,
  path: string,
  diagnostics: CompositionDiagnostic[]
): JsonObject {
  const provided = instance.parameters ?? {};
  reportUnknownParameters(definition, provided, path, diagnostics);
  return Object.fromEntries(resolveParameterEntries(definition, provided, path, diagnostics));
}

export function substituteParameters(
  value: JsonValue,
  parameters: JsonObject,
  path: string,
  diagnostics: CompositionDiagnostic[]
): JsonValue {
  if (Array.isArray(value)) return substituteArray(value, parameters, path, diagnostics);
  if (!isObject(value)) return value;
  return substituteObjectOrReference(value, parameters, path, diagnostics);
}

function substituteObjectOrReference(
  value: JsonObject,
  parameters: JsonObject,
  path: string,
  diagnostics: CompositionDiagnostic[]
): JsonValue {
  const reference = readParameterReference(value, path, diagnostics);
  if (reference !== undefined) return resolveReference(reference, parameters, path, diagnostics);
  return substituteObject(value, parameters, path, diagnostics);
}

function resolveParameterEntries(
  definition: CompositionDefinition,
  provided: JsonObject,
  path: string,
  diagnostics: CompositionDiagnostic[]
): [string, JsonValue][] {
  return Object.entries(definition.parameters).flatMap(([name, parameter]) => {
    const value = resolveParameter(name, parameter, provided, path, diagnostics);
    return value === undefined ? [] : [[name, value]];
  });
}

function resolveParameter(
  name: string,
  definition: CompositionParameterDefinition,
  provided: JsonObject,
  path: string,
  diagnostics: CompositionDiagnostic[]
): JsonValue | undefined {
  const value = providedValue(name, definition, provided);
  if (value === undefined) return reportMissing(name, definition, path, diagnostics);
  if (!isCompositionParameterValue(definition.type, value)) {
    reportInvalid(name, definition, path, diagnostics);
  }
  return value;
}

function providedValue(
  name: string,
  definition: CompositionParameterDefinition,
  provided: JsonObject
): JsonValue | undefined {
  return provided[name] ?? definition.default;
}

function reportUnknownParameters(
  definition: CompositionDefinition,
  provided: JsonObject,
  path: string,
  diagnostics: CompositionDiagnostic[]
): void {
  Object.keys(provided).forEach((name) => {
    if (definition.parameters[name] !== undefined) return;
    diagnostics.push(
      compositionError(
        CompositionDiagnosticCode.UnknownParameter,
        childPath(childPath(path, "parameters"), name),
        `Unknown composition parameter: ${name}.`
      )
    );
  });
}

function reportMissing(
  name: string,
  definition: CompositionParameterDefinition,
  path: string,
  diagnostics: CompositionDiagnostic[]
): undefined {
  if (definition.required)
    diagnostics.push(
      compositionError(
        CompositionDiagnosticCode.MissingParameter,
        childPath(childPath(path, "parameters"), name),
        `Required composition parameter is missing: ${name}.`
      )
    );
  return undefined;
}

function reportInvalid(
  name: string,
  definition: CompositionParameterDefinition,
  path: string,
  diagnostics: CompositionDiagnostic[]
): void {
  diagnostics.push(
    compositionError(
      CompositionDiagnosticCode.InvalidParameter,
      childPath(childPath(path, "parameters"), name),
      `Parameter ${name} must be ${definition.type}.`
    )
  );
}

function substituteArray(
  value: readonly JsonValue[],
  parameters: JsonObject,
  path: string,
  diagnostics: CompositionDiagnostic[]
): JsonValue[] {
  return value.map((item, index) =>
    substituteParameters(item, parameters, childPath(path, index), diagnostics)
  );
}

function substituteObject(
  value: JsonObject,
  parameters: JsonObject,
  path: string,
  diagnostics: CompositionDiagnostic[]
): JsonObject {
  return Object.fromEntries(
    Object.entries(value).map(([name, item]) => [
      name,
      substituteParameters(item as JsonValue, parameters, childPath(path, name), diagnostics)
    ])
  );
}

function resolveReference(
  name: string,
  parameters: JsonObject,
  path: string,
  diagnostics: CompositionDiagnostic[]
): JsonValue {
  const value = parameters[name];
  if (value !== undefined) return value;
  diagnostics.push(
    compositionError(
      CompositionDiagnosticCode.MissingParameter,
      path,
      `Template references an unresolved parameter: ${name}.`
    )
  );
  return null;
}

function readParameterReference(
  value: JsonObject,
  path: string,
  diagnostics: CompositionDiagnostic[]
): string | undefined {
  if (!("$parameter" in value)) return undefined;
  if (isExactParameterReference(value)) return value["$parameter"] as string;
  diagnostics.push(
    compositionError(
      CompositionDiagnosticCode.InvalidParameterReference,
      path,
      "A parameter reference must contain only a string $parameter property."
    )
  );
  return undefined;
}

function isExactParameterReference(value: JsonObject): boolean {
  return Object.keys(value).length === 1 && typeof value["$parameter"] === "string";
}

function isObject(value: JsonValue): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
