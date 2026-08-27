import {
  mountUnifoldApplication,
  UnifoldApplicationMountStatus,
  UnifoldApplicationUpdateStatus
} from "@unislang/unifold";
import { queryObjects } from "node:v8";

import { createCompilationDocument } from "./document-compilation-fixture.js";

const LIFECYCLE_MEMORY_GATE_NAME = "20-cycle application lifecycle heap growth";
const LIFECYCLE_MEMORY_CYCLES = 20;
const LIFECYCLE_MEMORY_LIMIT_PERCENT = 2;
export const LIFECYCLE_MEMORY_NODE_COUNT = 500;
const LIFECYCLE_MEMORY_WARMUP_CYCLES = 5;

class LifecycleHeapSentinel {
  readonly kind = "unifold-lifecycle-heap-sentinel";
}

export async function measureLifecycleMemory() {
  const collect = garbageCollector();
  await runLifecycleCycles(LIFECYCLE_MEMORY_WARMUP_CYCLES);
  await taskBoundary();
  collect();
  const baselineHeapBytes = process.memoryUsage().heapUsed;
  let peakHeapBytes = baselineHeapBytes;
  const postCycleHeapBytes: number[] = [];
  await runLifecycleCycles(LIFECYCLE_MEMORY_CYCLES, () => {
    peakHeapBytes = Math.max(peakHeapBytes, process.memoryUsage().heapUsed);
    collect();
    postCycleHeapBytes.push(process.memoryUsage().heapUsed);
  });
  await taskBoundary();
  collect();
  const finalHeapBytes = process.memoryUsage().heapUsed;
  const retainedHeapBytes = Math.max(0, finalHeapBytes - baselineHeapBytes);
  const retainedHeapGrowthPercent = (retainedHeapBytes / baselineHeapBytes) * 100;
  return lifecycleEvidence(
    baselineHeapBytes,
    finalHeapBytes,
    peakHeapBytes,
    postCycleHeapBytes,
    retainedHeapBytes,
    retainedHeapGrowthPercent
  );
}

export async function runLifecycleCycle(sequence: number) {
  const container = document.createElement("main");
  document.body.append(container);
  const mounted = mountUnifoldApplication(lifecycleDocument(sequence, false), container);
  if (mounted.status !== UnifoldApplicationMountStatus.Mounted) {
    container.remove();
    throw new Error("The lifecycle fixture could not mount its reference document.");
  }
  try {
    await settleDom();
    const update = mounted.application.update(lifecycleDocument(sequence, true));
    if (update.status !== UnifoldApplicationUpdateStatus.Applied) {
      throw new Error("The lifecycle fixture could not apply its navigation revision.");
    }
    await settleDom();
    return mounted.application.document.renderOrder.length;
  } finally {
    mounted.application.dispose();
    container.remove();
    await settleDom();
  }
}

async function runLifecycleCycles(count: number, afterCycle: () => void = () => undefined) {
  for (let cycle = 0; cycle < count; cycle += 1) {
    await runLifecycleCycle(cycle + 1);
    afterCycle();
  }
}

function lifecycleDocument(sequence: number, navigated: boolean) {
  const revision = String(sequence * 2 + Number(navigated));
  return createCompilationDocument(LIFECYCLE_MEMORY_NODE_COUNT, revision);
}

function lifecycleEvidence(
  baselineHeapBytes: number,
  finalHeapBytes: number,
  peakHeapBytes: number,
  postCycleHeapBytes: readonly number[],
  retainedHeapBytes: number,
  retainedHeapGrowthPercent: number
) {
  return {
    baselineHeapBytes,
    cycles: LIFECYCLE_MEMORY_CYCLES,
    finalHeapBytes,
    gate: {
      actualGrowthPercent: retainedHeapGrowthPercent,
      limitGrowthPercent: LIFECYCLE_MEMORY_LIMIT_PERCENT,
      name: LIFECYCLE_MEMORY_GATE_NAME,
      passed: retainedHeapGrowthPercent < LIFECYCLE_MEMORY_LIMIT_PERCENT
    },
    nodeCount: LIFECYCLE_MEMORY_NODE_COUNT,
    peakHeapBytes,
    postCycleHeapBytes,
    retainedHeapBytes,
    retainedHeapGrowthPercent,
    warmupCycles: LIFECYCLE_MEMORY_WARMUP_CYCLES
  };
}

function garbageCollector(): () => void {
  const candidate = Reflect.get(globalThis, "gc") as unknown;
  if (typeof candidate !== "function") throw new Error("The profile requires --expose-gc.");
  const collect = candidate as (options: {
    readonly execution: string;
    readonly type: string;
  }) => void;
  return () => {
    collect({ execution: "sync", type: "major" });
    void queryObjects(LifecycleHeapSentinel, { format: "count" });
  };
}

async function settleDom(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await taskBoundary();
}

async function taskBoundary(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}
