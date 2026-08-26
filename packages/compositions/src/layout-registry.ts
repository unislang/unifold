import type { JsonObject } from "@unislang/unifold-contracts";

const MAXIMUM_LAYOUT_DEFINITIONS = 256;

/** An immutable host-supplied snapshot; it performs no I/O or dynamic module evaluation. */
export class TrustedLayoutDefinitionRegistry {
  readonly #definitions: readonly JsonObject[];

  constructor(definitions: readonly JsonObject[]) {
    assertDefinitionCount(definitions.length);
    this.#definitions = structuredClone(definitions);
  }

  snapshot(): readonly JsonObject[] {
    return structuredClone(this.#definitions);
  }
}

export function createTrustedLayoutDefinitionRegistry(
  definitions: readonly JsonObject[]
): TrustedLayoutDefinitionRegistry {
  return new TrustedLayoutDefinitionRegistry(definitions);
}

function assertDefinitionCount(count: number): void {
  if (count <= MAXIMUM_LAYOUT_DEFINITIONS) return;
  throw new RangeError(
    `A trusted layout registry cannot exceed ${MAXIMUM_LAYOUT_DEFINITIONS} definitions.`
  );
}
