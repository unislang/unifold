import type { UnifoldDateField } from "@unislang/unifold-elements";
import { defineUnifoldDateField } from "@unislang/unifold-elements/date-field";

import { percentile } from "./profile-statistics.js";

const DATE_FIELD_COUNT = 100;
const PROFILE_SAMPLES = 50;
const PROJECTION_P95_LIMIT_MILLISECONDS = 100;
const FIRST_DATE = "2026-09-03";
const SECOND_DATE = "2026-10-15";

export async function measureDateFieldProjection() {
  defineUnifoldDateField(customElements);
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
  const fields: UnifoldDateField[] = [];
  for (let index = 0; index < DATE_FIELD_COUNT; index += 1) {
    const field = document.createElement("unifold-date-field") as UnifoldDateField;
    configure(field, index);
    container.append(field);
    fields.push(field);
  }
  return { container, fields };
}

function configure(field: UnifoldDateField, index: number): void {
  field.id = `start-date-${index}`;
  field.label = `Start date ${index}`;
  field.max = "2027-12-31";
  field.min = "2025-01-01";
  field.name = `startDate-${index}`;
  field.step = 1;
  field.value = index % 2 === 0 ? FIRST_DATE : SECOND_DATE;
}

async function runProfile(fixture: ReturnType<typeof buildFixture>) {
  const samples: number[] = [];
  for (let sample = 0; sample < PROFILE_SAMPLES; sample += 1) {
    const started = performance.now();
    fixture.fields.forEach((field, index) => {
      field.value = (sample + index) % 2 === 0 ? SECOND_DATE : FIRST_DATE;
    });
    await Promise.all(fixture.fields.map((field) => field.updateComplete));
    samples.push(performance.now() - started);
  }
  return projectionEvidence(fixture, samples);
}

function projectionEvidence(fixture: ReturnType<typeof buildFixture>, samples: readonly number[]) {
  const fieldCount = fixture.container.querySelectorAll("unifold-date-field").length;
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
      name: "100-date-field projection",
      passed:
        fieldCount === DATE_FIELD_COUNT &&
        finalValue === SECOND_DATE &&
        p95Milliseconds <= PROJECTION_P95_LIMIT_MILLISECONDS
    },
    maximumMilliseconds: Math.max(...samples),
    p50Milliseconds: percentile(samples, 0.5),
    p95Milliseconds,
    p99Milliseconds: percentile(samples, 0.99),
    sampleCount: samples.length
  };
}

function nativeValue(field: UnifoldDateField | undefined): string | undefined {
  if (field === undefined) return undefined;
  return shadowValue(field.shadowRoot);
}

function shadowValue(root: ShadowRoot | null): string | undefined {
  if (root === null) return undefined;
  const input = root.querySelector("input");
  return input instanceof HTMLInputElement ? input.value : undefined;
}
