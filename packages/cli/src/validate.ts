import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

import {
  UnifoldPreparationStatus,
  prepareUnifoldDocument,
  type UnifoldApplicationDiagnostic
} from "@unislang/unifold";

import { UnifoldCliDiagnosticCode } from "./enums.js";
import { cliFailure, cliSuccess } from "./result.js";
import type { UnifoldCliDiagnostic, UnifoldCliResult } from "./types.js";

const MAXIMUM_DOCUMENT_BYTES = 2 * 1024 * 1024;

type ReadDocumentResult = { readonly content: string } | { readonly failure: UnifoldCliResult };
type ParseDocumentResult = { readonly document: unknown } | { readonly failure: UnifoldCliResult };

export async function validateUnifoldDocument(
  inputPath: string,
  cwd?: string
): Promise<UnifoldCliResult> {
  const path = resolve(validationCwd(cwd), inputPath);
  const read = await readDocument(path);
  if ("failure" in read) return read.failure;
  const parsed = parseDocument(read.content, path);
  if ("failure" in parsed) return parsed.failure;
  return validateParsedDocument(parsed.document, path);
}

function validateParsedDocument(document: unknown, path: string): UnifoldCliResult {
  const preparation = prepareUnifoldDocument(document);
  if (preparation.status === UnifoldPreparationStatus.Invalid) {
    return cliFailure(
      `Unifold document is invalid: ${path}`,
      preparation.diagnostics.map(mapDiagnostic)
    );
  }
  return cliSuccess(`Unifold document is valid: ${path}`);
}

async function readDocument(path: string): Promise<ReadDocumentResult> {
  try {
    const metadata = await stat(path);
    const invalid = invalidMetadata(path, metadata.isFile(), metadata.size);
    if (invalid !== undefined) return { failure: invalid };
    return { content: await readFile(path, "utf8") };
  } catch (error) {
    return { failure: inputFailure(path, errorMessage(error)) };
  }
}

function parseDocument(content: string, path: string): ParseDocumentResult {
  try {
    return { document: JSON.parse(content) as unknown };
  } catch (error) {
    return {
      failure: cliFailure(`Unable to parse JSON: ${path}`, [
        { code: UnifoldCliDiagnosticCode.InputInvalid, message: errorMessage(error), path }
      ])
    };
  }
}

function invalidMetadata(
  path: string,
  isFile: boolean,
  size: number
): UnifoldCliResult | undefined {
  if (!isFile) return inputFailure(path, "Input must be a file.");
  if (size > MAXIMUM_DOCUMENT_BYTES)
    return inputFailure(path, `Input exceeds ${MAXIMUM_DOCUMENT_BYTES} bytes.`);
  return undefined;
}

function inputFailure(path: string, message: string): UnifoldCliResult {
  return cliFailure(`Unable to read Unifold document: ${path}`, [
    { code: UnifoldCliDiagnosticCode.InputReadFailed, message, path }
  ]);
}

function mapDiagnostic(diagnostic: UnifoldApplicationDiagnostic): UnifoldCliDiagnostic {
  return {
    code: UnifoldCliDiagnosticCode.DocumentInvalid,
    message: diagnostic.message,
    path: diagnostic.path,
    sourceCode: diagnostic.code,
    stage: diagnostic.stage
  };
}

function validationCwd(cwd: string | undefined): string {
  return cwd === undefined ? process.cwd() : cwd;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown input error.";
}
