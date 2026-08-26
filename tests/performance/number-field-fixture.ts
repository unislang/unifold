import type { UnifoldNumberField } from "@unislang/unifold-elements";
import { defineUnifoldNumberField } from "@unislang/unifold-elements/number-field";

import { percentile } from "./profile-statistics.js";

const FIELD_COUNT = 100;
const PROFILE_SAMPLES = 50;
const PROJECTION_P95_LIMIT_MILLISECONDS = 100;

export async function measureNumberFieldProjection() {
  defineUnifoldNumberField(customElements);
  const fixture = buildFixture();
  document.body.append(fixture.container);
  try {
    await Promise.all(fixture.fields.map((field) => field.updateComplete));
    return await runProfile(fixture);
  } finally {
    fixture.container.remove();
  }
}

function buildFixture() {
  const container = document.createElement("div");
  const fields: UnifoldNumberField[] = [];
  for (let index = 0; index < FIELD_COUNT; index += 1) {
    const field = document.createElement("unifold-number-field") as UnifoldNumberField;
    configure(field, index);
    container.append(field);
    fields.push(field);
  }
  return { container, fields };
}

function configure(field: UnifoldNumberField, index: number): void {
  field.id = `quantity-${index}`;
  field.label = `Quantity ${index}`;
  field.max = 1_000;
  field.min = 0;
  field.name = `quantity-${index}`;
  field.step = 0.5;
  field.value = index;
}

async function runProfile(fixture: ReturnType<typeof buildFixture>) {
  const samples: number[] = [];
  for (let sample = 0; sample < PROFILE_SAMPLES; sample += 1) {
    const started = performance.now();
    fixture.fields.forEach((field, index) => (field.value = index + sample / 2));
    await Promise.all(fixture.fields.map((field) => field.updateComplete));
    samples.push(performance.now() - started);
  }
  return projectionEvidence(fixture, samples);
}

function projectionEvidence(fixture: ReturnType<typeof buildFixture>, samples: readonly number[]) {
  const fieldCount = fixture.container.querySelectorAll("unifold-number-field").length;
  const finalValue = nativeValue(fixture.fields.at(-1));
  const p95Milliseconds = percentile(samples, 0.95);
  return {
    fieldCount,
    finalValue,
    gate: {
      actualFieldCount: fieldCount,
      actualFinalValue: finalValue,
      actualP95Milliseconds: p95Milliseconds,
      limitP95Milliseconds: PROJECTION_P95_LIMIT_MILLISECONDS,
      name: "100-number-field projection",
      passed: fieldCount === FIELD_COUNT && finalValue === 123.5 && p95Milliseconds <= 100
    },
    maximumMilliseconds: Math.max(...samples),
    p50Milliseconds: percentile(samples, 0.5),
    p95Milliseconds,
    p99Milliseconds: percentile(samples, 0.99),
    sampleCount: samples.length
  };
}

function nativeValue(field: UnifoldNumberField | undefined): number | undefined {
  if (field === undefined) return undefined;
  return shadowNumberValue(field.shadowRoot);
}

function shadowNumberValue(root: ShadowRoot | null): number | undefined {
  if (root === null) return undefined;
  return inputNumberValue(root.querySelector("input"));
}

function inputNumberValue(input: Element | null): number | undefined {
  return input instanceof HTMLInputElement ? input.valueAsNumber : undefined;
}
