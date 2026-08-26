import { gzipSync } from "node:zlib";
import { resolve } from "node:path";
import { build, normalizePath } from "vite";

import { percentile } from "./profile-statistics.js";
import {
  FOUNDATION_ROW_COUNT,
  mountNativeCandidate
} from "./data-grid-foundation/native-candidate.js";
import { mountSpectrumCandidate } from "./data-grid-foundation/spectrum-candidate.js";

const SAMPLE_COUNT = 20;
const SPECTRUM_SAMPLE_COUNT = 3;
const STARTUP_LIMIT_MILLISECONDS = 1_000;
const NATIVE_GZIP_LIMIT_BYTES = 16 * 1024;

export async function measureDataGridFoundations() {
  const native = await runtimeProfile("native", mountNativeCandidate);
  const spectrum = await runtimeProfile("spectrum", mountSpectrumCandidate);
  const bundles = {
    nativeGzipBytes: await bundleBytes("native-candidate.ts"),
    spectrumGzipBytes: await bundleBytes("spectrum-candidate.ts")
  };
  return evidence(native, spectrum, bundles);
}

type CandidateMount = (container: HTMLElement) => HTMLElement | Promise<HTMLElement>;

async function runtimeProfile(name: string, mount: CandidateMount) {
  await mountAndDispose(mount);
  const samples: number[] = [];
  const rowCounts: number[] = [];
  const sampleCount = name === "spectrum" ? SPECTRUM_SAMPLE_COUNT : SAMPLE_COUNT;
  for (let sample = 0; sample < sampleCount; sample += 1) {
    const started = performance.now();
    const mounted = await mountAndDispose(mount, false);
    samples.push(performance.now() - started);
    rowCounts.push(countRows(name, mounted.element));
    mounted.container.remove();
  }
  return {
    maximumRenderedRows: Math.max(...rowCounts),
    minimumRenderedRows: Math.min(...rowCounts),
    p50Milliseconds: percentile(samples, 0.5),
    p95Milliseconds: percentile(samples, 0.95),
    p99Milliseconds: percentile(samples, 0.99),
    sampleCount: samples.length
  };
}

async function mountAndDispose(mount: CandidateMount, dispose = true) {
  const container = document.createElement("main");
  document.body.append(container);
  const element = await mount(container);
  if (dispose) container.remove();
  return { container, element };
}

function countRows(name: string, element: HTMLElement): number {
  const selector = name === "native" ? "tbody tr" : "sp-table-row";
  return element.querySelectorAll(selector).length;
}

async function bundleBytes(fileName: string): Promise<number> {
  const entry = resolve(process.cwd(), "data-grid-foundation", fileName);
  const output = await build({
    build: { minify: "esbuild", rollupOptions: { input: normalizePath(entry) }, write: false },
    configFile: false,
    logLevel: "silent"
  });
  if (Array.isArray(output)) throw new Error("Expected one foundation bundle output.");
  const bundle = output as { output: readonly { code?: string }[] };
  return bundle.output.reduce((total, item) => {
    return item.code === undefined ? total : total + gzipSync(item.code).byteLength;
  }, 0);
}

function evidence(
  native: Awaited<ReturnType<typeof runtimeProfile>>,
  spectrum: Awaited<ReturnType<typeof runtimeProfile>>,
  bundles: { nativeGzipBytes: number; spectrumGzipBytes: number }
) {
  return {
    candidates: { native: { ...native, gzipBytes: bundles.nativeGzipBytes }, spectrum },
    decision: {
      lion: "unavailable-no-table-or-grid-component",
      selected: "framework-native",
      spectrum: "available-not-selected"
    },
    gate: foundationGate(native, bundles.nativeGzipBytes),
    spectrumGzipBytes: bundles.spectrumGzipBytes
  };
}

function foundationGate(
  native: Awaited<ReturnType<typeof runtimeProfile>>,
  nativeGzipBytes: number
) {
  const passed = [
    native.p95Milliseconds <= STARTUP_LIMIT_MILLISECONDS,
    native.minimumRenderedRows === FOUNDATION_ROW_COUNT,
    native.maximumRenderedRows === FOUNDATION_ROW_COUNT,
    nativeGzipBytes <= NATIVE_GZIP_LIMIT_BYTES
  ].every(Boolean);
  return {
    actualGzipBytes: nativeGzipBytes,
    actualP95Milliseconds: native.p95Milliseconds,
    actualRenderedRows: native.maximumRenderedRows,
    limitGzipBytes: NATIVE_GZIP_LIMIT_BYTES,
    limitP95Milliseconds: STARTUP_LIMIT_MILLISECONDS,
    name: "data-grid native-foundation selection",
    passed,
    requiredRenderedRows: FOUNDATION_ROW_COUNT
  };
}
