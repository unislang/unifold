import { UiMachineSchemaVersion } from "@unislang/unifold-contracts";

import { errorDiagnostic } from "./diagnostics.js";
import { DiagnosticCode } from "./enums.js";
import { isPlainObject } from "./json-safety.js";
import type { CompilerDiagnostic } from "./types.js";

const machineKeys = new Set(["id", "initial", "ownerId", "schemaVersion", "states", "version"]);
const stateKeys = new Set(["on"]);
const transitionKeys = new Set(["commands", "target"]);

export function validateMachineDefinitions(
  value: unknown,
  nodeIds: ReadonlySet<string>,
  diagnostics: CompilerDiagnostic[]
): void {
  if (value === undefined) return;
  if (!Array.isArray(value))
    return addInvalid("Machines must be an array.", "/machines", diagnostics);
  const ids = new Set<string>();
  value.forEach((machine, index) => validateMachine(machine, index, nodeIds, ids, diagnostics));
}

function validateMachine(
  value: unknown,
  index: number,
  nodeIds: ReadonlySet<string>,
  ids: Set<string>,
  diagnostics: CompilerDiagnostic[]
): void {
  const path = `/machines/${index}`;
  if (!isPlainObject(value)) return addInvalid("Machine must be an object.", path, diagnostics);
  validateKnownKeys(value, machineKeys, path, diagnostics);
  const id = requiredString(value["id"], `${path}/id`, diagnostics);
  validateUniqueId(id, ids, `${path}/id`, diagnostics);
  expectVersion(value["schemaVersion"], `${path}/schemaVersion`, diagnostics);
  requiredString(value["version"], `${path}/version`, diagnostics);
  validateOwner(value["ownerId"], nodeIds, `${path}/ownerId`, diagnostics);
  validateStates(value["states"], value["initial"], `${path}/states`, diagnostics);
}

function validateStates(
  value: unknown,
  initial: unknown,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  if (!isPlainObject(value) || Object.keys(value).length === 0) {
    return addInvalid("Machine states must be a non-empty object.", path, diagnostics);
  }
  const initialName = requiredString(initial, path.replace("/states", "/initial"), diagnostics);
  validateStateTarget(initialName, value, path.replace("/states", "/initial"), diagnostics);
  Object.entries(value).forEach(([name, state]) =>
    validateStateEntry(name, state, value, path, diagnostics)
  );
}

function validateStateEntry(
  name: string,
  state: unknown,
  states: Readonly<Record<string, unknown>>,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  const statePath = `${path}/${pointerSegment(name)}`;
  requiredString(name, statePath, diagnostics);
  validateState(state, states, statePath, diagnostics);
}

function validateState(
  value: unknown,
  states: Readonly<Record<string, unknown>>,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  if (!isPlainObject(value))
    return addInvalid("Machine state must be an object.", path, diagnostics);
  validateKnownKeys(value, stateKeys, path, diagnostics);
  validateTransitions(value["on"], states, `${path}/on`, diagnostics);
}

function validateTransitions(
  transitions: unknown,
  states: Readonly<Record<string, unknown>>,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  if (transitions === undefined) return;
  if (!isPlainObject(transitions))
    return addInvalid("State on must be an object.", path, diagnostics);
  Object.entries(transitions).forEach(([event, transition]) =>
    validateEventTransition(event, transition, states, path, diagnostics)
  );
}

function validateEventTransition(
  event: string,
  transition: unknown,
  states: Readonly<Record<string, unknown>>,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  const transitionPath = `${path}/${pointerSegment(event)}`;
  requiredString(event, transitionPath, diagnostics);
  validateTransition(transition, states, transitionPath, diagnostics);
}

function validateTransition(
  value: unknown,
  states: Readonly<Record<string, unknown>>,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  if (!isPlainObject(value)) return addInvalid("Transition must be an object.", path, diagnostics);
  validateKnownKeys(value, transitionKeys, path, diagnostics);
  const target = requiredString(value["target"], `${path}/target`, diagnostics);
  validateStateTarget(target, states, `${path}/target`, diagnostics);
  validateCommands(value["commands"], `${path}/commands`, diagnostics);
}

function validateCommands(value: unknown, path: string, diagnostics: CompilerDiagnostic[]): void {
  if (value === undefined) return;
  if (!Array.isArray(value))
    return addInvalid("Transition commands must be an array.", path, diagnostics);
  value.forEach((command, index) => requiredString(command, `${path}/${index}`, diagnostics));
}

function validateOwner(
  value: unknown,
  nodeIds: ReadonlySet<string>,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  const ownerId = requiredString(value, path, diagnostics);
  if (ownerId === undefined || nodeIds.has(ownerId)) return;
  diagnostics.push(
    errorDiagnostic(DiagnosticCode.UnknownMachineOwner, `Unknown machine owner "${ownerId}".`, path)
  );
}

function validateUniqueId(
  id: string | undefined,
  ids: Set<string>,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  if (id === undefined) return;
  if (ids.has(id)) {
    diagnostics.push(
      errorDiagnostic(DiagnosticCode.DuplicateMachineId, `Duplicate machine "${id}".`, path)
    );
  }
  ids.add(id);
}

function validateStateTarget(
  target: string | undefined,
  states: Readonly<Record<string, unknown>>,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  if (target === undefined || Object.hasOwn(states, target)) return;
  diagnostics.push(
    errorDiagnostic(DiagnosticCode.UnknownMachineState, `Unknown machine state "${target}".`, path)
  );
}

function expectVersion(value: unknown, path: string, diagnostics: CompilerDiagnostic[]): void {
  if (value === UiMachineSchemaVersion.Version1) return;
  addInvalid(
    `Expected machine schema version "${UiMachineSchemaVersion.Version1}".`,
    path,
    diagnostics
  );
}

function requiredString(
  value: unknown,
  path: string,
  diagnostics: CompilerDiagnostic[]
): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  addInvalid("Expected a non-empty string.", path, diagnostics);
  return undefined;
}

function addInvalid(message: string, path: string, diagnostics: CompilerDiagnostic[]): void {
  diagnostics.push(errorDiagnostic(DiagnosticCode.InvalidMachine, message, path));
}

function validateKnownKeys(
  value: Readonly<Record<string, unknown>>,
  allowed: ReadonlySet<string>,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  Object.keys(value).forEach((key) => {
    if (!allowed.has(key))
      addInvalid(`Unknown machine property "${key}".`, `${path}/${key}`, diagnostics);
  });
}

function pointerSegment(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}
