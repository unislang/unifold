import { expect, it, vi } from "vitest";

import { query, success } from "./data.test-data.js";
import { invokeDataSource } from "./invocation.js";
import { DataErrorCode, DataResultStatus, type DataFailureResult } from "./types.js";

it("maps adapter exceptions and malformed results without exposing provider details", async () => {
  const controller = new AbortController();
  const thrown = await invokeDataSource(
    async () => {
      throw new Error("secret provider diagnostic");
    },
    query(),
    controller.signal
  );
  const malformed = await invokeDataSource(
    async () => ({ status: DataResultStatus.Success }) as never,
    query(),
    controller.signal
  );

  expect((thrown as DataFailureResult).error.code).toBe(DataErrorCode.AdapterFailure);
  expect(JSON.stringify(thrown)).not.toContain("secret provider diagnostic");
  expect((malformed as DataFailureResult).error.code).toBe(DataErrorCode.AdapterFailure);
});

it("aborts the adapter signal when the invocation times out", async () => {
  vi.useFakeTimers();
  let signal: AbortSignal | undefined;
  const pending = invokeDataSource(
    async (invocation) => {
      signal = invocation.signal;
      await new Promise(() => undefined);
      return success();
    },
    { ...query(), timeoutMs: 5 },
    new AbortController().signal
  );
  await vi.advanceTimersByTimeAsync(5);

  await expect(pending).resolves.toMatchObject({ status: DataResultStatus.Timeout });
  expect(signal?.aborted).toBe(true);
  vi.useRealTimers();
});
