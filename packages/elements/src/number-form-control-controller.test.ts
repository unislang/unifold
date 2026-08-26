// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";

import { NativeFormValueOrigin } from "./enums.js";
import { NumberFormControlController } from "./number-form-control-controller.js";
import type {
  NativeFormControlHost,
  NativeFormControlInternals
} from "./native-form-control-controller.js";

it("commits finite native number input and an explicit null empty state", () => {
  const { changes, controller } = fixture();
  const input = document.createElement("input");
  input.type = "number";
  input.value = "42.5";
  controller.handleInput(inputEvent(input));
  input.value = "";
  controller.handleInput(inputEvent(input));
  expect(changes).toEqual([
    [42.5, NativeFormValueOrigin.Input],
    [null, NativeFormValueOrigin.Input]
  ]);
});

function inputEvent(input: HTMLInputElement): InputEvent {
  const event = new InputEvent("input");
  Object.defineProperty(event, "currentTarget", { value: input });
  return event;
}

function fixture() {
  const changes: [number | null, NativeFormValueOrigin][] = [];
  const host = document.createElement("div") as unknown as MutableNumberHost;
  Object.assign(host, {
    addController: vi.fn(),
    disabled: false,
    errorMessage: "",
    eventNode: {},
    formControlAnchor: () => null,
    formControlValueChanged: (value: number | null, origin: NativeFormValueOrigin) => {
      host.value = value;
      changes.push([value, origin]);
    },
    name: "amount",
    requestUpdate: vi.fn(),
    required: false,
    updateComplete: Promise.resolve(true),
    value: null
  });
  return {
    changes,
    controller: new NumberFormControlController(host, () => internals())
  };
}

function internals(): NativeFormControlInternals {
  return { form: null, setFormValue: vi.fn(), setValidity: vi.fn() };
}

interface MutableNumberHost extends NativeFormControlHost<number | null> {
  value: number | null;
}
