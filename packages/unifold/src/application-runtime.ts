import { UiCommandType, type UiCommand } from "@unislang/unifold-events";
import { UnifoldRuntime, type UiExecutionContext } from "@unislang/unifold-runtime";

import type { UnifoldApplicationCommand, UnifoldApplicationRuntimePort } from "./types.js";

const APPLICATION_COMMAND_TYPES: ReadonlySet<UiCommandType> = new Set([
  UiCommandType.AnnouncementRequest,
  UiCommandType.ControlMarkTouched,
  UiCommandType.ControlSetDisabled,
  UiCommandType.ControlSetValue,
  UiCommandType.EffectInvoke,
  UiCommandType.FocusRequest,
  UiCommandType.FormReset,
  UiCommandType.FormSubmit,
  UiCommandType.NavigationRequest,
  UiCommandType.NodePatchProperties
]);

class ApplicationRuntimeFacade implements UnifoldApplicationRuntimePort {
  readonly composition: UnifoldRuntime["composition"];
  readonly control: UnifoldRuntime["control"];
  readonly events$: UnifoldRuntime["events$"];
  readonly getSnapshot: UnifoldRuntime["getSnapshot"];
  readonly getTransaction: UnifoldRuntime["getTransaction"];
  readonly getValidationErrors: UnifoldRuntime["getValidationErrors"];
  readonly inspect: UnifoldRuntime["inspect"];
  readonly node: UnifoldRuntime["node"];
  readonly registerActor: UnifoldRuntime["registerActor"];
  readonly scope: UnifoldRuntime["scope"];
  readonly select: UnifoldRuntime["select"];

  readonly #engine: UnifoldRuntime;

  constructor(engine: UnifoldRuntime) {
    this.#engine = engine;
    this.composition = engine.composition.bind(engine);
    this.control = engine.control.bind(engine);
    this.events$ = engine.events$;
    this.getSnapshot = engine.getSnapshot.bind(engine);
    this.getTransaction = engine.getTransaction.bind(engine);
    this.getValidationErrors = engine.getValidationErrors.bind(engine);
    this.inspect = engine.inspect.bind(engine);
    this.node = engine.node.bind(engine);
    this.registerActor = engine.registerActor.bind(engine);
    this.scope = engine.scope.bind(engine);
    this.select = engine.select.bind(engine);
    Object.freeze(this);
  }

  static engine(runtime: UnifoldApplicationRuntimePort): UnifoldRuntime {
    if (!(runtime instanceof ApplicationRuntimeFacade)) {
      throw new Error("Application runtime capability is invalid.");
    }
    return runtime.#engine;
  }

  get revision(): number {
    return this.#engine.revision;
  }

  get status() {
    return this.#engine.status;
  }

  execute(commands: readonly UnifoldApplicationCommand[], context: UiExecutionContext = {}) {
    const admitted = structuredClone(commands) as readonly UiCommand[];
    assertApplicationCommands(admitted);
    return this.#engine.execute(admitted, executionContext(context));
  }
}

export function createApplicationRuntime(engine: UnifoldRuntime): UnifoldApplicationRuntimePort {
  return new ApplicationRuntimeFacade(engine);
}

function assertApplicationCommands(commands: readonly UiCommand[]): void {
  const denied = commands.find(({ type }) => !APPLICATION_COMMAND_TYPES.has(type));
  if (denied === undefined) return;
  throw new Error("Mounted application command is not admitted.");
}

function executionContext(context: UiExecutionContext): UiExecutionContext {
  const { causationId, correlationId, transactionId } = context;
  return {
    ...optionalContextId("causationId", causationId),
    ...optionalContextId("correlationId", correlationId),
    ...optionalContextId("transactionId", transactionId)
  };
}

function optionalContextId<K extends string>(key: K, value: string | undefined) {
  return value === undefined ? {} : { [key]: value };
}

export function applicationRuntimeEngine(runtime: UnifoldApplicationRuntimePort): UnifoldRuntime {
  return ApplicationRuntimeFacade.engine(runtime);
}
