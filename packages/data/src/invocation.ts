import {
  DataErrorCode,
  DataResultStatus,
  type DataFailureResult,
  type DataRequest,
  type DataResult,
  type DataSourceHandler
} from "./types.js";
import { isDataResult } from "./validation.js";

export async function invokeDataSource(
  handler: DataSourceHandler,
  request: DataRequest,
  parentSignal: AbortSignal
): Promise<DataResult> {
  if (parentSignal.aborted) return canceled();
  return invokeActiveDataSource(handler, request, parentSignal);
}

async function invokeActiveDataSource(
  handler: DataSourceHandler,
  request: DataRequest,
  parentSignal: AbortSignal
): Promise<DataResult> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  parentSignal.addEventListener("abort", abort, { once: true });
  try {
    const result = await withTimeout(
      handler({ request, signal: controller.signal }),
      request.timeoutMs,
      controller
    );
    return normalizeResult(result);
  } catch {
    return invocationFailure(parentSignal);
  } finally {
    parentSignal.removeEventListener("abort", abort);
  }
}

function normalizeResult(result: unknown): DataResult {
  if (isDataResult(result)) return result;
  return failure(
    DataResultStatus.Unavailable,
    DataErrorCode.AdapterFailure,
    "data.adapterInvalidResult"
  );
}

function invocationFailure(signal: AbortSignal): DataFailureResult {
  if (signal.aborted) return canceled();
  return failure(DataResultStatus.Unavailable, DataErrorCode.AdapterFailure, "data.adapterFailure");
}

async function withTimeout(
  task: Promise<DataResult>,
  timeoutMs: number | undefined,
  controller: AbortController
): Promise<DataResult> {
  if (timeoutMs === undefined) return task;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<DataResult>((resolve) => {
    timer = setTimeout(() => {
      resolve(failure(DataResultStatus.Timeout, DataErrorCode.Timeout, "data.timeout"));
      controller.abort();
    }, timeoutMs);
  });
  try {
    return await Promise.race([task, timeout, aborted(controller.signal)]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function aborted(signal: AbortSignal): Promise<DataFailureResult> {
  return new Promise((resolve) => {
    if (signal.aborted) resolve(canceled());
    else signal.addEventListener("abort", () => resolve(canceled()), { once: true });
  });
}

function failure(
  status: DataFailureResult["status"],
  code: DataErrorCode,
  messageKey: string
): DataFailureResult {
  return { error: { code, messageKey }, status };
}

function canceled(): DataFailureResult {
  return failure(DataResultStatus.Canceled, DataErrorCode.Canceled, "data.canceled");
}
