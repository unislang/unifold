import { controlPlaneHttpStatus } from "./http-handler.js";
import type { ControlPlaneService } from "./service.js";
import {
  ControlPlaneBodyError,
  ControlPlaneBodyErrorCode,
  configuredBodyLimit,
  readBoundedBody
} from "./transport-body.js";
import { decodeControlPlaneRequest, safeJson } from "./transport-validation.js";
import {
  ControlPlaneErrorCode,
  ControlPlaneOperationStatus,
  type ControlPlaneBackupReceipt,
  type ControlPlaneBackupRequest,
  type ControlPlaneCommitDocumentRequest,
  type ControlPlaneDocumentRevision,
  type ControlPlaneEffectExecution,
  type ControlPlaneInvokeEffectRequest,
  type ControlPlaneReadDocumentRequest,
  type ControlPlaneRealtimeBatch,
  type ControlPlaneRestoreReceipt,
  type ControlPlaneRestoreRequest,
  type ControlPlaneResult,
  type ControlPlaneResumeRealtimeRequest
} from "./types.js";

const defaultMaximumResponseBytes = 4 * 1024 * 1024;
const statuses = new Set<string>(Object.values(ControlPlaneOperationStatus));
const errorCodes = new Set<string>(Object.values(ControlPlaneErrorCode));

export enum ControlPlaneTransportErrorCode {
  Aborted = "aborted",
  InvalidRequest = "invalid-request",
  InvalidResponse = "invalid-response",
  ResponseTooLarge = "response-too-large",
  Unavailable = "unavailable"
}

export class ControlPlaneTransportError extends Error {
  readonly code: ControlPlaneTransportErrorCode;

  constructor(code: ControlPlaneTransportErrorCode) {
    super(`Control-plane transport ${code}.`);
    this.code = code;
    this.name = "ControlPlaneTransportError";
  }
}

export interface ControlPlaneHttpClientOptions {
  readonly fetch?: typeof fetch;
  readonly maximumResponseBytes?: number;
}

export function createControlPlaneHttpClient(
  endpoint: string | URL,
  options?: ControlPlaneHttpClientOptions
): ControlPlaneService {
  const url = configuredEndpoint(endpoint);
  const fetchPort = configuredFetch(options);
  const maximumBytes = configuredResponseLimit(options);
  const service: ControlPlaneService = {
    commitDocument: (input) =>
      send<ControlPlaneDocumentRevision>(fetchPort, url, input, maximumBytes),
    createBackup: (input) => send<ControlPlaneBackupReceipt>(fetchPort, url, input, maximumBytes),
    invokeEffect: (input, signal) =>
      send<ControlPlaneEffectExecution>(fetchPort, url, input, maximumBytes, signal),
    readDocument: (input) =>
      send<ControlPlaneDocumentRevision>(fetchPort, url, input, maximumBytes),
    restoreBackup: (input) => send<ControlPlaneRestoreReceipt>(fetchPort, url, input, maximumBytes),
    resumeRealtime: (input) => send<ControlPlaneRealtimeBatch>(fetchPort, url, input, maximumBytes)
  };
  return Object.freeze(service);
}

async function send<TValue>(
  fetchPort: typeof fetch,
  endpoint: URL,
  request: WireInput,
  maximumBytes: number,
  signal?: AbortSignal
): Promise<ControlPlaneResult<TValue>> {
  requireValidRequest(request);
  const response = await fetchResponse(fetchPort, endpoint, request, signal);
  return readResponse<TValue>(response, maximumBytes);
}

async function fetchResponse(
  fetchPort: typeof fetch,
  endpoint: URL,
  request: WireInput,
  signal: AbortSignal | undefined
): Promise<Response> {
  try {
    return await fetchPort(endpoint, requestInit(request, signal));
  } catch (error) {
    throw classifiedFetchError(error, signal);
  }
}

function requestInit(request: WireInput, signal: AbortSignal | undefined): RequestInit {
  return {
    body: JSON.stringify(request),
    headers: { "Content-Type": "application/json" },
    method: "POST",
    ...(signal === undefined ? {} : { signal })
  };
}

async function readResponse<TValue>(
  response: Response,
  maximumBytes: number
): Promise<ControlPlaneResult<TValue>> {
  requireJsonResponse(response);
  requireDeclaredResponseSize(response, maximumBytes);
  const decoded = decodeResult(parseResponse(await responseText(response, maximumBytes)));
  if (decoded === undefined) throw invalidResponse();
  requireMatchingStatus(response, decoded);
  return decoded as ControlPlaneResult<TValue>;
}

async function responseText(response: Response, maximumBytes: number): Promise<string> {
  try {
    return await readBoundedBody(response.body, maximumBytes);
  } catch (error) {
    throw classifiedBodyError(error);
  }
}

function parseResponse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function decodeResult(value: unknown): ControlPlaneResult<unknown> | undefined {
  if (!record(value)) return undefined;
  return validResultRecord(value) ? (value as unknown as ControlPlaneResult<unknown>) : undefined;
}

