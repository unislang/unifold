import type { ReactiveController, ReactiveControllerHost } from "lit";

import { NativeFormValueOrigin } from "./enums.js";

export type NativeFormSubmissionValue = File | FormData | string | null;

export interface NativeFormValueProjection {
  readonly state: string;
  readonly submission: NativeFormSubmissionValue;
}

export interface NativeFormValueAdapter<Value> {
  clone(value: Value): Value;
  equals(left: Value, right: Value): boolean;
  isValueMissing(value: Value): boolean;
  project(value: Value, name: string): NativeFormValueProjection;
  prepareRestore?(value: Value): void;
  restore(state: string): Value | undefined;
}

export interface NativeFormControlHost<Value> extends HTMLElement, ReactiveControllerHost {
  readonly disabled: boolean;
  readonly errorMessage: string;
  readonly eventNode?: unknown;
  readonly name: string;
  readonly required: boolean;
  readonly value: Value;
  formControlAnchor(): HTMLElement | null;
  formControlValueChanged(value: Value, origin: NativeFormValueOrigin): void;
}

export interface NativeFormControlInternals {
  readonly form: HTMLFormElement | null;
  setFormValue(value: NativeFormSubmissionValue, state?: NativeFormSubmissionValue): void;
  setValidity(flags?: ValidityStateFlags, message?: string, anchor?: HTMLElement): void;
}

export type AttachInternals<Value> = (
  host: NativeFormControlHost<Value>
) => NativeFormControlInternals | undefined;

export class NativeFormControlController<Value> implements ReactiveController {
  private formDisabled = false;
  private initialValue!: Value;
  private initialValueCaptured = false;
  private readonly internals: NativeFormControlInternals | undefined;

  constructor(
    private readonly host: NativeFormControlHost<Value>,
    private readonly adapter: NativeFormValueAdapter<Value>,
    attachInternals: AttachInternals<Value> = attachAvailableInternals
  ) {
    host.addController(this);
    this.internals = attachInternals(host);
  }

  get disabled(): boolean {
    return this.host.disabled || this.formDisabled;
  }

  get form(): HTMLFormElement | null {
    return this.internals?.form ?? null;
  }

  hostConnected(): void {
    this.project();
  }

  hostUpdated(): void {
    this.captureInitialValue();
    this.project();
  }

  captureInitialValue(): void {
    if (this.initialValueCaptured || this.host.eventNode === undefined) return;
    this.initialValue = this.adapter.clone(this.host.value);
    this.initialValueCaptured = true;
  }

  commitInput(value: Value): void {
    this.captureInitialValue();
    this.commit(value, NativeFormValueOrigin.Input);
  }

  formDisabledCallback(disabled: boolean): void {
    if (this.formDisabled === disabled) return;
    this.formDisabled = disabled;
    this.host.requestUpdate();
    this.project();
  }

  formResetCallback(): void {
    this.captureInitialValue();
    if (!this.initialValueCaptured) return;
    this.commit(this.adapter.clone(this.initialValue), NativeFormValueOrigin.Reset);
  }

  formStateRestoreCallback(state: File | FormData | string, mode: string): void {
    const origin = restoreOrigin(mode);
    if (origin === undefined) return;
    const value = restoredValue(this.adapter, state);
    if (value === undefined) return;
    prepareRestoredValue(this.adapter, value);
    this.commit(value, origin);
  }

  private commit(value: Value, origin: NativeFormValueOrigin): void {
    if (!this.adapter.equals(value, this.host.value)) {
      this.host.formControlValueChanged(value, origin);
    }
    this.project();
  }

  private project(): void {
    if (this.internals === undefined) return;
    if (this.disabled) {
      this.internals.setFormValue(null);
      this.internals.setValidity({});
      return;
    }
    const projection = this.adapter.project(this.host.value, this.host.name);
    this.internals.setFormValue(projection.submission, projection.state);
    projectValidity(this.internals, this.host, this.adapter);
  }
}

function attachAvailableInternals<Value>(
  host: NativeFormControlHost<Value>
): NativeFormControlInternals | undefined {
  if (typeof host.attachInternals !== "function") return undefined;
  return host.attachInternals();
}

function restoreOrigin(mode: string): NativeFormValueOrigin | undefined {
  if (mode === NativeFormValueOrigin.Autocomplete) return NativeFormValueOrigin.Autocomplete;
  if (mode === NativeFormValueOrigin.Restore) return NativeFormValueOrigin.Restore;
  return undefined;
}

function restoredValue<Value>(
  adapter: NativeFormValueAdapter<Value>,
  state: File | FormData | string
): Value | undefined {
  if (typeof state !== "string") return undefined;
  return adapter.restore(state);
}

function prepareRestoredValue<Value>(adapter: NativeFormValueAdapter<Value>, value: Value): void {
  adapter.prepareRestore?.(value);
}

function projectValidity<Value>(
  internals: NativeFormControlInternals,
  host: NativeFormControlHost<Value>,
  adapter: NativeFormValueAdapter<Value>
): void {
  const flags = validityFlags(host, adapter);
  if (flags === undefined) {
    internals.setValidity({});
    return;
  }
  const anchor = host.formControlAnchor();
  const message = validityMessage(host);
  if (anchor === null) internals.setValidity(flags, message);
  else internals.setValidity(flags, message, anchor);
}

function validityFlags<Value>(
  host: NativeFormControlHost<Value>,
  adapter: NativeFormValueAdapter<Value>
): ValidityStateFlags | undefined {
  if (host.errorMessage.length > 0) return { customError: true };
  if (requiredValueMissing(host, adapter)) return { valueMissing: true };
  return undefined;
}

function requiredValueMissing<Value>(
  host: NativeFormControlHost<Value>,
  adapter: NativeFormValueAdapter<Value>
): boolean {
  return host.required && adapter.isValueMissing(host.value);
}

function validityMessage<Value>(host: NativeFormControlHost<Value>): string {
  return host.errorMessage.length === 0 ? "This field is required." : host.errorMessage;
}
