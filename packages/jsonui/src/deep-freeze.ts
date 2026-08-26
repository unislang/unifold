function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

export function deepFreeze<T>(value: T): Readonly<T> {
  if (!isObject(value)) return value;
  if (Object.isFrozen(value)) return value;
  const frozen = Object.freeze(value);
  Object.values(frozen).forEach(deepFreeze);
  return frozen;
}
