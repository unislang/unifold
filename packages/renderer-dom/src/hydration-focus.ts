export interface StaticHydrationFocusState {
  readonly focusedControlIndex?: number;
  readonly focusedNodeId?: string;
}

const CONTROL_ATTRIBUTE = "data-unifold-static-control";
const NODE_ATTRIBUTE = "data-unifold-static-node-id";

export function captureStaticHydrationFocus(root: HTMLElement): StaticHydrationFocusState {
  const active = focusedElement(root);
  if (active === undefined) return {};
  return captureFocusedNode(active);
}

function focusedElement(root: HTMLElement): HTMLElement | undefined {
  const local = root.querySelector<HTMLElement>(":focus");
  if (local !== null) return local;
  return undefined;
}

function captureFocusedNode(active: HTMLElement): StaticHydrationFocusState {
  const node = active.closest<HTMLElement>(`[${NODE_ATTRIBUTE}]`);
  if (node === null) return {};
  return focusState(node, active);
}

function focusState(node: HTMLElement, active: HTMLElement): StaticHydrationFocusState {
  const focusedNodeId = node.getAttribute(NODE_ATTRIBUTE);
  if (focusedNodeId === null) return {};
  const focusedControlIndex = ownedControls(node).indexOf(active);
  return focusedControlIndex < 0 ? { focusedNodeId } : { focusedControlIndex, focusedNodeId };
}

function ownedControls(node: HTMLElement): readonly HTMLElement[] {
  return [...node.querySelectorAll<HTMLElement>(`[${CONTROL_ATTRIBUTE}]`)].filter(
    (control) => control.closest(`[${NODE_ATTRIBUTE}]`) === node
  );
}
