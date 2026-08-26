interface DisableableItem {
  readonly disabled?: boolean;
}

const horizontalKeys: Readonly<Record<string, -1 | 1>> = {
  ArrowLeft: -1,
  ArrowRight: 1
};
const verticalKeys: Readonly<Record<string, -1 | 1>> = {
  ArrowDown: 1,
  ArrowUp: -1
};

export function keyboardTabIndex(
  tabs: readonly DisableableItem[],
  activeIndex: number,
  key: string,
  vertical: boolean
): number | undefined {
  const boundary = boundaryForKey(tabs, key);
  if (boundary !== undefined) return boundary;
  const direction = directionForKey(key, vertical);
  if (direction === undefined) return undefined;
  return cyclicTabIndex(tabs, activeIndex, direction);
}

function boundaryForKey(tabs: readonly DisableableItem[], key: string): number | undefined {
  if (key === "Home") return boundaryTabIndex(tabs, false);
  if (key === "End") return boundaryTabIndex(tabs, true);
  return undefined;
}

function directionForKey(key: string, vertical: boolean): -1 | 1 | undefined {
  if (vertical) return verticalKeys[key];
  return horizontalKeys[key];
}

function boundaryTabIndex(tabs: readonly DisableableItem[], last: boolean): number {
  const enabled = enabledIndexes(tabs);
  const candidate = last ? enabled.at(-1) : enabled[0];
  return candidate ?? -1;
}

function cyclicTabIndex(
  tabs: readonly DisableableItem[],
  activeIndex: number,
  direction: -1 | 1
): number {
  const enabled = enabledIndexes(tabs);
  if (enabled.length === 0) return -1;
  const current = enabled.indexOf(activeIndex);
  const origin = current < 0 ? initialPosition(enabled.length, direction) : current + direction;
  return enabled[(origin + enabled.length) % enabled.length] as number;
}

function enabledIndexes(tabs: readonly DisableableItem[]): readonly number[] {
  return tabs.flatMap((tab, index) => (tab.disabled === true ? [] : [index]));
}

function initialPosition(length: number, direction: -1 | 1): number {
  return direction === 1 ? 0 : length - 1;
}
