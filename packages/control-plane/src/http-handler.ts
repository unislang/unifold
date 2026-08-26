import type { ControlPlaneService } from "./service.js";
import type { ControlPlaneHttpAdmissionPort } from "./http-admission.js";
import {
  ControlPlaneBodyError,
  ControlPlaneBodyErrorCode,
  configuredBodyLimit,
  readBoundedBody
} from "./transport-body.js";
import { decodeControlPlaneRequest, type ControlPlaneWireRequest } from "./transport-validation.js";
import {
  ControlPlaneErrorCode,
  ControlPlaneOperation,
  ControlPlaneOperationStatus,
  type ControlPlaneBackupRequest,
  type ControlPlaneCommitDocumentRequest,
  type ControlPlaneInvokeEffectRequest,
  type ControlPlaneReadDocumentRequest,
  type ControlPlaneRestoreRequest,
  type ControlPlaneResult,
  type ControlPlaneResumeRealtimeRequest
} from "./types.js";

const defaultMaximumRequestBytes = 1024 * 1024;
const defaultPathname = "/v1/control-plane";

export interface ControlPlaneHttpHandlerOptions {
  readonly admission?: ControlPlaneHttpAdmissionPort;
  readonly maximumRequestBytes?: number;
  readonly pathname?: string;
}

export type ControlPlaneHttpHandler = (request: Request) => Promise<Response>;

export function createControlPlaneHttpHandler(
  service: ControlPlaneService,
  options?: ControlPlaneHttpHandlerOptions
): ControlPlaneHttpHandler {
  const pathname = configuredPathname(options?.pathname);
  const maximumBytes = configuredBodyLimit(
    options?.maximumRequestBytes,
    defaultMaximumRequestBytes
  );
  return async (request) =>
    handleRequest(service, request, pathname, maximumBytes, options?.admission);
}

async function handleRequest(
  service: ControlPlaneService,
  request: Request,
  pathname: string,
  maximumBytes: number,
  admission: ControlPlaneHttpAdmissionPort | undefined
): Promise<Response> {
  const rejected = requestRejection(request, pathname, maximumBytes);
  if (rejected !== undefined) return rejected;
  return handleBody(service, request, maximumBytes, admission);
}

