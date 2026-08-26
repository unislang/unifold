import type { UnifoldSwitch } from "@unislang/unifold-elements";
import { defineUnifoldSwitch } from "@unislang/unifold-elements/switch";

import { percentile } from "./profile-statistics.js";

const PROFILE_SAMPLES = 50;
const PROJECTION_P95_LIMIT_MILLISECONDS = 100;
const SWITCH_COUNT = 100;

export async function measureSwitchProjection() {
  defineUnifoldSwitch(customElements);
  const fixture = buildFixture();
  document.body.append(fixture.container);
  try {
    await Promise.all(fixture.controls.map((control) => control.updateComplete));
    return await runProfile(fixture);
  } finally {
    fixture.container.remove();
  }
}

function buildFixture() {
  const container = document.createElement("div");
  const controls: UnifoldSwitch[] = [];
  for (let index = 0; index < SWITCH_COUNT; index += 1) {
    const control = document.createElement("unifold-switch") as UnifoldSwitch;
    configure(control, index);
    container.append(control);
    controls.push(control);
  }
  return { container, controls };
}

function configure(control: UnifoldSwitch, index: number): void {
  control.id = `notification-${index}`;
  control.label = `Notification ${index}`;
  control.name = `notification-${index}`;
  control.value = index % 2 === 0;
}

async function runProfile(fixture: ReturnType<typeof buildFixture>) {
  const samples: number[] = [];
  for (let sample = 0; sample < PROFILE_SAMPLES; sample += 1) {
    const started = performance.now();
    fixture.controls.forEach((control, index) => {
      control.value = (sample + index) % 2 === 0;
    });
    await Promise.all(fixture.controls.map((control) => control.updateComplete));
    samples.push(performance.now() - started);
  }
  return projectionEvidence(fixture, samples);
}

function projectionEvidence(fixture: ReturnType<typeof buildFixture>, samples: readonly number[]) {
  const switchCount = fixture.container.querySelectorAll("unifold-switch").length;
  const finalValue = nativeValue(fixture.controls.at(-1));
  const p95Milliseconds = percentile(samples, 0.95);
  return {
    finalValue,
    gate: {
      actualFinalValue: finalValue,
      actualP95Milliseconds: p95Milliseconds,
      actualSwitchCount: switchCount,
      limitP95Milliseconds: PROJECTION_P95_LIMIT_MILLISECONDS,
      name: "100-switch projection",
      passed:
        switchCount === SWITCH_COUNT &&
        finalValue === true &&
        p95Milliseconds <= PROJECTION_P95_LIMIT_MILLISECONDS
    },
    maximumMilliseconds: Math.max(...samples),
    p50Milliseconds: percentile(samples, 0.5),
    p95Milliseconds,
    p99Milliseconds: percentile(samples, 0.99),
    sampleCount: samples.length,
    switchCount
  };
}

function nativeValue(control: UnifoldSwitch | undefined): boolean | undefined {
  if (control === undefined) return undefined;
  return shadowValue(control.shadowRoot);
}

function shadowValue(root: ShadowRoot | null): boolean | undefined {
  if (root === null) return undefined;
  const input = root.querySelector("input");
  return input instanceof HTMLInputElement ? input.checked : undefined;
}
