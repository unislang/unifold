import { expect, it, vi } from "vitest";

import { metadata } from "./control-plane.test-data.js";
import {
  instrumentControlPlaneWithOpenTelemetry,
  type OpenTelemetryAttributes,
  type OpenTelemetryCounter,
  type OpenTelemetryHistogram,
  type OpenTelemetryMeter,
  type OpenTelemetrySpan
} from "./opentelemetry-service.js";
import type { ControlPlaneService } from "./service.js";
import {
  ControlPlaneOperation,
  ControlPlaneOperationStatus,
  ControlPlaneProtocolVersion
} from "./types.js";

it("records allowlisted span and low-cardinality metric attributes", async () => {
  const fixture = telemetryFixture();
  const service = instrumentControlPlaneWithOpenTelemetry(stubService(), fixture.options);
  const request = {
    ...metadata(ControlPlaneOperation.DocumentRead),
    objectId: "private-document",
    sessionToken: "private-session"
  };
  await expect(service.readDocument(request)).resolves.toEqual({
    status: ControlPlaneOperationStatus.NotFound
  });

  expect(fixture.startSpan).toHaveBeenCalledWith("unifold.control_plane.document.read", {
    attributes: {
      "unifold.control_plane.correlation_id": "correlation-1",
      "unifold.control_plane.operation": "document.read",
      "unifold.control_plane.protocol_version": ControlPlaneProtocolVersion.Version1,
      "unifold.control_plane.request_id": "request-1",
      "unifold.control_plane.traceparent_present": true
    }
  });
  expect(fixture.add).toHaveBeenCalledWith(1, metricAttributes("not-found"));
  expect(fixture.record).toHaveBeenCalledWith(7, metricAttributes("not-found"));
  expect(JSON.stringify(fixture)).not.toContain("private-document");
  expect(JSON.stringify(fixture)).not.toContain("private-session");
  expect(fixture.end).toHaveBeenCalledOnce();
});

it("redacts unexpected exceptions from telemetry and rethrows to the caller", async () => {
  const fixture = telemetryFixture();
  const privateError = new Error("database password is secret");
  const service = instrumentControlPlaneWithOpenTelemetry(
    { ...stubService(), createBackup: async () => Promise.reject(privateError) },
    fixture.options
  );
  await expect(
    service.createBackup({ ...metadata(ControlPlaneOperation.BackupCreate) })
  ).rejects.toBe(privateError);
  expect(fixture.exception).toHaveBeenCalledWith({
    message: "control-plane operation failed unexpectedly",
    name: "Error"
  });
  expect(JSON.stringify(fixture.exception.mock.calls)).not.toContain("database password");
  expect(fixture.status).toHaveBeenLastCalledWith({
    code: 2,
    message: "control-plane operation unavailable"
  });
  expect(fixture.end).toHaveBeenCalledOnce();
});

function telemetryFixture() {
  const add = vi.fn<OpenTelemetryCounter["add"]>();
  const record = vi.fn<OpenTelemetryHistogram["record"]>();
  const spans = telemetrySpan();
  const startSpan = vi.fn(() => spans.span);
  const meter: OpenTelemetryMeter = {
    createCounter: () => ({ add }),
    createHistogram: () => ({ record })
  };
  const ticks = [10, 17];
  return {
    add,
    ...spans,
    options: { meter, monotonicNow: () => ticks.shift() ?? 17, tracer: { startSpan } },
    record,
    startSpan
  };
}

function telemetrySpan() {
  const end = vi.fn<OpenTelemetrySpan["end"]>();
  const exception = vi.fn<OpenTelemetrySpan["recordException"]>();
  const setAttribute = vi.fn<OpenTelemetrySpan["setAttribute"]>(function () {
    return span;
  });
  const status = vi.fn<OpenTelemetrySpan["setStatus"]>(function () {
    return span;
  });
  const span: OpenTelemetrySpan = {
    end,
    recordException: exception,
    setAttribute,
    setStatus: status
  };
  return { end, exception, span, status };
}

function metricAttributes(status: string): OpenTelemetryAttributes {
  return {
    "unifold.control_plane.operation": ControlPlaneOperation.DocumentRead,
    "unifold.control_plane.protocol_version": ControlPlaneProtocolVersion.Version1,
    "unifold.control_plane.status": status
  };
}

function stubService(): ControlPlaneService {
  const unavailable = async () => ({ status: ControlPlaneOperationStatus.Unavailable as const });
  return {
    commitDocument: unavailable,
    createBackup: unavailable,
    invokeEffect: unavailable,
    readDocument: async () => ({ status: ControlPlaneOperationStatus.NotFound }),
    restoreBackup: unavailable,
    resumeRealtime: unavailable
  };
}
