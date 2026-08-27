import { UiCommandType, type UiCommand } from "@unislang/unifold-events";
import type { UiExecutionContext } from "@unislang/unifold-runtime";
import { describe, expect, it, vi } from "vitest";

import { ApplicationCommandController } from "./application-command-port.js";
import type { StoreCommandController } from "./store-command-port.js";

const context = {} as Required<UiExecutionContext>;

describe("ApplicationCommandController", () => {
  it("routes focus requests to the attached renderer", async () => {
    const restoreFocus = vi.fn(() => Promise.resolve());
    const fallback = commandController();
    const commands = new ApplicationCommandController(fallback);
    commands.attach({ restoreFocus });

    await commands.execute({ id: "save", type: UiCommandType.FocusRequest }, context);

    expect(restoreFocus).toHaveBeenCalledWith("save");
    expect(fallback.execute).not.toHaveBeenCalled();
  });

  it("forwards non-focus commands and document replacement", () => {
    const fallback = commandController();
    const commands = new ApplicationCommandController(fallback);
    const command = { capability: "save", input: {}, type: UiCommandType.EffectInvoke } as const;

    commands.execute(command, context);
    commands.replace({} as never, {} as never);

    expect(fallback.execute).toHaveBeenCalledWith(command, context);
    expect(fallback.replace).toHaveBeenCalledOnce();
  });

  it("rejects focus before a renderer is attached", () => {
    const commands = new ApplicationCommandController(commandController());
    const focus: UiCommand = { id: "save", type: UiCommandType.FocusRequest };

    expect(() => commands.execute(focus, context)).toThrow("Application renderer is not attached.");
  });
});

function commandController(): StoreCommandController {
  return { execute: vi.fn(), replace: vi.fn() };
}
