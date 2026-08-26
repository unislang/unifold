// @vitest-environment happy-dom
import { expect, it } from "vitest";

import {
  NativeBooleanFormState,
  NativeBooleanSubmissionValue,
  booleanFormValueAdapter,
  createStringArrayFormValueAdapter,
  scalarFormValueAdapter
} from "./native-form-value-adapters.js";

it("projects scalar and native checkbox submission semantics", () => {
  expect(scalarFormValueAdapter.project("Ada", "name")).toEqual({
    state: "Ada",
    submission: "Ada"
  });
  expect(scalarFormValueAdapter.project("Ada", "").submission).toBeNull();
  expect(booleanFormValueAdapter.project(true, "updates")).toEqual({
    state: NativeBooleanFormState.Checked,
    submission: NativeBooleanSubmissionValue.Checked
  });
  expect(booleanFormValueAdapter.project(false, "updates").submission).toBeNull();
  expect(booleanFormValueAdapter.restore(NativeBooleanFormState.Checked)).toBe(true);
  expect(booleanFormValueAdapter.restore("invalid")).toBeUndefined();
});

it("projects repeated enabled values and rejects malformed restored arrays", () => {
  const adapter = createStringArrayFormValueAdapter(() => [
    { label: "TypeScript", value: "ts" },
    { label: "Accessibility", value: "a11y" },
    { disabled: true, label: "Unavailable", value: "disabled" }
  ]);
  const projected = adapter.project(["ts", "a11y", "disabled"], "skills");
  expect(projected.state).toBe('["ts","a11y","disabled"]');
  expect(projected.submission).toBeInstanceOf(FormData);
  expect((projected.submission as FormData).getAll("skills")).toEqual(["ts", "a11y"]);
  expect(adapter.project(["ts"], "").submission).toBeNull();
  expect(adapter.project(["ts", "ts"], "skills").submission).toBeNull();
  expect(adapter.project(["missing"], "skills").submission).toBeNull();
  expect(adapter.restore('["ts","a11y"]')).toEqual(["ts", "a11y"]);
  expect(adapter.restore('["ts","ts"]')).toBeUndefined();
  expect(adapter.restore('["disabled"]')).toBeUndefined();
  expect(adapter.restore("not-json")).toBeUndefined();
});
