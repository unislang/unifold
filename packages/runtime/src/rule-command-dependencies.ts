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

const BASE_PROPERTY_POINTERS: Readonly<Record<string, readonly string[]>> = {
  disabled: ["/base/disabled", "/base/ownDisabled"],
  readonly: ["/base/readonly"]
};

const RESOLVERS = new Map<UiCommandType, DependencyResolver>([
  [UiCommandType.ControlCollectionInsert, structuralDependencies],
  [UiCommandType.ControlCollectionMove, structuralDependencies],
  [UiCommandType.ControlCollectionRemove, structuralDependencies],
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
    { nodeId, pointer: "/base/ownDisabled" },
    { nodeId, pointer: "/control" }
  ];
}

function formDependencies(
  command: UiCommand,
  draft: UiNodeTransactionDraft
): readonly RuleDependency[] {
  const nodeId = commandNodeId(command);
  return [nodeId, ...draft.controlDescendantIds(nodeId)].map((id) => ({
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
  return (BASE_PROPERTY_POINTERS[property] ?? []).map((pointer) => ({ nodeId, pointer }));
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
