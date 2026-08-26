// @vitest-environment happy-dom
import { expect, it } from "vitest";
import { UiUpdateTrigger } from "@unislang/unifold-contracts";

import { UnifoldScalarChoiceElement } from "./scalar-choice-element.js";

it("provides shared empty scalar-choice state", () => {
  defineFixture();
  const element = document.createElement("unifold-scalar-choice-fixture") as ChoiceFixture;
  expect(element.choiceState()).toEqual({
    asyncValidators: [],
    disabled: false,
    errorMessage: "",
    label: "",
    name: "",
    options: [],
    required: false,
    updateOn: UiUpdateTrigger.Input,
    validators: [],
    value: ""
  });
});

class ChoiceFixture extends UnifoldScalarChoiceElement {
  choiceState() {
    return {
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
}

function defineFixture(): void {
  const tagName = "unifold-scalar-choice-fixture";
  if (customElements.get(tagName) === undefined) customElements.define(tagName, ChoiceFixture);
}
