import {
  UiCommandType,
  UiEventPhase,
  UiEventType,
  type UiCommand,
  type UiEvent
} from "@unislang/unifold-events";
import { FocusRestoreStatus } from "@unislang/unifold-renderer-dom";
import { UnifoldRuntime, type UiExecutionContext } from "@unislang/unifold-runtime";
import { describe, expect, it, vi } from "vitest";

import { ApplicationCommandController } from "./application-command-port.js";
import type { StoreCommandController } from "./store-command-port.js";

const context = {} as Required<UiExecutionContext>;

describe("ApplicationCommandController", () => {
  it("routes focus requests to the attached renderer", async () => {
    const restoreFocus = vi.fn(() => Promise.resolve(FocusRestoreStatus.Focused));
    const fallback = commandController();
    const commands = new ApplicationCommandController(fallback);
    commands.attach({ restoreFocus });

    await commands.execute({ id: "save", type: UiCommandType.FocusRequest }, context);

    expect(restoreFocus).toHaveBeenCalledWith("save");
    expect(fallback.execute).not.toHaveBeenCalled();
  });

  it("rejects a renderer result that did not acquire focus", async () => {
    const restoreFocus = vi.fn(() => Promise.resolve(FocusRestoreStatus.NotFocused));
    const commands = new ApplicationCommandController(commandController());
    commands.attach({ restoreFocus });

    await expect(
      commands.execute({ id: "missing", type: UiCommandType.FocusRequest }, context)
    ).rejects.toThrow("Focus request was not completed.");
  });
});

describe("ApplicationCommandController fallback and settlement", () => {
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

  it("maps verified renderer focus to truthful runtime effect settlement", async () => {
    await expectFocusSettlement(FocusRestoreStatus.Focused, UiEventType.EffectCompleted);
    await expectFocusSettlement(FocusRestoreStatus.NotFocused, UiEventType.EffectFailed);
  });
});

async function expectFocusSettlement(
  status: FocusRestoreStatus,
  terminal: UiEventType
): Promise<void> {
  const commands = new ApplicationCommandController(commandController());
  commands.attach({ restoreFocus: () => Promise.resolve(status) });
  const runtime = new UnifoldRuntime({ commandPort: commands, documentId: "focus-effects" });
  const events: UiEvent[] = [];
  runtime.events$.subscribe((event) => events.push(event));

  runtime.execute([{ id: "target", type: UiCommandType.FocusRequest }]);
  await vi.waitFor(() => expect(effectTypes(events)).toContain(terminal));
  expect(effectTypes(events)).toEqual([UiEventType.EffectRequested, terminal]);
}

function effectTypes(events: readonly UiEvent[]): readonly string[] {
  return events.filter(({ data }) => data.phase === UiEventPhase.Effect).map(({ type }) => type);
}

function commandController(): StoreCommandController {
  return { execute: vi.fn(), replace: vi.fn() };
}
