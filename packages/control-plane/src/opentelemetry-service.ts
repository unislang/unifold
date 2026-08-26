import type { ControlPlaneService } from "./service.js";
import {
  ControlPlaneOperationStatus,
  type ControlPlaneAuthenticatedRequest,
  type ControlPlaneResult
} from "./types.js";

export type OpenTelemetryAttributeValue = boolean | number | string;
export type OpenTelemetryAttributes = Readonly<Record<string, OpenTelemetryAttributeValue>>;

export interface OpenTelemetrySpan {
  end(): void;
  recordException(exception: unknown): void;
  setAttribute(name: string, value: OpenTelemetryAttributeValue): this;
  setStatus(status: { readonly code: number; readonly message?: string }): this;
}

export interface OpenTelemetryTracer {
  startSpan(
    name: string,
    options: { readonly attributes: OpenTelemetryAttributes }
  ): OpenTelemetrySpan;
}

export interface OpenTelemetryCounter {
  add(value: number, attributes?: OpenTelemetryAttributes): void;
}

export interface OpenTelemetryHistogram {
  record(value: number, attributes?: OpenTelemetryAttributes): void;
}

export interface OpenTelemetryMeter {
  createCounter(name: string, options: { readonly description: string }): OpenTelemetryCounter;
  createHistogram(
    name: string,
    options: { readonly description: string; readonly unit: string }
  ): OpenTelemetryHistogram;
}

export interface OpenTelemetryControlPlaneOptions {
  readonly meter: OpenTelemetryMeter;
  readonly monotonicNow?: (() => number) | undefined;
  readonly tracer: OpenTelemetryTracer;
}

const spanStatusOk = 1;
const spanStatusError = 2;

/** Instruments the provider-neutral service with the stable OpenTelemetry API shape. */
export function instrumentControlPlaneWithOpenTelemetry(
  service: ControlPlaneService,
  options: OpenTelemetryControlPlaneOptions
): ControlPlaneService {
  const operations = options.meter.createCounter("unifold.control_plane.operations", {
    description: "Completed Unifold control-plane operations."
  });
  const duration = options.meter.createHistogram("unifold.control_plane.duration", {
    description: "Unifold control-plane operation duration.",
    unit: "ms"
  });
  const now = options.monotonicNow ?? (() => performance.now());
  const instrument = <TValue>(
    request: ControlPlaneAuthenticatedRequest,
    invoke: () => Promise<ControlPlaneResult<TValue>>
  ) => instrumentOperation(options.tracer, operations, duration, now, request, invoke);
  const instrumented: ControlPlaneService = {
    commitDocument: (request) => instrument(request, () => service.commitDocument(request)),
    createBackup: (request) => instrument(request, () => service.createBackup(request)),
    invokeEffect: (request, signal) =>
      instrument(request, () => service.invokeEffect(request, signal)),
    readDocument: (request) => instrument(request, () => service.readDocument(request)),
    restoreBackup: (request) => instrument(request, () => service.restoreBackup(request)),
    resumeRealtime: (request) => instrument(request, () => service.resumeRealtime(request))
  };
  return Object.freeze(instrumented);
}

async function instrumentOperation<TValue>(
  tracer: OpenTelemetryTracer,
  operations: OpenTelemetryCounter,
  duration: OpenTelemetryHistogram,
  now: () => number,
  request: ControlPlaneAuthenticatedRequest,
  invoke: () => Promise<ControlPlaneResult<TValue>>
): Promise<ControlPlaneResult<TValue>> {
  const startedAt = now();
  const span = tracer.startSpan(`unifold.control_plane.${request.operation}`, {
    attributes: spanAttributes(request)
  });
  try {
    const result = await invoke();
    recordResult(span, operations, duration, request, result.status, now() - startedAt);
    return result;
  } catch (error) {
    recordUnexpectedFailure(span, operations, duration, request, now() - startedAt);
    throw error;
  } finally {
    span.end();
  }
}

function spanAttributes(request: ControlPlaneAuthenticatedRequest): OpenTelemetryAttributes {
  return Object.freeze({
    "unifold.control_plane.correlation_id": request.correlationId,
    "unifold.control_plane.operation": request.operation,
    "unifold.control_plane.protocol_version": request.protocolVersion,
    "unifold.control_plane.request_id": request.requestId,
    "unifold.control_plane.traceparent_present": request.traceparent !== undefined
  });
}

function metricAttributes(
  request: ControlPlaneAuthenticatedRequest,
  status: ControlPlaneOperationStatus
): OpenTelemetryAttributes {
  return Object.freeze({
    "unifold.control_plane.operation": request.operation,
    "unifold.control_plane.protocol_version": request.protocolVersion,
    "unifold.control_plane.status": status
  });
}

function recordResult(
  span: OpenTelemetrySpan,
  operations: OpenTelemetryCounter,
  duration: OpenTelemetryHistogram,
  request: ControlPlaneAuthenticatedRequest,
  status: ControlPlaneOperationStatus,
  elapsed: number
): void {
  const attributes = metricAttributes(request, status);
  span.setAttribute("unifold.control_plane.status", status);
  span.setStatus({ code: failedStatus(status) ? spanStatusError : spanStatusOk });
  operations.add(1, attributes);
  duration.record(nonnegativeDuration(elapsed), attributes);
}

function recordUnexpectedFailure(
  span: OpenTelemetrySpan,
  operations: OpenTelemetryCounter,
  duration: OpenTelemetryHistogram,
  request: ControlPlaneAuthenticatedRequest,
  elapsed: number
): void {
  const status = ControlPlaneOperationStatus.Unavailable;
  const attributes = metricAttributes(request, status);
  span.setAttribute("unifold.control_plane.status", status);
  span.setStatus({ code: spanStatusError, message: "control-plane operation unavailable" });
  span.recordException({ message: "control-plane operation failed unexpectedly", name: "Error" });
  operations.add(1, attributes);
  duration.record(nonnegativeDuration(elapsed), attributes);
}

function failedStatus(status: ControlPlaneOperationStatus): boolean {
  return [ControlPlaneOperationStatus.Failed, ControlPlaneOperationStatus.Unavailable].includes(
    status
  );
}

function nonnegativeDuration(value: number): number {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}
