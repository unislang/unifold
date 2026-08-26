import type { WorkflowStep } from "@unislang/unifold-catalog";

export function currentStepIndex(steps: readonly WorkflowStep[], value: string): number {
  const selected = steps.findIndex(({ id }) => id === value);
  return selected < 0 ? 0 : selected;
}

export function preferredStepIndex(
  steps: readonly WorkflowStep[],
  value: string,
  previousId: string
): number {
  const previous = steps.findIndex(({ id }) => id === previousId && !isDisabled(steps, id));
  return previous < 0 ? currentStepIndex(steps, value) : previous;
}

export function nextEnabledStepIndex(
  steps: readonly WorkflowStep[],
  start: number,
  direction: -1 | 1
): number {
  const indexes = steps.map((_, index) => index);
  const candidates = direction === 1 ? indexes.slice(start + 1) : indexes.slice(0, start).reverse();
  return candidates.find((index) => steps[index]?.disabled !== true) ?? start;
}

export function boundaryStepIndex(
  steps: readonly WorkflowStep[],
  boundary: "first" | "last"
): number {
  const direction = boundary === "first" ? 1 : -1;
  const start = boundary === "first" ? -1 : steps.length;
  return nextEnabledStepIndex(steps, start, direction);
}

export function keyboardStepIndex(
  steps: readonly WorkflowStep[],
  activeIndex: number,
  key: string,
  vertical: boolean
): number | undefined {
  const directionKeys = vertical ? { ArrowDown: 1, ArrowUp: -1 } : { ArrowLeft: -1, ArrowRight: 1 };
  return {
    ...directionIndexes(steps, activeIndex, directionKeys),
    End: boundaryStepIndex(steps, "last"),
    Home: boundaryStepIndex(steps, "first")
  }[key];
}

function directionIndexes(
  steps: readonly WorkflowStep[],
  activeIndex: number,
  keys: Readonly<Record<string, number>>
): Readonly<Record<string, number>> {
  return Object.fromEntries(
    Object.entries(keys).map(([key, direction]) => [
      key,
      nextEnabledStepIndex(steps, activeIndex, direction as -1 | 1)
    ])
  );
}

function isDisabled(steps: readonly WorkflowStep[], id: string): boolean {
  return steps.find(({ id: stepId }) => stepId === id)?.disabled === true;
}
