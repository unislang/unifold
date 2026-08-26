import type { UiCommand, UiEvent } from "@unislang/unifold-events";

export type UiMachineCommandFactory = (event: UiEvent) => UiCommand;

export class UiMachineCommandRegistry {
  private readonly factories = new Map<string, UiMachineCommandFactory>();

  register(id: string, factory: UiMachineCommandFactory): () => void {
    if (this.factories.has(id)) throw new Error(`Machine command is already registered: ${id}.`);
    this.factories.set(id, factory);
    return () => this.factories.delete(id);
  }

  create(id: string, event: UiEvent): UiCommand {
    return this.require(id)(event);
  }

  has(id: string): boolean {
    return this.factories.has(id);
  }

  private require(id: string): UiMachineCommandFactory {
    const factory = this.factories.get(id);
    if (factory === undefined) throw new Error(`Unknown machine command: ${id}.`);
    return factory;
  }
}

export function createMachineCommandRegistry(): UiMachineCommandRegistry {
  return new UiMachineCommandRegistry();
}
