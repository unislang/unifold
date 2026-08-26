// @vitest-environment happy-dom
import { expect, it } from "vitest";
import { UiUpdateTrigger } from "@unislang/unifold-contracts";

import { UnifoldScalarTextElement } from "./scalar-text-element.js";

it("provides shared empty scalar-text state", () => {
  defineFixture();
  const element = document.createElement("unifold-scalar-text-fixture") as TextFixture;
  expect(element.textState()).toEqual({
    asyncValidators: [],
    disabled: false,
    errorMessage: "",
    label: "",
    name: "",
    placeholder: "",
    readonly: false,
    required: false,
    updateOn: UiUpdateTrigger.Input,
    validators: [],
    value: ""
  });
});

it("reflects the native form name contract", async () => {
  defineFixture();
  const element = document.createElement("unifold-scalar-text-fixture") as TextFixture;
  element.name = "profileName";
  document.body.append(element);
  await element.updateComplete;
  expect(element.getAttribute("name")).toBe("profileName");
  element.remove();
});

class TextFixture extends UnifoldScalarTextElement {
  textState() {
    return {
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
}

function defineFixture(): void {
  const tagName = "unifold-scalar-text-fixture";
  if (customElements.get(tagName) === undefined) customElements.define(tagName, TextFixture);
}
