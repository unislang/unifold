#!/usr/bin/env node
import { realpath } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { UnifoldCliStatus } from "./enums.js";
import { runUnifoldCli } from "./runner.js";

export interface UnifoldCliStreams {
  readonly stderr: Pick<NodeJS.WriteStream, "write">;
  readonly stdout: Pick<NodeJS.WriteStream, "write">;
}

export async function runUnifoldCliMain(
  arguments_: readonly string[],
  streams: UnifoldCliStreams = process
): Promise<number> {
  const result = await runUnifoldCli(arguments_);
  const output = `${JSON.stringify(result, null, 2)}\n`;
  if (result.status === UnifoldCliStatus.Succeeded) {
    streams.stdout.write(output);
    return 0;
  }
  streams.stderr.write(output);
  return 1;
}

export async function isUnifoldCliEntry(
  moduleUrl: string,
  entryPath: string | undefined
): Promise<boolean> {
  if (entryPath === undefined) return false;
  try {
    const [modulePath, executablePath] = await Promise.all([
      realpath(fileURLToPath(moduleUrl)),
      realpath(entryPath)
    ]);
    return modulePath === executablePath;
  } catch {
    return false;
  }
}

if (await isUnifoldCliEntry(import.meta.url, process.argv[1])) {
  process.exitCode = await runUnifoldCliMain(process.argv.slice(2));
}
