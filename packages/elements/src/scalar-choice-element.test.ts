// @vitest-environment happy-dom
import { expect, it } from "vitest";
import { UiUpdateTrigger } from "@unislang/unifold-contracts";

import { NativeFormValueOrigin } from "./enums.js";
import { controlNode } from "./elements.test-data.js";
import { UnifoldScalarChoiceElement } from "./scalar-choice-element.js";

it("provides shared empty scalar-choice state", async () => {
  defineFixture();
  const element = document.createElement("unifold-scalar-choice-fixture") as ChoiceFixture;
  element.name = "choice";
  document.body.append(element);
  await element.updateComplete;
  expect(element.choiceState()).toEqual({
    asyncValidators: [],
    disabled: false,
    errorMessage: "",
    label: "",
    name: "choice",
    options: [],
    required: false,
    updateOn: UiUpdateTrigger.Input,
    validators: [],
    value: ""
  });
  expect(element.getAttribute("name")).toBe("choice");
});

it("normalizes native restore through the canonical choice input", () => {
  defineFixture();
  const element = document.createElement("unifold-scalar-choice-fixture") as ChoiceFixture;
  element.eventNode = controlNode("choice", "", undefined, "Select");
  const changes: unknown[] = [];
  element.addEventListener("unifold-event", (event) =>
    changes.push((event as CustomEvent).detail.data.change)
  );
  element.formStateRestoreCallback("restored", NativeFormValueOrigin.Restore);
  expect(changes).toEqual([{ origin: NativeFormValueOrigin.Restore, value: "restored" }]);
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
