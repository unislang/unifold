import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { JsonObject } from "@unislang/unifold-contracts";
import { UiValidationSeverity, type UiValidationError } from "@unislang/unifold-events";

import type { StandardSchemaValidatorOptions, UiValidator } from "./types.js";

export function createStandardSchemaValidator(
  schema: StandardSchemaV1,
  options: StandardSchemaValidatorOptions
): UiValidator {
  return {
    validate(context) {
      const result = schema["~standard"].validate(context.value);
      if (isPromise(result)) throw new Error("Async Standard Schema requires an async validator.");
      return (result.issues ?? []).map((issue) => issueError(issue, context.node.id, options));
    }
  };
}

function issueError(
  issue: StandardSchemaV1.Issue,
  nodeId: string,
  options: StandardSchemaValidatorOptions
): UiValidationError {
  const path = issuePath(issue.path ?? []);
  return {
    affectedIds: affectedIds(options, path, nodeId),
    code: options.code,
    messageKey: options.messageKey,
    parameters: issueParameters(issue, path),
    severity: severity(options),
    validatorId: options.validatorId
  };
}

function affectedIds(
  options: StandardSchemaValidatorOptions,
  path: string,
  nodeId: string
): readonly string[] {
  return options.affectedIdsByPath?.[path] ?? [nodeId];
}

function severity(options: StandardSchemaValidatorOptions): UiValidationSeverity {
  return options.severity ?? UiValidationSeverity.Error;
}

function issueParameters(issue: StandardSchemaV1.Issue, path: string): JsonObject {
  return { message: issue.message, path };
}

function issuePath(path: StandardSchemaV1.Issue["path"]): string {
  return (path ?? []).map((segment) => String(pathKey(segment))).join(".");
}

function pathKey(segment: PropertyKey | StandardSchemaV1.PathSegment): PropertyKey {
  return typeof segment === "object" ? segment.key : segment;
}

function isPromise(value: unknown): value is Promise<unknown> {
  return value instanceof Promise;
}
