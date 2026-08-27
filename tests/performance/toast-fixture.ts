import { ToastStatus, ToastVariant } from "@unislang/unifold-catalog";
import type { UnifoldToast } from "@unislang/unifold-elements";
import { defineUnifoldToast } from "@unislang/unifold-elements/toast";

import { percentile } from "./profile-statistics.js";

const TOAST_COUNT = 100;
const PROFILE_SAMPLES = 50;
const PROJECTION_P95_LIMIT_MILLISECONDS = 100;
const FIRST_MESSAGE = "Profile changes are ready.";
const SECOND_MESSAGE = "Profile changes were saved.";

export async function measureToastProjection() {
  defineUnifoldToast(customElements);
  const fixture = buildFixture();
  document.body.append(fixture.container);
  try {
    await settle(fixture.toasts);
    return await runProfile(fixture);
  } finally {
    fixture.container.remove();
  }
}

function buildFixture() {
  const container = document.createElement("div");
  const toasts: UnifoldToast[] = [];
  for (let index = 0; index < TOAST_COUNT; index += 1) {
    const toast = document.createElement("unifold-toast") as UnifoldToast;
    configure(toast, index);
    container.append(toast);
    toasts.push(toast);
  }
  return { container, toasts };
}

function configure(toast: UnifoldToast, index: number): void {
  toast.id = `toast-${index}`;
  toast.dismissible = index % 2 === 0;
  toast.dismissLabel = `Dismiss notification ${index}`;
  toast.label = `Profile notification ${index}`;
  toast.message = initialMessage(index);
  toast.status = initialStatus(index);
  toast.variant = initialVariant(index);
}

function initialMessage(index: number): string {
  return index % 2 === 0 ? FIRST_MESSAGE : SECOND_MESSAGE;
}

function initialStatus(index: number): ToastStatus {
  return index % 2 === 0 ? ToastStatus.Success : ToastStatus.Warning;
}

function initialVariant(index: number): ToastVariant {
  return index % 2 === 0 ? ToastVariant.Subtle : ToastVariant.Solid;
}

async function runProfile(fixture: ReturnType<typeof buildFixture>) {
  const samples: number[] = [];
  for (let sample = 0; sample < PROFILE_SAMPLES; sample += 1) {
    const started = performance.now();
    fixture.toasts.forEach((toast, index) => updateToast(toast, sample + index));
    await settle(fixture.toasts);
    samples.push(performance.now() - started);
  }
  return projectionEvidence(fixture, samples);
}

function updateToast(toast: UnifoldToast, index: number): void {
  toast.message = index % 2 === 0 ? SECOND_MESSAGE : FIRST_MESSAGE;
  toast.status = index % 2 === 0 ? ToastStatus.Error : ToastStatus.Info;
}

async function settle(toasts: readonly UnifoldToast[]): Promise<void> {
  await Promise.all(toasts.map((toast) => toast.updateComplete));
}

function projectionEvidence(fixture: ReturnType<typeof buildFixture>, samples: readonly number[]) {
  const toastCount = fixture.container.querySelectorAll("unifold-toast").length;
  const final = finalToastEvidence(fixture.toasts.at(-1));
  const p95Milliseconds = percentile(samples, 0.95);
  return {
    ...final,
    gate: projectionGate(toastCount, final, p95Milliseconds),
    maximumMilliseconds: Math.max(...samples),
    p50Milliseconds: percentile(samples, 0.5),
    p95Milliseconds,
    p99Milliseconds: percentile(samples, 0.99),
    sampleCount: samples.length,
    toastCount
  };
}

function projectionGate(
  toastCount: number,
  final: ReturnType<typeof finalToastEvidence>,
  p95Milliseconds: number
) {
  return {
    actualFinalMessage: final.finalMessage,
    actualFinalRole: final.finalRole,
    actualP95Milliseconds: p95Milliseconds,
    actualToastCount: toastCount,
    limitP95Milliseconds: PROJECTION_P95_LIMIT_MILLISECONDS,
    name: "100-toast projection",
    passed: [
      toastCount === TOAST_COUNT,
      final.finalMessage === SECOND_MESSAGE,
      final.finalRole === "alert",
      p95Milliseconds <= PROJECTION_P95_LIMIT_MILLISECONDS
    ].every(Boolean)
  };
}

function finalToastEvidence(toast: UnifoldToast | undefined) {
  const root = toastRoot(toast);
  return {
    finalMessage: elementText(shadowElement(root, "[part=message]")),
    finalRole: elementAttribute(shadowElement(root, "[part=announcement]"), "role")
  };
}

function toastRoot(toast: UnifoldToast | undefined): ShadowRoot | null {
  return toast === undefined ? null : toast.shadowRoot;
}

function shadowElement(root: ShadowRoot | null, selector: string): Element | null {
  return root === null ? null : root.querySelector(selector);
}

function elementText(element: Element | null): string | null {
  return element === null ? null : element.textContent;
}

function elementAttribute(element: Element | null, name: string): string | null {
  return element === null ? null : element.getAttribute(name);
}
