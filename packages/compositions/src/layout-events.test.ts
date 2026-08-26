import { UiComponentEventBinding } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { CompositionDiagnosticCode } from "./enums.js";
import { resolveLayoutEvents } from "./layout-events.js";

it("canonicalizes valid event aliases", () => {
  const diagnostics: Parameters<typeof resolveLayoutEvents>[2] = [];
  expect(resolveLayoutEvents({ onClick: "SAVE" }, "/events", diagnostics)).toEqual({
    events: { [UiComponentEventBinding.Activated]: "SAVE" }
  });
  expect(diagnostics).toEqual([]);
});

it("rejects invalid event containers, aliases, and targets", () => {
  const diagnostics: Parameters<typeof resolveLayoutEvents>[2] = [];
  expect(resolveLayoutEvents([], "/events", diagnostics)).toBeUndefined();
  expect(
    resolveLayoutEvents({ onMagic: "GO", onSubmit: "constructor" }, "/events", diagnostics)
  ).toEqual({});
  expect(diagnostics.map(({ code }) => code)).toEqual([
    CompositionDiagnosticCode.InvalidLayoutEvent,
    CompositionDiagnosticCode.InvalidLayoutEvent,
    CompositionDiagnosticCode.InvalidLayoutEvent
  ]);
});
