import { gzipSync } from "node:zlib";
import { resolve } from "node:path";
import { build, normalizePath } from "vite";

import { percentile } from "./profile-statistics.js";
import { mountLionDialogCandidate } from "./dialog-foundation/lion-candidate.js";
import { mountNativeDialogCandidate } from "./dialog-foundation/native-candidate.js";
import { mountSpectrumDialogCandidate } from "./dialog-foundation/spectrum-candidate.js";

const SAMPLE_COUNT = 20;
const STARTUP_LIMIT_MILLISECONDS = 100;
const NATIVE_GZIP_LIMIT_BYTES = 4 * 1024;

export async function measureDialogFoundations() {
  const native = await runtimeProfile(mountNativeDialogCandidate);
  const lion = await runtimeProfile(mountLionDialogCandidate);
  const spectrum = await runtimeProfile(mountSpectrumDialogCandidate);
  const bundles = await bundleEvidence();
  return dialogFoundationEvidence(native, lion, spectrum, bundles);
}

type CandidateMount = (container: HTMLElement) => HTMLElement | Promise<HTMLElement>;

async function runtimeProfile(mount: CandidateMount) {
  await mountAndDispose(mount);
  const samples: number[] = [];
  for (let sample = 0; sample < SAMPLE_COUNT; sample += 1) {
    const started = performance.now();
    await mountAndDispose(mount);
    samples.push(performance.now() - started);
  }
  return {
    p50Milliseconds: percentile(samples, 0.5),
    p95Milliseconds: percentile(samples, 0.95),
    p99Milliseconds: percentile(samples, 0.99),
    sampleCount: samples.length
  };
}

async function mountAndDispose(mount: CandidateMount): Promise<void> {
  const container = document.createElement("main");
  document.body.append(container);
  try {
    await mount(container);
  } finally {
    container.remove();
  }
}

async function bundleEvidence() {
  const [nativeGzipBytes, lionGzipBytes, spectrumGzipBytes] = await Promise.all([
    bundleBytes("native-candidate.ts"),
    bundleBytes("lion-candidate.ts"),
    bundleBytes("spectrum-candidate.ts")
  ]);
  return { lionGzipBytes, nativeGzipBytes, spectrumGzipBytes };
}

async function bundleBytes(fileName: string): Promise<number> {
  const entry = resolve(process.cwd(), "dialog-foundation", fileName);
  const output = await build({
    build: { minify: "esbuild", rollupOptions: { input: normalizePath(entry) }, write: false },
    configFile: false,
    logLevel: "silent"
  });
  if (Array.isArray(output)) throw new Error("Expected one Dialog foundation bundle output.");
  return gzipOutput(output as { output: readonly { code?: string }[] });
}

function gzipOutput(bundle: { output: readonly { code?: string }[] }): number {
  return bundle.output.reduce((total, item) => {
    return item.code === undefined ? total : total + gzipSync(item.code).byteLength;
  }, 0);
}

function dialogFoundationEvidence(
  native: Awaited<ReturnType<typeof runtimeProfile>>,
  lion: Awaited<ReturnType<typeof runtimeProfile>>,
  spectrum: Awaited<ReturnType<typeof runtimeProfile>>,
  bundles: Awaited<ReturnType<typeof bundleEvidence>>
) {
  return {
    candidates: {
      lion: { ...lion, gzipBytes: bundles.lionGzipBytes },
      native: { ...native, gzipBytes: bundles.nativeGzipBytes },
      spectrum: { ...spectrum, gzipBytes: bundles.spectrumGzipBytes }
    },
    decision: "framework-native",
    gate: {
      actualGzipBytes: bundles.nativeGzipBytes,
      actualP95Milliseconds: native.p95Milliseconds,
      limitGzipBytes: NATIVE_GZIP_LIMIT_BYTES,
      limitP95Milliseconds: STARTUP_LIMIT_MILLISECONDS,
      name: "dialog native-foundation selection",
      passed:
        bundles.nativeGzipBytes <= NATIVE_GZIP_LIMIT_BYTES &&
        native.p95Milliseconds <= STARTUP_LIMIT_MILLISECONDS
    }
  };
}
