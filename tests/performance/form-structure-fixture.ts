import type { UnifoldErrorSummary } from "@unislang/unifold-elements";
import { defineUnifoldErrorSummary } from "@unislang/unifold-elements/form-structure";

import { percentile } from "./profile-statistics.js";

const ERROR_COUNT = 100;
const PROFILE_SAMPLES = 50;
const PROJECTION_P95_LIMIT_MILLISECONDS = 100;

interface ErrorSummaryItem {
  readonly [key: string]: string;
  readonly message: string;
  readonly targetId: string;
}

export async function measureErrorSummaryProjection() {
  defineUnifoldErrorSummary(customElements);
  const element = document.createElement("unifold-error-summary") as UnifoldErrorSummary;
  element.id = "error-summary-profile";
  document.body.append(element);
  try {
    return await runProfile(element);
  } finally {
    element.remove();
  }
}

async function runProfile(element: UnifoldErrorSummary) {
  const samples: number[] = [];
  for (let sample = 0; sample < PROFILE_SAMPLES; sample += 1) {
    const started = performance.now();
    element.errors = representativeErrors(sample);
    await element.updateComplete;
    samples.push(performance.now() - started);
  }
  return projectionEvidence(element, samples);
}

function projectionEvidence(element: UnifoldErrorSummary, samples: readonly number[]) {
  const linkCount = errorLinkCount(element);
  const p95Milliseconds = percentile(samples, 0.95);
  return {
    errorCount: ERROR_COUNT,
    gate: {
      actualLinkCount: linkCount,
      actualP95Milliseconds: p95Milliseconds,
      limitP95Milliseconds: PROJECTION_P95_LIMIT_MILLISECONDS,
      name: "100-error summary projection",
      passed: projectionPassed(linkCount, p95Milliseconds)
    },
    maximumMilliseconds: Math.max(...samples),
    p50Milliseconds: percentile(samples, 0.5),
    p95Milliseconds,
    p99Milliseconds: percentile(samples, 0.99),
    sampleCount: samples.length
  };
}

function errorLinkCount(element: UnifoldErrorSummary): number {
  const root = element.shadowRoot;
  if (root === null) return 0;
  return root.querySelectorAll("a").length;
}

function projectionPassed(linkCount: number, p95Milliseconds: number): boolean {
  return linkCount === ERROR_COUNT && p95Milliseconds <= PROJECTION_P95_LIMIT_MILLISECONDS;
}

function representativeErrors(sample: number): readonly ErrorSummaryItem[] {
  return Array.from({ length: ERROR_COUNT }, (_, index) => ({
    message: `Correct field ${index} at sample ${sample}`,
    targetId: `field-${index}`
  }));
}