function validResultRecord(value: Record<string, unknown>): boolean {
  const status = value["status"];
  return [
    safeJson(value),
    exactResultKeys(value),
    validStatus(status),
    validStatus(status) ? validResultVariant(value, status) : false
  ].every(Boolean);
}

function validResultVariant(
  value: Record<string, unknown>,
  status: ControlPlaneOperationStatus
): boolean {
  return status === ControlPlaneOperationStatus.Succeeded
    ? validSuccess(value)
    : validFailure(value);
}

function validSuccess(value: Record<string, unknown>): boolean {
  return [Object.hasOwn(value, "value"), !Object.hasOwn(value, "error")].every(Boolean);
}

function validFailure(value: Record<string, unknown>): boolean {
  return [validError(value["error"]), !Object.hasOwn(value, "value")].every(Boolean);
}

function exactResultKeys(value: Record<string, unknown>): boolean {
  return Object.keys(value).every((key) => ["error", "status", "value"].includes(key));
}

function validStatus(value: unknown): value is ControlPlaneOperationStatus {
  return [typeof value === "string", statuses.has(String(value))].every(Boolean);
}

function validError(value: unknown): boolean {
  if (!record(value)) return false;
  return [
    Object.keys(value).every((key) => ["code", "messageKey"].includes(key)),
    knownErrorCode(value["code"]),
    boundedErrorMessage(value["messageKey"])
  ].every(Boolean);
}

function knownErrorCode(value: unknown): boolean {
  return [typeof value === "string", errorCodes.has(String(value))].every(Boolean);
}

function boundedErrorMessage(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return [value.length > 0, value.length <= 256].every(Boolean);
}

function record(value: unknown): value is Record<string, unknown> {
  return [value !== null, typeof value === "object", !Array.isArray(value)].every(Boolean);
}

function requireValidRequest(request: WireInput): void {
  if (decodeControlPlaneRequest(request) !== undefined) return;
  throw new ControlPlaneTransportError(ControlPlaneTransportErrorCode.InvalidRequest);
}

function requireJsonResponse(response: Response): void {
  if (jsonContentType(response.headers.get("content-type"))) return;
  throw invalidResponse();
}

function jsonContentType(value: string | null): boolean {
  if (value === null) return false;
  return value.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}

function requireDeclaredResponseSize(response: Response, maximumBytes: number): void {
  const value = response.headers.get("content-length");
  if (!declaredResponseTooLarge(value, maximumBytes)) return;
  throw new ControlPlaneTransportError(ControlPlaneTransportErrorCode.ResponseTooLarge);
}

function declaredResponseTooLarge(value: string | null, maximumBytes: number): boolean {
  if (value === null) return false;
  const parsed = Number(value);
  return [!/^\d+$/.test(value), !Number.isSafeInteger(parsed), parsed > maximumBytes].some(Boolean);
}

function requireMatchingStatus(response: Response, result: ControlPlaneResult<unknown>): void {
  if (response.status === controlPlaneHttpStatus(result.status)) return;
  throw invalidResponse();
}

function configuredEndpoint(value: string | URL): URL {
  const endpoint = new URL(value);
  if (["https:", "http:"].includes(endpoint.protocol)) return endpoint;
  throw new TypeError("Control-plane endpoint must use HTTP or HTTPS.");
}

function configuredFetch(options: ControlPlaneHttpClientOptions | undefined): typeof fetch {
  return options?.fetch ?? globalThis.fetch;
}

function configuredResponseLimit(options: ControlPlaneHttpClientOptions | undefined): number {
  return configuredBodyLimit(options?.maximumResponseBytes, defaultMaximumResponseBytes);
}

function classifiedFetchError(
  error: unknown,
  signal: AbortSignal | undefined
): ControlPlaneTransportError {
  const code = aborted(error, signal)
    ? ControlPlaneTransportErrorCode.Aborted
    : ControlPlaneTransportErrorCode.Unavailable;
  return new ControlPlaneTransportError(code);
}

function classifiedBodyError(error: unknown): ControlPlaneTransportError {
  const oversized = [
    error instanceof ControlPlaneBodyError,
    error instanceof ControlPlaneBodyError && error.code === ControlPlaneBodyErrorCode.TooLarge
  ].every(Boolean);
  return oversized
    ? new ControlPlaneTransportError(ControlPlaneTransportErrorCode.ResponseTooLarge)
    : invalidResponse();
}

function aborted(error: unknown, signal: AbortSignal | undefined): boolean {
  return [signal?.aborted === true, domAbort(error)].some(Boolean);
}

function domAbort(error: unknown): boolean {
  return error instanceof DOMException ? error.name === "AbortError" : false;
}

function invalidResponse(): ControlPlaneTransportError {
  return new ControlPlaneTransportError(ControlPlaneTransportErrorCode.InvalidResponse);
}

type WireInput =
  | ControlPlaneBackupRequest
  | ControlPlaneCommitDocumentRequest
  | ControlPlaneInvokeEffectRequest
  | ControlPlaneReadDocumentRequest
  | ControlPlaneRestoreRequest
  | ControlPlaneResumeRealtimeRequest;
