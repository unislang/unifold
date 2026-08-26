import type { ChoiceOption } from "@unislang/unifold-catalog";
import type { UnifoldIrNode } from "@unislang/unifold-ir";

export function readStaticCheckboxGroupValue(
  node: UnifoldIrNode,
  controls: readonly HTMLElement[],
  invalid: () => Error
): readonly string[] {
  const options = declaredOptions(node);
  if (controls.length !== options.length) throw invalid();
  const name = stringProperty(node, "name");
  const disabled = node.properties["disabled"] === true;
  const inputs = controls.map((control, index) =>
    checkboxInput(control, options[index], name, disabled, invalid)
  );
  return inputs.flatMap((input) => (input.checked ? [input.value] : []));
}

function declaredOptions(node: UnifoldIrNode): readonly ChoiceOption[] {
  const value = node.properties["options"];
  return Array.isArray(value) ? (value as unknown as readonly ChoiceOption[]) : [];
}

function checkboxInput(
  control: HTMLElement,
  option: ChoiceOption | undefined,
  name: string,
  groupDisabled: boolean,
  invalid: () => Error
): HTMLInputElement {
  if (!isCheckboxInput(control)) throw invalid();
  if (!matchesOption(control, option, name, groupDisabled)) throw invalid();
  return control;
}

function isCheckboxInput(control: HTMLElement): control is HTMLInputElement {
  return control instanceof HTMLInputElement && control.type === "checkbox";
}

function matchesOption(
  control: HTMLInputElement,
  option: ChoiceOption | undefined,
  name: string,
  groupDisabled: boolean
): boolean {
  if (option === undefined) return false;
  if (!matchesIdentity(control, option, name)) return false;
  return validDisabledState(control, groupDisabled, option.disabled === true);
}

function matchesIdentity(control: HTMLInputElement, option: ChoiceOption, name: string): boolean {
  return [control.value === option.value, control.name === name].every(Boolean);
}

function validDisabledState(
  control: HTMLInputElement,
  groupDisabled: boolean,
  optionDisabled: boolean
): boolean {
  const expectedDisabled = [groupDisabled, optionDisabled].some(Boolean);
  if (effectivelyDisabled(control) !== expectedDisabled) return false;
  return validCheckedState(control, optionDisabled);
}

function validCheckedState(control: HTMLInputElement, optionDisabled: boolean): boolean {
  if (optionDisabled) return !control.checked;
  return true;
}

function effectivelyDisabled(control: HTMLInputElement): boolean {
  return control.disabled || control.closest("fieldset")?.disabled === true;
}

function stringProperty(node: UnifoldIrNode, name: string): string {
  const value = node.properties[name];
  return typeof value === "string" ? value : "";
}
