export enum ControlPlaneBodyErrorCode {
  InvalidEncoding = "invalid-encoding",
  TooLarge = "too-large"
}

export class ControlPlaneBodyError extends Error {
  readonly code: ControlPlaneBodyErrorCode;

  constructor(code: ControlPlaneBodyErrorCode) {
    super(`Control-plane body ${code}.`);
    this.code = code;
    this.name = "ControlPlaneBodyError";
  }
}

export async function readBoundedBody(
  body: ReadableStream<Uint8Array> | null,
  maximumBytes: number
): Promise<string> {
  if (body === null) return "";
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const state = { bytes: 0 };
  try {
    return await readChunks(reader, decoder, state, maximumBytes);
  } catch (error) {
    throw classifiedBodyError(error);
  } finally {
    reader.releaseLock();
  }
}

async function readChunks(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  decoder: TextDecoder,
  state: { bytes: number },
  maximumBytes: number
): Promise<string> {
  let decoded = "";
  while (true) {
    const part = await reader.read();
    if (part.done) return decoded + decoder.decode();
    await requireBoundedChunk(reader, state, part.value, maximumBytes);
    decoded += decoder.decode(part.value, { stream: true });
  }
}

async function requireBoundedChunk(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  state: { bytes: number },
  chunk: Uint8Array,
  maximumBytes: number
): Promise<void> {
  state.bytes += chunk.byteLength;
  if (state.bytes <= maximumBytes) return;
  await reader.cancel();
  throw new ControlPlaneBodyError(ControlPlaneBodyErrorCode.TooLarge);
}

function classifiedBodyError(error: unknown): ControlPlaneBodyError {
  if (error instanceof ControlPlaneBodyError) return error;
  return new ControlPlaneBodyError(ControlPlaneBodyErrorCode.InvalidEncoding);
}

export function configuredBodyLimit(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const valid = [Number.isSafeInteger(value), value >= 1024, value <= 16 * 1024 * 1024].every(
    Boolean
  );
  if (!valid) {
    throw new RangeError("Body limit must be an integer from 1024 through 16777216 bytes.");
  }
  return value;
}
