import type { UnifoldCheckboxGroup } from "@unislang/unifold-elements";
import { defineUnifoldCheckboxGroup } from "@unislang/unifold-elements/checkbox-group";

import { percentile } from "./profile-statistics.js";

const GROUP_COUNT = 100;
const OPTION_COUNT = 6;
const PROFILE_SAMPLES = 50;
const PROJECTION_P95_LIMIT_MILLISECONDS = 100;
const OPTIONS = Object.freeze([
  { label: "Product news", value: "news" },
  { label: "Security alerts", value: "security" },
  { label: "Billing updates", value: "billing" },
  { label: "Accessibility research", value: "accessibility" },
  { label: "Community events", value: "events" },
  { disabled: true, label: "Internal planning", value: "internal" }
]);

export async function measureCheckboxGroupProjection() {
  defineUnifoldCheckboxGroup(customElements);
  const fixture = buildFixture();
  document.body.append(fixture.container);
  try {
    await settle(fixture.groups);
    return await runProfile(fixture);
  } finally {
    fixture.container.remove();
  }
}

function buildFixture() {
  const container = document.createElement("div");
  const groups: UnifoldCheckboxGroup[] = [];
  for (let index = 0; index < GROUP_COUNT; index += 1) {
    const group = document.createElement("unifold-checkbox-group") as UnifoldCheckboxGroup;
    configure(group, index);
    container.append(group);
    groups.push(group);
  }
  return { container, groups };
}

function configure(group: UnifoldCheckboxGroup, index: number): void {
  group.id = `topics-${index}`;
  group.label = `Topics ${index}`;
  group.name = `topics-${index}`;
  group.options = OPTIONS;
  group.value = ["news", "security"];
}

async function runProfile(fixture: ReturnType<typeof buildFixture>) {
  const samples: number[] = [];
  for (let sample = 0; sample < PROFILE_SAMPLES; sample += 1) {
    const started = performance.now();
    const value = sample % 2 === 0 ? ["news", "events"] : ["billing", "accessibility"];
    fixture.groups.forEach((group) => (group.value = value));
    await settle(fixture.groups);
    samples.push(performance.now() - started);
  }
  return projectionEvidence(fixture, samples);
}

function settle(groups: readonly UnifoldCheckboxGroup[]): Promise<unknown[]> {
  return Promise.all(groups.map((group) => group.updateComplete));
}

function projectionEvidence(fixture: ReturnType<typeof buildFixture>, samples: readonly number[]) {
  const groupCount = fixture.container.querySelectorAll("unifold-checkbox-group").length;
  const controlCount = nativeControlCount(fixture.groups);
  const finalValue = checkedValues(fixture.groups.at(-1));
  const p95Milliseconds = percentile(samples, 0.95);
  return {
    controlCount,
    finalValue,
    gate: projectionGate(groupCount, controlCount, finalValue, p95Milliseconds),
    groupCount,
    maximumMilliseconds: Math.max(...samples),
    p50Milliseconds: percentile(samples, 0.5),
    p95Milliseconds,
    p99Milliseconds: percentile(samples, 0.99),
    sampleCount: samples.length
  };
}

function projectionGate(
  groupCount: number,
  controlCount: number,
  finalValue: readonly string[],
  p95Milliseconds: number
) {
  const passed = [
    groupCount === GROUP_COUNT,
    controlCount === GROUP_COUNT * OPTION_COUNT,
    equalValues(finalValue, ["billing", "accessibility"]),
    p95Milliseconds <= PROJECTION_P95_LIMIT_MILLISECONDS
  ].every(Boolean);
  return {
    actualControlCount: controlCount,
    actualFinalValue: finalValue,
    actualGroupCount: groupCount,
    actualP95Milliseconds: p95Milliseconds,
    limitP95Milliseconds: PROJECTION_P95_LIMIT_MILLISECONDS,
    name: "100-checkbox-group projection",
    passed
  };
}

function nativeControlCount(groups: readonly UnifoldCheckboxGroup[]): number {
  return groups.reduce((count, group) => count + nativeInputs(group).length, 0);
}

function checkedValues(group: UnifoldCheckboxGroup | undefined): readonly string[] {
  if (group === undefined) return [];
  return nativeInputs(group).flatMap((input) => (input.checked ? [input.value] : []));
}

function nativeInputs(group: UnifoldCheckboxGroup): readonly HTMLInputElement[] {
  return [
    ...(group.shadowRoot?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]') ?? [])
  ];
}

function equalValues(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
