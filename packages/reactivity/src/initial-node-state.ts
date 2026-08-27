import type { UiNodeId, UiNodeSnapshot, UiValidationError } from "@unislang/unifold-events";
import { freeze, produce } from "immer";
import { recomputeAggregateControls } from "./aggregate-controls.js";
import { reconcileEffectiveDisabled } from "./effective-disabled.js";
import { buildControlChildren } from "./normalized-control-topology.js";
import type {
  AggregateControlValidator,
  NormalizedNodeState,
  UiNodeTransactionDraft
} from "./store-types.js";
import { NodeTransactionDraft } from "./transaction-draft.js";
import { reconcileValidationRoutes } from "./validation-routes.js";

export function createInitialNodeState(
  nodes: readonly UiNodeSnapshot[],
  validateAggregate?: AggregateControlValidator,
  validateControl?: AggregateControlValidator,
  initializer?: (draft: UiNodeTransactionDraft) => void
): NormalizedNodeState {
  const state = createEmptyState();
  nodes.forEach((node) => addInitialNode(state, node));
  state.controlChildren = buildControlChildren(nodes);
  nodes.forEach((node) => linkVisualParent(state.children, node));
  const aggregated = produce(state, (draft) => {
    const transaction = new NodeTransactionDraft(draft);
    reconcileEffectiveDisabled(draft, Object.keys(draft.nodes), validateControl);
    if (initializer !== undefined) initializer(transaction);
    reconcileEffectiveDisabled(draft, Object.keys(draft.nodes), validateControl);
    recomputeAggregateControls(draft, validateAggregate);
    reconcileValidationRoutes(draft);
  });
  return freeze(aggregated, true);
}

function createEmptyState(): {
  revision: number;
  nodes: Record<string, UiNodeSnapshot>;
  children: Record<string, UiNodeId[]>;
  controlChildren: Record<string, UiNodeId[]>;
  validationRoutes: Record<string, readonly UiValidationError[]>;
} {
  return {
    revision: 0,
    nodes: {},
    children: {},
    controlChildren: {},
    validationRoutes: {}
  };
}

function addInitialNode(
  state: {
    nodes: Record<string, UiNodeSnapshot>;
    children: Record<string, UiNodeId[]>;
    controlChildren: Record<string, UiNodeId[]>;
  },
  node: UiNodeSnapshot
): void {
  if (state.nodes[node.id]) throw new Error(`Duplicate node: ${node.id}`);
  state.nodes[node.id] = node;
  state.children[node.id] = [];
  state.controlChildren[node.id] = [...(node.controlChildIds ?? [])];
}

function linkVisualParent(children: Record<string, UiNodeId[]>, node: UiNodeSnapshot): void {
  if (node.parentId !== undefined) requireChildren(children, node.parentId).push(node.id);
}

function requireChildren(index: Readonly<Record<string, UiNodeId[]>>, id: UiNodeId): UiNodeId[] {
  const children = index[id];
  if (!children) throw new Error(`Unknown parent: ${id}`);
  return children;
}
