import type { ReactiveController, ReactiveControllerHost } from "lit";

import { NativeFormValueOrigin } from "./enums.js";

export interface ScalarFormControlHost extends HTMLElement, ReactiveControllerHost {
  readonly disabled: boolean;
  readonly errorMessage: string;
  readonly required: boolean;
  readonly value: string;
  formControlAnchor(): HTMLElement | null;
  formControlValueChanged(value: string, origin: NativeFormValueOrigin): void;
}

export interface FormControlInternals {
  readonly form: HTMLFormElement | null;
  setFormValue(
    value: File | FormData | string | null,
    state?: File | FormData | string | null
  ): void;
  setValidity(flags?: ValidityStateFlags, message?: string, anchor?: HTMLElement): void;
}

type AttachInternals = (host: ScalarFormControlHost) => FormControlInternals | undefined;

export class ScalarFormControlController implements ReactiveController {
  private compositionRevision = 0;
  private composing = false;
  private formDisabled = false;
  private initialValue = "";
  private initialValueCaptured = false;
  private readonly internals: FormControlInternals | undefined;

  constructor(
    private readonly host: ScalarFormControlHost,
    attachInternals: AttachInternals = attachAvailableInternals
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
    this.captureInitialValue();
    this.project();
  }

  hostUpdated(): void {
    this.project();
  }

  handleCompositionStart(): void {
    this.composing = true;
    this.compositionRevision += 1;
  }

  handleCompositionEnd(event: CompositionEvent): void {
    this.composing = false;
    const revision = ++this.compositionRevision;
    const value = controlValue(event.currentTarget);
    if (value === undefined) return;
    queueMicrotask(() => this.commitComposition(value, revision));
  }

  handleInput(event: InputEvent): void {
    if (this.shouldIgnoreInput(event)) return;
    const value = controlValue(event.currentTarget);
    if (value === undefined) return;
    this.compositionRevision += 1;
    this.commit(value, NativeFormValueOrigin.Input);
  }

  commitInput(value: string): void {
    this.compositionRevision += 1;
    this.commit(value, NativeFormValueOrigin.Input);
  }

  formDisabledCallback(disabled: boolean): void {
    if (this.formDisabled === disabled) return;
    this.formDisabled = disabled;
    this.host.requestUpdate();
    this.project();
  }

  formResetCallback(): void {
    this.commit(this.initialValue, NativeFormValueOrigin.Reset);
  }

  formStateRestoreCallback(state: File | FormData | string, mode: string): void {
    if (typeof state !== "string") return;
    const origin = restoreOrigin(mode);
    if (origin !== undefined) this.commit(state, origin);
  }

  private captureInitialValue(): void {
    if (this.initialValueCaptured) return;
    this.initialValue = this.host.value;
    this.initialValueCaptured = true;
  }

  private commit(value: string, origin: NativeFormValueOrigin): void {
    if (value === this.host.value) return;
    this.host.formControlValueChanged(value, origin);
    this.project();
  }

  private shouldIgnoreInput(event: InputEvent): boolean {
    return event.isComposing || this.composing;
  }

  private commitComposition(value: string, revision: number): void {
    if (revision !== this.compositionRevision) return;
    this.commit(value, NativeFormValueOrigin.Input);
  }

  private project(): void {
    if (this.internals === undefined) return;
    if (this.disabled) {
      this.internals.setFormValue(null);
      this.internals.setValidity({});
      return;
    }
    this.internals.setFormValue(this.host.value, this.host.value);
    projectValidity(this.internals, this.host);
  }
}

function attachAvailableInternals(host: ScalarFormControlHost): FormControlInternals | undefined {
  if (typeof host.attachInternals !== "function") return undefined;
  return host.attachInternals();
}

function controlValue(target: EventTarget | null): string | undefined {
  if (isValueElement(target)) return target.value;
  return undefined;
}

function isValueElement(
  target: EventTarget | null
): target is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  );
}

function restoreOrigin(mode: string): NativeFormValueOrigin | undefined {
  if (mode === NativeFormValueOrigin.Autocomplete) return NativeFormValueOrigin.Autocomplete;
  if (mode === NativeFormValueOrigin.Restore) return NativeFormValueOrigin.Restore;
  return undefined;
}

function projectValidity(internals: FormControlInternals, host: ScalarFormControlHost): void {
  const flags = validityFlags(host);
  if (flags === undefined) {
    internals.setValidity({});
    return;
  }
  const anchor = host.formControlAnchor();
  const message = validityMessage(host);
  if (anchor === null) internals.setValidity(flags, message);
  else internals.setValidity(flags, message, anchor);
}

function validityFlags(host: ScalarFormControlHost): ValidityStateFlags | undefined {
  if (host.errorMessage.length > 0) return { customError: true };
  if (isValueMissing(host)) return { valueMissing: true };
  return undefined;
}

function isValueMissing(host: ScalarFormControlHost): boolean {
  return host.required && host.value.length === 0;
}

function validityMessage(host: ScalarFormControlHost): string {
  return host.errorMessage.length === 0 ? "This field is required." : host.errorMessage;
}
