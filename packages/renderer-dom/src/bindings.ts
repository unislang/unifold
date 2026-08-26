import {
  CatalogBindingKind,
  type CatalogPropertyDescriptor,
  type ComponentDescriptor
} from "@unislang/unifold-catalog";
import type { JsonObject, JsonValue } from "@unislang/unifold-contracts";

export function applyBindings(
  element: HTMLElement,
  descriptor: ComponentDescriptor,
  previous: JsonObject | undefined,
  current: JsonObject
): void {
  descriptor.properties.forEach((property) => {
    const oldValue = resolveValue(previous, property);
    const newValue = resolveValue(current, property);
    if (!sameValue(oldValue, newValue)) applyBinding(element, property, newValue);
  });
}

function applyBinding(
  element: HTMLElement,
  descriptor: CatalogPropertyDescriptor,
  value: JsonValue | undefined
): void {
  if (descriptor.bindingKind === CatalogBindingKind.Attribute) {
    applyAttribute(element, descriptor.bindingName, value);
    return;
  }
  Reflect.set(element, descriptor.bindingName, value);
}

function applyAttribute(element: HTMLElement, name: string, value: JsonValue | undefined): void {
  if (value === undefined || value === false) element.removeAttribute(name);
  else element.setAttribute(name, String(value));
}

function resolveValue(
  properties: JsonObject | undefined,
  descriptor: CatalogPropertyDescriptor
): JsonValue | undefined {
  return properties?.[descriptor.name] ?? descriptor.defaultValue;
}

function sameValue(left: JsonValue | undefined, right: JsonValue | undefined): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
