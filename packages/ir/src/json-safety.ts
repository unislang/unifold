const JSON_SCALAR_TYPES = new Set(["boolean", "string"]);

export function isJsonSafe(value: unknown): boolean {
  if (isJsonScalar(value)) return true;
  if (Array.isArray(value)) return isJsonArray(value, new WeakSet());
  return isJsonObject(value, new WeakSet());
}

function isJsonScalar(value: unknown): boolean {
  if (value === null) return true;
  if (JSON_SCALAR_TYPES.has(typeof value)) return true;
  return isFiniteJsonNumber(value);
}

function isFiniteJsonNumber(value: unknown): boolean {
  if (typeof value !== "number") return false;
  return Number.isFinite(value);
}

function isJsonArray(value: readonly unknown[], active: WeakSet<object>): boolean {
  if (active.has(value)) return false;
  active.add(value);
  const valid = value.every((item) => isNestedJsonSafe(item, active));
  active.delete(value);
  return valid;
}

function isJsonObject(value: unknown, active: WeakSet<object>): boolean {
  if (!isPlainObject(value)) return false;
  if (active.has(value)) return false;
  return inspectObject(value, active);
}

function inspectObject(value: Readonly<Record<string, unknown>>, active: WeakSet<object>): boolean {
  active.add(value);
  const valid = Object.values(value).every((item) => isNestedJsonSafe(item, active));
  active.delete(value);
  return valid;
}

function isNestedJsonSafe(value: unknown, active: WeakSet<object>): boolean {
  if (isJsonScalar(value)) return true;
  if (Array.isArray(value)) return isJsonArray(value, active);
  return isJsonObject(value, active);
}

export function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
  if (value === null) return false;
  if (typeof value !== "object") return false;
  return hasPlainPrototype(value);
}

function hasPlainPrototype(value: object): boolean {
  const prototype = Object.getPrototypeOf(value) as object | null;
  if (prototype === null) return true;
  return prototype === Object.prototype;
}
