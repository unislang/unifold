import type { ReactiveControllerHost } from "lit";

import {
  NativeFormControlController,
  type AttachInternals,
  type NativeFormControlHost,
  type NativeFormControlInternals
} from "./native-form-control-controller.js";
import { scalarFormValueAdapter } from "./native-form-value-adapters.js";

export interface ScalarFormControlHost
  extends NativeFormControlHost<string>,
    ReactiveControllerHost {}

export type FormControlInternals = NativeFormControlInternals;

export class ScalarFormControlController {
  private compositionRevision = 0;
  private composing = false;
  private readonly nativeForm: NativeFormControlController<string>;

  constructor(host: ScalarFormControlHost, attachInternals?: AttachInternals<string>) {
    this.nativeForm = new NativeFormControlController(
      host,
      scalarFormValueAdapter,
      attachInternals
    );
  }

  get disabled(): boolean {
    return this.nativeForm.disabled;
  }

  get form(): HTMLFormElement | null {
    return this.nativeForm.form;
  }

  hostConnected(): void {
    this.nativeForm.hostConnected();
  }

  hostUpdated(): void {
    this.nativeForm.hostUpdated();
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
    this.nativeForm.commitInput(value);
  }

  commitInput(value: string): void {
    this.compositionRevision += 1;
    this.nativeForm.commitInput(value);
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

  private shouldIgnoreInput(event: InputEvent): boolean {
    return event.isComposing || this.composing;
  }

  private commitComposition(value: string, revision: number): void {
    if (revision !== this.compositionRevision) return;
    this.nativeForm.commitInput(value);
  }
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
