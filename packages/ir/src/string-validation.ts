import type { CatalogPropertyDescriptor } from "@unislang/unifold-catalog";

export function isCatalogString(value: unknown, descriptor: CatalogPropertyDescriptor): boolean {
  if (typeof value !== "string") return false;
  return [withinMaximum(value, descriptor), meetsMinimum(value, descriptor)].every(Boolean);
}

function withinMaximum(value: string, descriptor: CatalogPropertyDescriptor): boolean {
  if (descriptor.maximumLength === undefined) return true;
  return value.length <= descriptor.maximumLength;
}

function meetsMinimum(value: string, descriptor: CatalogPropertyDescriptor): boolean {
  if (descriptor.minimumLength === undefined) return true;
  return value.trim().length >= descriptor.minimumLength;
}