async function handleBody(
  service: ControlPlaneService,
  request: Request,
  maximumBytes: number,
  admission: ControlPlaneHttpAdmissionPort | undefined
): Promise<Response> {
  try {
    const text = await readBoundedBody(request.body, maximumBytes);
    const response = await decodeAndDispatch(service, request, admission, text);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}

async function decodeAndDispatch(
  service: ControlPlaneService,
  request: Request,
  admission: ControlPlaneHttpAdmissionPort | undefined,
  text: string
): Promise<Response> {
  const decoded = decodeControlPlaneRequest(parseJson(text));
  if (decoded === undefined) return jsonResponse(invalid(), 400);
  if (!(await admitted(admission, request, decoded))) return jsonResponse(denied(), 403);
  const result = await dispatch(service, decoded, request.signal);
  return jsonResponse(result, controlPlaneHttpStatus(result.status));
}

async function admitted(
  admission: ControlPlaneHttpAdmissionPort | undefined,
  request: Request,
  decoded: ControlPlaneWireRequest
): Promise<boolean> {
  if (admission === undefined) return true;
  try {
    return await admission.admit(request, decoded);
  } catch {
    return false;
  }
}

function dispatch(
  service: ControlPlaneService,
  request: ControlPlaneWireRequest,
  signal: AbortSignal
): Promise<ControlPlaneResult<unknown>> {
  return dispatchers(service, signal)[request.operation](request);
}

function parseJson(text: string): unknown {
  if (text.length === 0) throw new SyntaxError("Empty JSON body.");
  return JSON.parse(text) as unknown;
}

function isJsonContentType(value: string | null): boolean {
  if (value === null) return false;
  return value.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}

function declaredTooLarge(value: string | null, maximumBytes: number): boolean {
  if (value === null) return false;
  const parsed = Number(value);
  return [!/^\d+$/.test(value), !Number.isSafeInteger(parsed), parsed > maximumBytes].some(Boolean);
}

function configuredPathname(value: string | undefined): string {
  const pathname = value ?? defaultPathname;
  const invalidPath = [
    !pathname.startsWith("/"),
    pathname.includes("?"),
    pathname.includes("#")
  ].some(Boolean);
  if (invalidPath) {
    throw new TypeError("Control-plane pathname must be an absolute path without query or hash.");
  }
  return pathname;
}

export function controlPlaneHttpStatus(status: ControlPlaneOperationStatus): number {
  return httpStatuses[status];
}

function invalid(): ControlPlaneResult<never> {
  return failure(ControlPlaneOperationStatus.Invalid, ControlPlaneErrorCode.InvalidRequest);
}

function denied(): ControlPlaneResult<never> {
  return failure(ControlPlaneOperationStatus.Denied, ControlPlaneErrorCode.AuthorizationDenied);
}

function requestRejection(
  request: Request,
  pathname: string,
  maximumBytes: number
): Response | undefined {
  const guards = [
    routeRejection(request, pathname),
    methodRejection(request),
    mediaTypeRejection(request),
    sizeRejection(request, maximumBytes)
  ];
  return guards.find((response) => response !== undefined);
}

function routeRejection(request: Request, pathname: string): Response | undefined {
  return new URL(request.url).pathname === pathname ? undefined : jsonResponse(invalid(), 404);
}

function methodRejection(request: Request): Response | undefined {
  return request.method === "POST" ? undefined : jsonResponse(invalid(), 405, { Allow: "POST" });
}

function mediaTypeRejection(request: Request): Response | undefined {
  return isJsonContentType(request.headers.get("content-type"))
    ? undefined
    : jsonResponse(invalid(), 415);
}

function sizeRejection(request: Request, maximumBytes: number): Response | undefined {
  return declaredTooLarge(request.headers.get("content-length"), maximumBytes)
    ? jsonResponse(invalid(), 413)
    : undefined;
}

function errorResponse(error: unknown): Response {
  const known = [bodyErrorResponse(error), syntaxErrorResponse(error)].find(
    (response) => response !== undefined
  );
  return known ?? jsonResponse(unavailable(), 503);
}

function bodyErrorResponse(error: unknown): Response | undefined {
  if (!(error instanceof ControlPlaneBodyError)) return undefined;
  const status = error.code === ControlPlaneBodyErrorCode.TooLarge ? 413 : 400;
  return jsonResponse(invalid(), status);
}

function syntaxErrorResponse(error: unknown): Response | undefined {
  return error instanceof SyntaxError ? jsonResponse(invalid(), 400) : undefined;
}

type Dispatcher = (request: ControlPlaneWireRequest) => Promise<ControlPlaneResult<unknown>>;

function dispatchers(
  service: ControlPlaneService,
  signal: AbortSignal
): Readonly<Record<ControlPlaneOperation, Dispatcher>> {
  return {
    [ControlPlaneOperation.BackupCreate]: (request) =>
      service.createBackup(request as ControlPlaneBackupRequest),
    [ControlPlaneOperation.BackupRestore]: (request) =>
      service.restoreBackup(request as ControlPlaneRestoreRequest),
    [ControlPlaneOperation.DocumentCommit]: (request) =>
      service.commitDocument(request as ControlPlaneCommitDocumentRequest),
    [ControlPlaneOperation.DocumentRead]: (request) =>
      service.readDocument(request as ControlPlaneReadDocumentRequest),
    [ControlPlaneOperation.EffectInvoke]: (request) =>
      service.invokeEffect(request as ControlPlaneInvokeEffectRequest, signal),
    [ControlPlaneOperation.RealtimeResume]: (request) =>
      service.resumeRealtime(request as ControlPlaneResumeRealtimeRequest)
  };
}

const httpStatuses: Readonly<Record<ControlPlaneOperationStatus, number>> = Object.freeze({
  [ControlPlaneOperationStatus.Conflict]: 409,
  [ControlPlaneOperationStatus.Denied]: 403,
  [ControlPlaneOperationStatus.Failed]: 502,
  [ControlPlaneOperationStatus.Gap]: 409,
  [ControlPlaneOperationStatus.Invalid]: 400,
  [ControlPlaneOperationStatus.NotFound]: 404,
  [ControlPlaneOperationStatus.Succeeded]: 200,
  [ControlPlaneOperationStatus.Unavailable]: 503
});

function unavailable(): ControlPlaneResult<never> {
  return failure(
    ControlPlaneOperationStatus.Unavailable,
    ControlPlaneErrorCode.TransportUnavailable
  );
}

function failure(status: ControlPlaneOperationStatus, code: ControlPlaneErrorCode) {
  return { error: { code, messageKey: `control-plane.${code}` }, status } as const;
}

function jsonResponse(
  result: ControlPlaneResult<unknown>,
  status: number,
  extraHeaders?: Readonly<Record<string, string>>
): Response {
  return new Response(JSON.stringify(result), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders
    },
    status
  });
}
