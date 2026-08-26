import type { UnifoldSearchField } from "@unislang/unifold-elements";
import { defineUnifoldSearchField } from "@unislang/unifold-elements/search-field";

import { percentile } from "./profile-statistics.js";

const FIELD_COUNT = 100;
const PROFILE_SAMPLES = 50;
const PROJECTION_P95_LIMIT_MILLISECONDS = 100;

export async function measureSearchFieldProjection() {
  defineUnifoldSearchField(customElements);
  const fixture = buildFixture();
  document.body.append(fixture.container);
  try {
    await settle(fixture.fields);
    return await runProfile(fixture);
  } finally {
    fixture.container.remove();
  }
}

function buildFixture() {
  const container = document.createElement("div");
  const fields: UnifoldSearchField[] = [];
  for (let index = 0; index < FIELD_COUNT; index += 1) {
    const field = document.createElement("unifold-search-field") as UnifoldSearchField;
    configure(field, index);
    container.append(field);
    fields.push(field);
  }
  return { container, fields };
}

function configure(field: UnifoldSearchField, index: number): void {
  field.id = `search-${index}`;
  field.label = `Search ${index}`;
  field.name = `search-${index}`;
  field.value = `initial-${index}`;
}

async function runProfile(fixture: ReturnType<typeof buildFixture>) {
  const samples: number[] = [];
  for (let sample = 0; sample < PROFILE_SAMPLES; sample += 1) {
    const started = performance.now();
    fixture.fields.forEach((field, index) => (field.value = `query-${sample}-${index}`));
    await settle(fixture.fields);
    samples.push(performance.now() - started);
  }
  return projectionEvidence(fixture, samples);
}

function settle(fields: readonly UnifoldSearchField[]): Promise<unknown[]> {
  return Promise.all(fields.map((field) => field.updateComplete));
}

function projectionEvidence(fixture: ReturnType<typeof buildFixture>, samples: readonly number[]) {
  const fieldCount = fixture.container.querySelectorAll("unifold-search-field").length;
  const finalValue = nativeValue(fixture.fields);
  const p95Milliseconds = percentile(samples, 0.95);
  return {
    fieldCount,
    finalValue,
    gate: {
      actualFieldCount: fieldCount,
      actualFinalValue: finalValue,
      actualP95Milliseconds: p95Milliseconds,
      limitP95Milliseconds: PROJECTION_P95_LIMIT_MILLISECONDS,
      name: "100-search-field projection",
      passed:
        fieldCount === FIELD_COUNT &&
        finalValue === "query-49-99" &&
        p95Milliseconds <= PROJECTION_P95_LIMIT_MILLISECONDS
    },
    maximumMilliseconds: Math.max(...samples),
    p50Milliseconds: percentile(samples, 0.5),
    p95Milliseconds,
    p99Milliseconds: percentile(samples, 0.99),
    sampleCount: samples.length
  };
}

function nativeValue(fields: readonly UnifoldSearchField[]): string {
  const input = nativeInput(fields.at(-1));
  if (!(input instanceof HTMLInputElement)) throw new Error("Final search input is missing.");
  return input.value;
}

function nativeInput(field: UnifoldSearchField | undefined): Element | null {
  if (field === undefined) return null;
  return field.shadowRoot === null ? null : field.shadowRoot.querySelector("input");
}
