import { UiUpdateTrigger } from "@unislang/unifold-contracts";
import type { PropertyDeclarations } from "lit";

import { ElementEventType, NativeFormValueOrigin } from "./enums.js";
import { ScalarFormControlController } from "./scalar-form-control-controller.js";
import { UnifoldElement } from "./unifold-element.js";

export abstract class UnifoldScalarTextElement extends UnifoldElement {
  static formAssociated = true;
  static override properties: PropertyDeclarations = {
    asyncValidators: { attribute: false },
    disabled: { reflect: true, type: Boolean },
    errorMessage: { attribute: "error-message" },
    label: {},
    name: { reflect: true },
    placeholder: {},
    readonly: { reflect: true, type: Boolean },
    required: { reflect: true, type: Boolean },
    updateOn: { attribute: "update-on" },
    validators: { attribute: false },
    value: {}
  };

  declare asyncValidators: readonly string[];
  declare disabled: boolean;
  declare errorMessage: string;
  declare label: string;
  declare name: string;
  declare placeholder: string;
  declare readonly: boolean;
  declare required: boolean;
  declare updateOn: UiUpdateTrigger;
  declare validators: readonly string[];
  declare value: string;
  protected readonly formControl = new ScalarFormControlController(this);

  constructor() {
    super();
    this.asyncValidators = [];
    this.disabled = false;
    this.errorMessage = "";
    this.label = "";
    this.name = "";
    this.placeholder = "";
    this.readonly = false;
    this.required = false;
    this.updateOn = UiUpdateTrigger.Input;
    this.validators = [];
    this.value = "";
  }

  protected override eventProperties() {
    return {
      ...super.eventProperties(),
      asyncValidators: this.asyncValidators,
      disabled: this.disabled,
      errorMessage: this.errorMessage,
      label: this.label,
      name: this.name,
      placeholder: this.placeholder,
      readonly: this.readonly,
      required: this.required,
      updateOn: this.updateOn,
      validators: this.validators,
      value: this.value
    };
  }

  protected override eventValue() {
    return this.value;
  }

  get form(): HTMLFormElement | null {
    return this.formControl.form;
  }

  formControlAnchor(): HTMLElement | null {
    return this.shadowRoot?.querySelector("input,textarea") ?? null;
  }

  formControlValueChanged(value: string, origin: NativeFormValueOrigin): void {
    this.value = value;
    this.emitUiEvent(ElementEventType.ControlInput, { origin, value });
  }

  formDisabledCallback(disabled: boolean): void {
    this.formControl.formDisabledCallback(disabled);
  }

  formResetCallback(): void {
    this.formControl.formResetCallback();
  }

  formStateRestoreCallback(state: File | FormData | string, mode: string): void {
    this.formControl.formStateRestoreCallback(state, mode);
  }

  protected readonly onTextInput = (event: InputEvent): void => {
    this.formControl.handleInput(event);
  };

  protected readonly onCompositionStart = (): void => {
    this.formControl.handleCompositionStart();
  };

  protected readonly onCompositionEnd = (event: CompositionEvent): void => {
    this.formControl.handleCompositionEnd(event);
  };

  protected readonly onTextBlur = (): void => {
    this.emitUiEvent(ElementEventType.ControlBlurred, { value: this.value });
  };
}
