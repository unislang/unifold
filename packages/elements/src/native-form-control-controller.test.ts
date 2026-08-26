// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";

import { NativeFormValueOrigin } from "./enums.js";
import {
  NativeFormControlController,
  type NativeFormControlHost,
  type NativeFormControlInternals,
  type NativeFormValueAdapter
} from "./native-form-control-controller.js";
import { booleanFormValueAdapter } from "./native-form-value-adapters.js";

it("projects value, validity, disabled state, reset, and restoration", () => {
  const fixture = createFixture(false, booleanFormValueAdapter);
  fixture.host.required = true;
  fixture.controller.hostConnected();
  fixture.controller.hostUpdated();
  expect(fixture.internals.setFormValue).toHaveBeenLastCalledWith(null, "false");
  expect(fixture.internals.setValidity).toHaveBeenLastCalledWith(
    { valueMissing: true },
    "This field is required."
  );
  fixture.controller.commitInput(true);
  fixture.controller.formDisabledCallback(true);
  expect(fixture.internals.setFormValue).toHaveBeenLastCalledWith(null);
  fixture.controller.formDisabledCallback(false);
  fixture.controller.formResetCallback();
  fixture.controller.formStateRestoreCallback("true", NativeFormValueOrigin.Restore);
  expect(fixture.changes).toEqual([
    [true, NativeFormValueOrigin.Input],
    [false, NativeFormValueOrigin.Reset],
    [true, NativeFormValueOrigin.Restore]
  ]);
});

it("clones the initial value and ignores invalid or unchanged restoration", () => {
  const initial = ["a"];
  const fixture = createFixture<readonly string[]>(initial, arrayAdapter());
  fixture.controller.hostUpdated();
  initial.push("mutated");
  fixture.controller.commitInput(["b"]);
  fixture.controller.formResetCallback();
  fixture.controller.formStateRestoreCallback("invalid", NativeFormValueOrigin.Restore);
  fixture.controller.formStateRestoreCallback('["a"]', NativeFormValueOrigin.Autocomplete);
  expect(fixture.changes).toEqual([
    [["b"], NativeFormValueOrigin.Input],
    [["a"], NativeFormValueOrigin.Reset]
  ]);
});

it("projects host intrinsic validity after custom and required checks", () => {
  const fixture = createFixture("42", scalarAdapter());
  fixture.host.formControlValidity = () => ({
    flags: { rangeOverflow: true },
    message: "Value is above the maximum."
  });
  fixture.controller.hostConnected();
  expect(fixture.internals.setValidity).toHaveBeenLastCalledWith(
    { rangeOverflow: true },
    "Value is above the maximum."
  );
});

function createFixture<Value>(value: Value, adapter: NativeFormValueAdapter<Value>) {
  const changes: [Value, NativeFormValueOrigin][] = [];
  const internals = fakeInternals();
  const host = document.createElement("div") as unknown as MutableHost<Value>;
  Object.assign(host, {
    addController: vi.fn(),
    disabled: false,
    errorMessage: "",
    eventNode: {},
    formControlAnchor: () => null,
    formControlValueChanged: (next: Value, origin: NativeFormValueOrigin) => {
      host.value = next;
      changes.push([next, origin]);
    },
    name: "field",
    requestUpdate: vi.fn(),
    required: false,
    updateComplete: Promise.resolve(true),
    value
  });
  const controller = new NativeFormControlController(host, adapter, () => internals);
  return { changes, controller, host, internals };
}

function fakeInternals(): NativeFormControlInternals & {
  setFormValue: ReturnType<typeof vi.fn>;
  setValidity: ReturnType<typeof vi.fn>;
} {
  return { form: null, setFormValue: vi.fn(), setValidity: vi.fn() };
}

function arrayAdapter(): NativeFormValueAdapter<readonly string[]> {
  return {
    clone: (value) => [...value],
    equals: (left, right) => left.join() === right.join(),
    isValueMissing: (value) => value.length === 0,
    project: (value) => ({ state: JSON.stringify(value), submission: null }),
    restore: (state) => (state === '["a"]' ? ["a"] : undefined)
  };
}

function scalarAdapter(): NativeFormValueAdapter<string> {
  return {
    clone: (value) => value,
    equals: (left, right) => left === right,
    isValueMissing: (value) => value.length === 0,
    project: (value) => ({ state: value, submission: value }),
    restore: (state) => state
  };
}

interface MutableHost<Value> extends NativeFormControlHost<Value> {
  disabled: boolean;
  errorMessage: string;
  name: string;
  required: boolean;
  value: Value;
  formControlValidity():
    | { readonly flags: ValidityStateFlags; readonly message: string }
    | undefined;
}
