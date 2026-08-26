// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";

import { NativeFormValueOrigin } from "./enums.js";
import {
  ScalarFormControlController,
  type FormControlInternals,
  type ScalarFormControlHost
} from "./scalar-form-control-controller.js";

it("projects submission, validity, disabled state, reset, and restore through one host port", () => {
  const fixture = createFixture("Ada");
  fixture.controller.hostConnected();
  fixture.controller.hostUpdated();
  expect(fixture.internals.setFormValue).toHaveBeenLastCalledWith("Ada", "Ada");
  fixture.controller.formDisabledCallback(true);
  expect(fixture.internals.setFormValue).toHaveBeenLastCalledWith(null);
  fixture.controller.formDisabledCallback(false);
  fixture.host.value = "Grace";
  fixture.controller.formResetCallback();
  fixture.controller.formStateRestoreCallback("Lin", NativeFormValueOrigin.Autocomplete);
  fixture.controller.formStateRestoreCallback("Ignored", "unknown-mode");
  expect(fixture.changes).toEqual([
    ["Ada", NativeFormValueOrigin.Reset],
    ["Lin", NativeFormValueOrigin.Autocomplete]
  ]);
});

it("suppresses intermediate IME input and commits one final candidate", async () => {
  const fixture = createFixture("");
  const input = document.createElement("input");
  input.value = "あ";
  fixture.controller.handleCompositionStart();
  fixture.controller.handleInput(inputEvent(input, true));
  fixture.controller.handleCompositionEnd(compositionEvent(input));
  fixture.controller.handleInput(inputEvent(input, false));
  await Promise.resolve();
  expect(fixture.changes).toEqual([["あ", NativeFormValueOrigin.Input]]);
});

function createFixture(value: string) {
  const changes: [string, NativeFormValueOrigin][] = [];
  const internals = fakeInternals();
  const host = document.createElement("div") as unknown as ScalarFormControlHost & {
    value: string;
  };
  host.value = value;
  Object.assign(host, {
    addController: vi.fn(),
    disabled: false,
    errorMessage: "",
    eventNode: {},
    formControlAnchor: () => null,
    formControlValueChanged: (next: string, origin: NativeFormValueOrigin) => {
      host.value = next;
      changes.push([next, origin]);
    },
    name: "field",
    requestUpdate: vi.fn(),
    required: false,
    updateComplete: Promise.resolve(true)
  });
  const controller = new ScalarFormControlController(host, () => internals);
  return { changes, controller, host, internals };
}

function fakeInternals(): FormControlInternals & {
  setFormValue: ReturnType<typeof vi.fn>;
  setValidity: ReturnType<typeof vi.fn>;
} {
  return { form: null, setFormValue: vi.fn(), setValidity: vi.fn() };
}

function inputEvent(input: HTMLInputElement, composing: boolean): InputEvent {
  const event = new InputEvent("input", { isComposing: composing });
  Object.defineProperty(event, "currentTarget", { value: input });
  return event;
}

function compositionEvent(input: HTMLInputElement): CompositionEvent {
  const event = new CompositionEvent("compositionend");
  Object.defineProperty(event, "currentTarget", { value: input });
  return event;
}
