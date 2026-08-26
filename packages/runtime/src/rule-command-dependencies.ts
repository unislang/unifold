import { UiCommandType, type UiCommand } from "@unislang/unifold-events";
import type { UiNodeTransactionDraft } from "@unislang/unifold-reactivity";
import {
  dependencyKey,
  type CompiledRuleProgram,
  type RuleDependency
} from "@unislang/unifold-rules";

type DependencyResolver = (
  command: UiCommand,
  draft: UiNodeTransactionDraft,
  program: CompiledRuleProgram
) => readonly RuleDependency[];

const RESOLVERS = new Map<UiCommandType, DependencyResolver>([
  [UiCommandType.ControlMarkTouched, controlDependencies],
  [UiCommandType.ControlSetDisabled, disabledDependencies],
  [UiCommandType.ControlSetStatus, controlDependencies],
  [UiCommandType.ControlSetValue, controlDependencies],
  [UiCommandType.ControlValidationCancel, controlDependencies],
  [UiCommandType.ControlValidationResolve, controlDependencies],
  [UiCommandType.ControlValidationStart, controlDependencies],
  [UiCommandType.FormReset, formDependencies],
  [UiCommandType.FormSubmit, formDependencies],
  [UiCommandType.NodePatchProperties, propertyDependencies],
  [UiCommandType.StructureInstantiate, structuralDependencies],
  [UiCommandType.StructureReconcile, structuralDependencies],
  [UiCommandType.StructureRemove, structuralDependencies]
]);

export function ruleCommandDependencies(
  commands: readonly UiCommand[],
  draft: UiNodeTransactionDraft,
  program: CompiledRuleProgram
): readonly RuleDependency[] {
  const dependencies = commands.flatMap((command) => resolveCommand(command, draft, program));
  return uniqueDependencies(dependencies);
}

function resolveCommand(
  command: UiCommand,
  draft: UiNodeTransactionDraft,
  program: CompiledRuleProgram
): readonly RuleDependency[] {
  return RESOLVERS.get(command.type)?.(command, draft, program) ?? [];
}

function controlDependencies(command: UiCommand): readonly RuleDependency[] {
  return [{ nodeId: commandNodeId(command), pointer: "/control" }];
}

function disabledDependencies(command: UiCommand): readonly RuleDependency[] {
  const nodeId = commandNodeId(command);
  return [
    { nodeId, pointer: "/base/disabled" },
    { nodeId, pointer: "/control" }
  ];
}

function formDependencies(
  command: UiCommand,
  draft: UiNodeTransactionDraft
): readonly RuleDependency[] {
  const nodeId = commandNodeId(command);
  return [nodeId, ...draft.descendantIds(nodeId)].map((id) => ({
    nodeId: id,
    pointer: "/control"
  }));
}

function propertyDependencies(command: UiCommand): readonly RuleDependency[] {
  if (command.type !== UiCommandType.NodePatchProperties) return [];
  return Object.keys(command.properties).flatMap((property) => [
    {
      nodeId: command.id,
      pointer: `/properties/${escapePointerToken(property)}`
    },
    ...basePropertyDependency(command.id, property)
  ]);
}

function basePropertyDependency(nodeId: string, property: string): readonly RuleDependency[] {
  if (property !== "disabled" && property !== "readonly") return [];
  return [{ nodeId, pointer: `/base/${property}` }];
}

function structuralDependencies(
  _command: UiCommand,
  _draft: UiNodeTransactionDraft,
  program: CompiledRuleProgram
): readonly RuleDependency[] {
  return program.rules.flatMap(({ inputDependencies }) => inputDependencies);
}

function commandNodeId(command: UiCommand): string {
  return (command as UiCommand & { readonly id: string }).id;
}

function uniqueDependencies(dependencies: readonly RuleDependency[]): RuleDependency[] {
  const values = new Map(dependencies.map((dependency) => [dependencyKey(dependency), dependency]));
  return [...values.values()];
}

function escapePointerToken(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}
