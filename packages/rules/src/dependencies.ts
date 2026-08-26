import {
  UiDerivedRuleOutputKind,
  type UiDerivedRuleInputDefinition,
  type UiDerivedRuleOutputDefinition
} from "@unislang/unifold-contracts";

import type { RuleDependency } from "./types.js";

export function inputDependency(input: UiDerivedRuleInputDefinition): RuleDependency {
  return { nodeId: input.nodeId, pointer: input.pointer };
}

export function primaryOutputDependency(output: UiDerivedRuleOutputDefinition): RuleDependency {
  if (output.kind === UiDerivedRuleOutputKind.ControlSetDisabled) {
    return { nodeId: output.nodeId, pointer: "/base/disabled" };
  }
  if (output.kind === UiDerivedRuleOutputKind.ControlSetValue) {
    return { nodeId: output.nodeId, pointer: "/control/value" };
  }
  return { nodeId: output.nodeId, pointer: propertyPointer(output.property) };
}

export function outputDependencies(output: UiDerivedRuleOutputDefinition): RuleDependency[] {
  const primary = primaryOutputDependency(output);
  if (output.kind === UiDerivedRuleOutputKind.NodePatchProperty) return [primary];
  const control = { nodeId: output.nodeId, pointer: "/control" };
  return output.kind === UiDerivedRuleOutputKind.ControlSetValue ? [control] : [primary, control];
}

export function dependenciesOverlap(left: RuleDependency, right: RuleDependency): boolean {
  if (left.nodeId !== right.nodeId) return false;
  return pointersOverlap(left.pointer, right.pointer);
}

export function pointersOverlap(left: string, right: string): boolean {
  if (left === right) return true;
  return isPointerParent(left, right) || isPointerParent(right, left);
}

export function dependencyKey(dependency: RuleDependency): string {
  return JSON.stringify([dependency.nodeId, dependency.pointer]);
}

function isPointerParent(parent: string, child: string): boolean {
  return child.startsWith(`${parent}/`);
}

function propertyPointer(property: string): string {
  return `/properties/${property.replaceAll("~", "~0").replaceAll("/", "~1")}`;
}
