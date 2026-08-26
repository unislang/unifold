import { expect, it } from "vitest";

import {
  configuredBodyLimit,
  ControlPlaneBodyErrorCode,
  readBoundedBody
} from "./transport-body.js";

it("reads chunked UTF-8 without splitting multibyte characters", async () => {
  const bytes = new TextEncoder().encode("{”value”:”✓”}");
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes.slice(0, bytes.length - 2));
      controller.enqueue(bytes.slice(bytes.length - 2));
      controller.close();
    }
  });
  await expect(readBoundedBody(stream, bytes.length)).resolves.toBe("{”value”:”✓”}");
});

it("rejects a stream immediately after its byte budget is exceeded", async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(1025));
    }
  });
  await expect(readBoundedBody(stream, 1024)).rejects.toMatchObject({
    code: ControlPlaneBodyErrorCode.TooLarge
  });
});

it("rejects invalid UTF-8 and invalid configured limits", async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([0xff]));
      controller.close();
    }
  });
  await expect(readBoundedBody(stream, 1024)).rejects.toMatchObject({
    code: ControlPlaneBodyErrorCode.InvalidEncoding
  });
  expect(() => configuredBodyLimit(100, 1024)).toThrow(RangeError);
  expect(configuredBodyLimit(undefined, 1024)).toBe(1024);
});
