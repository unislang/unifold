import { UiCommandType, type UiCommand } from "@unislang/unifold-events";
import type { UnifoldIrDocument } from "@unislang/unifold-ir";
import type { DomRenderController } from "@unislang/unifold-renderer-dom";
import type { UiExecutionContext } from "@unislang/unifold-runtime";

import type { StoreCommandController } from "./store-command-port.js";
import type { PreparedApplicationStores } from "./store-adapters.js";

export class ApplicationCommandController implements StoreCommandController {
  #renderer: Pick<DomRenderController, "restoreFocus"> | undefined;

  constructor(readonly storeCommands: StoreCommandController) {}

  attach(renderer: Pick<DomRenderController, "restoreFocus">): void {
    this.#renderer = renderer;
  }

  execute(command: UiCommand, context: Required<UiExecutionContext>): Promise<void> | void {
    if (command.type !== UiCommandType.FocusRequest)
      return this.storeCommands.execute(command, context);
    if (this.#renderer === undefined) throw new Error("Application renderer is not attached.");
    return this.#renderer.restoreFocus(command.id);
  }

  replace(document: UnifoldIrDocument, stores: PreparedApplicationStores): void {
    this.storeCommands.replace(document, stores);
  }
}
