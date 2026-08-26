import { isSafeResourceUrl } from "@unislang/unifold-catalog";

export function isSafeResourceProperty(value: unknown): value is string {
  return typeof value === "string" && isSafeResourceUrl(value);
}
