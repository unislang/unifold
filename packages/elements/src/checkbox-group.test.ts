// @vitest-environment happy-dom
import type { UiEvent } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { controlNode } from "./elements.test-data.js";
import { ElementEventName, NativeFormValueOrigin } from "./enums.js";
import { UnifoldCheckboxGroup } from "./checkbox-group.js";

it("renders a native fieldset and emits complete ordered selections", verifySelection);
it("restores and resets defensive string-array state", verifyLifecycle);

async function verifySelection(): Promise<void> {
  const group = await mountedGroup("selection");
  const events: UiEvent[] = [];
  group.addEventListener(ElementEventName.UiEvent, (event) => events.push(detail(event)));
  const inputs = nativeInputs(group);
  const security = requiredInput(inputs, 1);
  security.checked = true;
  security.dispatchEvent(new Event("change", { bubbles: true }));
  expect(group.value).toEqual(["news", "security"]);
  expect(requiredEvent(events).data.change).toEqual({
    origin: NativeFormValueOrigin.Input,
    value: ["news", "security"]
  });
  expect(inputs.map(({ name, type, value }) => ({ name, type, value }))).toEqual([
    { name: "topics", type: "checkbox", value: "news" },
    { name: "topics", type: "checkbox", value: "security" },
    { name: "topics", type: "checkbox", value: "disabled" }
  ]);
  expect(requiredInput(inputs, 2).disabled).toBe(true);
  expect(requiredLegend(group).textContent).toBe("Topics");
  expect(requiredFieldset(group).hasAttribute("aria-required")).toBe(false);
  expect(UnifoldCheckboxGroup.formAssociated).toBe(true);
}

it("guards disabled changes and emits one blur only after focus leaves the group", async () => {
  const group = await mountedGroup("disabled-blur");
  const events: UiEvent[] = [];
  group.addEventListener(ElementEventName.UiEvent, (event) => events.push(detail(event)));
  const inputs = nativeInputs(group);
  const disabledOption = requiredInput(inputs, 2);
  disabledOption.checked = true;
  disabledOption.dispatchEvent(new Event("change", { bubbles: true }));
  expect(disabledOption.checked).toBe(false);
  disabledOption.value = "missing";
  disabledOption.checked = true;
  disabledOption.dispatchEvent(new Event("change", { bubbles: true }));
  expect(disabledOption.checked).toBe(false);
  requiredInput(inputs, 0).focus();
  requiredInput(inputs, 1).focus();
  await Promise.resolve();
  expect(events).toEqual([]);
  outsideButton().focus();
  await Promise.resolve();
  expect(events).toHaveLength(1);
  group.formDisabledCallback(true);
  await group.updateComplete;
  const disabledInputs = nativeInputs(group);
  const disabledSecurity = requiredInput(disabledInputs, 1);
  disabledSecurity.checked = true;
  disabledSecurity.dispatchEvent(new Event("change", { bubbles: true }));
  expect(disabledSecurity.checked).toBe(false);
  expect(group.formControlAnchor()).toBeInstanceOf(HTMLFieldSetElement);
  verifyDetachedGroup();
});

function verifyDetachedGroup(): void {
  const detached = new UnifoldCheckboxGroup();
  expect(detached.form).toBeNull();
  expect(detached.formControlAnchor()).toBeNull();
}

async function verifyLifecycle(): Promise<void> {
  const group = await mountedGroup("lifecycle");
  const events: UiEvent[] = [];
  group.addEventListener(ElementEventName.UiEvent, (event) => events.push(detail(event)));
  group.formStateRestoreCallback('["security"]', NativeFormValueOrigin.Restore);
  await group.updateComplete;
  expect(group.value).toEqual(["security"]);
  group.formStateRestoreCallback('["missing"]', NativeFormValueOrigin.Restore);
  group.formResetCallback();
  await group.updateComplete;
  expect(group.value).toEqual(["news"]);
  expect(events.map(({ data }) => data.change)).toEqual([
    { origin: NativeFormValueOrigin.Restore, value: ["security"] },
    { origin: NativeFormValueOrigin.Reset, value: ["news"] }
  ]);
}

async function mountedGroup(id: string): Promise<UnifoldCheckboxGroup> {
  defineCheckboxGroup();
  const group = document.createElement("unifold-checkbox-group-test") as UnifoldCheckboxGroup;
  group.eventNode = controlNode(id, ["news"], undefined, "CheckboxGroup");
  group.label = "Topics";
  group.name = "topics";
  group.options = [
    { label: "News", value: "news" },
    { label: "Security", value: "security" },
    { disabled: true, label: "Disabled", value: "disabled" }
  ];
  group.value = ["news"];
  document.body.append(group);
  await group.updateComplete;
  return group;
}

function defineCheckboxGroup(): void {
  if (customElements.get("unifold-checkbox-group-test") === undefined)
    customElements.define("unifold-checkbox-group-test", UnifoldCheckboxGroup);
}

function nativeInputs(group: UnifoldCheckboxGroup): readonly HTMLInputElement[] {
  return [...(group.shadowRoot?.querySelectorAll<HTMLInputElement>("input") ?? [])];
}

function requiredInput(inputs: readonly HTMLInputElement[], index: number): HTMLInputElement {
  const input = inputs[index];
  if (input === undefined) throw new Error(`Checkbox ${index} is missing.`);
  return input;
}

function requiredEvent(events: readonly UiEvent[]): UiEvent {
  const event = events[0];
  if (event === undefined) throw new Error("CheckboxGroup event is missing.");
  return event;
}

function requiredLegend(group: UnifoldCheckboxGroup): HTMLElement {
  const legend = group.shadowRoot?.querySelector("legend");
  if (!(legend instanceof HTMLElement)) throw new Error("CheckboxGroup legend is missing.");
  return legend;
}

function requiredFieldset(group: UnifoldCheckboxGroup): HTMLFieldSetElement {
  const fieldset = group.shadowRoot?.querySelector("fieldset");
  if (!(fieldset instanceof HTMLFieldSetElement)) throw new Error("CheckboxGroup is missing.");
  return fieldset;
}

function outsideButton(): HTMLButtonElement {
  const button = document.createElement("button");
  document.body.append(button);
  return button;
}

function detail(event: Event): UiEvent {
  return (event as CustomEvent<UiEvent>).detail;
}
