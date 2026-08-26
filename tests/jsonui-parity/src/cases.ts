import type { JsonUINode } from "@jsonui/react";
import {
  JSONUI_COMPATIBILITY_CORPUS,
  JsonUiCompatibilityExpectation
} from "@unislang/unifold-jsonui";

interface ParityCase {
  readonly id: string;
  readonly view: JsonUINode;
}

export const PARITY_CASES: readonly ParityCase[] = Object.freeze(
  JSONUI_COMPATIBILITY_CORPUS.filter(
    ({ expectation }) => expectation === JsonUiCompatibilityExpectation.Compatible
  ).map(({ id, view }) => ({ id, view: view as JsonUINode }))
);
