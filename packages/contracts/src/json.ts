/** Values that can cross Unifold's JSON contract boundary. */
export type JsonPrimitive = boolean | null | number | string;

export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

export type JsonArray = readonly JsonValue[];

export interface JsonObject {
  readonly [key: string]: JsonValue | undefined;
}
