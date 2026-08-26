import type { ReactiveControllerHost } from "lit";

import {
  NativeFormControlController,
  type AttachInternals,
  type NativeFormControlHost
} from "./native-form-control-controller.js";
import { numberFormValueAdapter } from "./native-form-value-adapters.js";

interface NumberFormControlHost
  extends NativeFormControlHost<number | null>,
    ReactiveControllerHost {}

export class NumberFormControlController {
  private readonly nativeForm: NativeFormControlController<number | null>;

  constructor(host: NumberFormControlHost, attachInternals?: AttachInternals<number | null>) {
    this.nativeForm = new NativeFormControlController(
      host,
      numberFormValueAdapter,
      attachInternals
    );
  }

  get disabled(): boolean {
    return this.nativeForm.disabled;
  }

  get form(): HTMLFormElement | null {
    return this.nativeForm.form;
  }

  handleInput(event: InputEvent): void {
    const value = numberInputValue(event.currentTarget);
    if (value !== undefined) this.nativeForm.commitInput(value);
  }

  formDisabledCallback(disabled: boolean): void {
    this.nativeForm.formDisabledCallback(disabled);
  }

  formResetCallback(): void {
    this.nativeForm.formResetCallback();
  }

  formStateRestoreCallback(state: File | FormData | string, mode: string): void {
    this.nativeForm.formStateRestoreCallback(state, mode);
  }
}

function numberInputValue(target: EventTarget | null): number | null | undefined {
  if (!isNumberInput(target)) return undefined;
  return canonicalInputValue(target);
}

function isNumberInput(target: EventTarget | null): target is HTMLInputElement {
  if (!(target instanceof HTMLInputElement)) return false;
  return target.type === "number";
}

function canonicalInputValue(input: HTMLInputElement): number | null | undefined {
  if (input.value === "") return null;
  if (Number.isFinite(input.valueAsNumber)) return input.valueAsNumber;
  return undefined;
}
