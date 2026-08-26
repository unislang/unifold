const referencePattern = /^\{\{([A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z][A-Za-z0-9_-]*)*)\}\}$/u;

export function layoutVariableSourcePointers(
  definition: Readonly<Record<string, unknown>>,
  supplied: unknown,
  definitionPath: string
): Readonly<Record<string, string>> {
  const schema = plainObject(definition["variables"]);
  if (schema === undefined) return {};
  const actual = plainObject(supplied) ?? {};
  return Object.fromEntries(
    Object.keys(schema).map((name) => [name, variablePointer(name, actual, definitionPath)])
  );
}

export function layoutValueSourcePointer(
  value: unknown,
  fallback: string,
  variablePointers: Readonly<Record<string, string>>
): string {
  const reference = referencePath(value);
  if (reference === undefined) return fallback;
  return resolvedPointer(reference, fallback, variablePointers);
}

function variablePointer(
  name: string,
  supplied: Readonly<Record<string, unknown>>,
  definitionPath: string
): string {
  return Object.hasOwn(supplied, name)
    ? `/variables/${name}`
    : `${definitionPath}/variables/${name}/default`;
}

function resolvedPointer(
  reference: string,
  fallback: string,
  variablePointers: Readonly<Record<string, string>>
): string {
  const [root, ...parts] = reference.split(".");
  if (root === undefined) return fallback;
  const base = variablePointers[root];
  if (base === undefined) return fallback;
  return parts.reduce((pointer, part) => `${pointer}/${part}`, base);
}

function referencePath(value: unknown): string | undefined {
  if (typeof value === "string") return stringReferencePath(value);
  const object = plainObject(value);
  if (object === undefined) return undefined;
  return objectReferencePath(object);
}

function stringReferencePath(value: string): string | undefined {
  const match = referencePattern.exec(value);
  if (match === null) return undefined;
  return match[1];
}

function objectReferencePath(object: Readonly<Record<string, unknown>>): string | undefined {
  if (Object.keys(object).length !== 1) return undefined;
  return objectReferenceValue(object["$var"]);
}

function objectReferenceValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  return undefined;
}

function plainObject(value: unknown): Readonly<Record<string, unknown>> | undefined {
  if (Object.prototype.toString.call(value) !== "[object Object]") return undefined;
  return value as Readonly<Record<string, unknown>>;
}
