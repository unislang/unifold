import {
  NativeFormControlController,
  NativeFormValueOrigin,
  booleanFormValueAdapter,
  createStringArrayFormValueAdapter,
  type NativeFormControlHost,
  type NativeFormControlInternals,
  type NativeFormSubmissionValue
} from "@unislang/unifold-elements";

import { percentile } from "./profile-statistics.js";

const CONTROL_COUNT = 100;
const FORM_ENTRY_COUNT = 150;
const PROFILE_SAMPLES = 50;
const P95_LIMIT_MILLISECONDS = 8;
const options = [
  { label: "Alpha", value: "a" },
  { label: "Beta", value: "b" }
];

interface ProfileControl {
  readonly changeCount: () => number;
  readonly input: VoidFunction;
  readonly reset: VoidFunction;
  readonly restore: VoidFunction;
  readonly submissionCount: () => number;
}

export function measureNativeFormLifecycle(sampleCount = PROFILE_SAMPLES) {
  const controls = createControls();
  const samples = Array.from({ length: sampleCount }, () => measureSample(controls));
  const p95Milliseconds = percentile(samples, 0.95);
  const formEntryCount = measureInputEntries(controls);
  const changeCount = controls.reduce((count, control) => count + control.changeCount(), 0);
  return lifecycleEvidence(samples, p95Milliseconds, formEntryCount, changeCount, sampleCount);
}

function measureInputEntries(controls: readonly ProfileControl[]): number {
  controls.forEach(({ input }) => input());
  const entries = controls.reduce((count, control) => count + control.submissionCount(), 0);
  controls.forEach(({ reset }) => reset());
  return entries;
}

function measureSample(controls: readonly ProfileControl[]): number {
  const started = performance.now();
  controls.forEach(({ input }) => input());
  controls.forEach(({ reset }) => reset());
  controls.forEach(({ restore }) => restore());
  const duration = performance.now() - started;
  controls.forEach(({ reset }) => reset());
  return duration;
}

function createControls(): readonly ProfileControl[] {
  return Array.from({ length: CONTROL_COUNT }, (_, index) =>
    index % 2 === 0 ? booleanControl(index) : repeatedControl(index)
  );
}

function booleanControl(index: number): ProfileControl {
  const fixture = createFixture(false, `boolean-${index}`, booleanFormValueAdapter);
  return {
    changeCount: fixture.changeCount,
    input: () => fixture.controller.commitInput(true),
    reset: () => fixture.controller.formResetCallback(),
    restore: () =>
      fixture.controller.formStateRestoreCallback("true", NativeFormValueOrigin.Restore),
    submissionCount: fixture.submissionCount
  };
}

function repeatedControl(index: number): ProfileControl {
  const adapter = createStringArrayFormValueAdapter(() => options);
  const fixture = createFixture<readonly string[]>(["a"], `repeated-${index}`, adapter);
  return {
    changeCount: fixture.changeCount,
    input: () => fixture.controller.commitInput(["a", "b"]),
    reset: () => fixture.controller.formResetCallback(),
    restore: () =>
      fixture.controller.formStateRestoreCallback('["a","b"]', NativeFormValueOrigin.Restore),
    submissionCount: fixture.submissionCount
  };
}

function createFixture<Value>(
  initialValue: Value,
  name: string,
  adapter: ConstructorParameters<typeof NativeFormControlController<Value>>[1]
) {
  const internals = recordingInternals();
  let changes = 0;
  const host = document.createElement("div") as unknown as MutableHost<Value>;
  Object.assign(host, hostProperties(initialValue, name));
  host.formControlValueChanged = (value) => {
    host.value = value;
    changes += 1;
  };
  const controller = new NativeFormControlController(host, adapter, () => internals);
  controller.hostUpdated();
  return {
    changeCount: () => changes,
    controller,
    submissionCount: () => countSubmission(internals.submission())
  };
}

function hostProperties<Value>(value: Value, name: string) {
  return {
    addController: () => undefined,
    disabled: false,
    errorMessage: "",
    eventNode: {},
    formControlAnchor: () => null,
    name,
    requestUpdate: () => undefined,
    required: false,
    updateComplete: Promise.resolve(true),
    value
  };
}

function recordingInternals(): NativeFormControlInternals & {
  submission(): NativeFormSubmissionValue;
} {
  let submission: NativeFormSubmissionValue = null;
  return {
    form: null,
    setFormValue: (value) => {
      submission = value;
    },
    setValidity: () => undefined,
    submission: () => submission
  };
}

function countSubmission(value: NativeFormSubmissionValue): number {
  if (value === null) return 0;
  if (value instanceof FormData) return [...value.entries()].length;
  return 1;
}

function lifecycleEvidence(
  samples: readonly number[],
  p95Milliseconds: number,
  formEntryCount: number,
  changeCount: number,
  sampleCount: number
) {
  const expectedChanges = CONTROL_COUNT * (sampleCount * 4 + 2);
  return {
    changeCount,
    controlCount: CONTROL_COUNT,
    expectedChanges,
    formEntryCount,
    expectedInputEntries: FORM_ENTRY_COUNT,
    gate: lifecycleGate(p95Milliseconds, formEntryCount, changeCount, expectedChanges),
    maximumMilliseconds: Math.max(...samples),
    p50Milliseconds: percentile(samples, 0.5),
    p95Milliseconds,
    p99Milliseconds: percentile(samples, 0.99),
    sampleCount
  };
}

function lifecycleGate(
  p95Milliseconds: number,
  formEntryCount: number,
  changeCount: number,
  expectedChanges: number
) {
  const passed = [
    formEntryCount === FORM_ENTRY_COUNT,
    changeCount === expectedChanges,
    p95Milliseconds <= P95_LIMIT_MILLISECONDS
  ].every(Boolean);
  return {
    actualP95Milliseconds: p95Milliseconds,
    limitP95Milliseconds: P95_LIMIT_MILLISECONDS,
    name: "100-control native FormData/reset/restore",
    passed
  };
}

interface MutableHost<Value> extends NativeFormControlHost<Value> {
  disabled: boolean;
  errorMessage: string;
  name: string;
  required: boolean;
  value: Value;
}
