import type { ChoiceOption } from "@unislang/unifold-catalog";
import { UiUpdateTrigger, type JsonObject } from "@unislang/unifold-contracts";
import type { PropertyDeclarations } from "lit";

import { ElementEventType } from "./enums.js";
import { UnifoldElement } from "./unifold-element.js";

export abstract class UnifoldScalarChoiceElement extends UnifoldElement {
  static override properties: PropertyDeclarations = {
    asyncValidators: { attribute: false },
    disabled: { reflect: true, type: Boolean },
    errorMessage: { attribute: "error-message" },
    label: {},
    name: {},
    options: { attribute: false },
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
  declare options: readonly ChoiceOption[];
  declare required: boolean;
  declare updateOn: UiUpdateTrigger;
  declare validators: readonly string[];
  declare value: string;

  constructor() {
    super();
    this.asyncValidators = [];
    this.disabled = false;
    this.errorMessage = "";
    this.label = "";
    this.name = "";
    this.options = [];
    this.required = false;
    this.updateOn = UiUpdateTrigger.Input;
    this.validators = [];
    this.value = "";
  }

  protected override eventProperties(): JsonObject {
    return {
      ...super.eventProperties(),
      asyncValidators: this.asyncValidators,
      disabled: this.disabled,
      errorMessage: this.errorMessage,
      label: this.label,
      name: this.name,
      options: this.options,
      required: this.required,
      updateOn: this.updateOn,
      validators: this.validators,
      value: this.value
    };
  }

  protected override eventValue() {
    return this.value;
  }

  protected readonly onChoiceChange = (event: Event): void => {
    this.value = (event.currentTarget as HTMLInputElement | HTMLSelectElement).value;
    this.emitUiEvent(ElementEventType.ControlInput, { value: this.value });
  };

  protected readonly onChoiceBlur = (): void => {
    this.emitUiEvent(ElementEventType.ControlBlurred, { value: this.value });
  };
}
