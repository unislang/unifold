// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";

import { restoreRenderedFocus, type RenderedFocusRequest } from "./focus-restore.js";
import { FocusRestoreStatus, type UnifoldElementHost } from "./types.js";

it("settles focused only after deepest DOM focus is acquired", async () => {
  const fixture = focusFixture();

  await expect(restoreRenderedFocus(fixture.request)).resolves.toBe(FocusRestoreStatus.Focused);
  expect(document.activeElement).toBe(fixture.button);
});

it("does not focus a missing or natively refusing target", async () => {
  const missing = focusFixture();
  missing.current = undefined;
  await expect(restoreRenderedFocus(missing.request)).resolves.toBe(FocusRestoreStatus.NotFocused);

  const refusing = focusFixture();
  vi.spyOn(refusing.button, "focus").mockImplementation(() => undefined);
  await expect(restoreRenderedFocus(refusing.request)).resolves.toBe(FocusRestoreStatus.NotFocused);
});

it("does not steal focus after the user moves during an update", async () => {
  const update = deferred<boolean>();
  const fixture = focusFixture(update.promise);
  const other = document.createElement("button");
  document.body.append(other);

  const settlement = restoreRenderedFocus(fixture.request);
  await Promise.resolve();
  other.focus();
  update.resolve(true);

  await expect(settlement).resolves.toBe(FocusRestoreStatus.NotFocused);
  expect(document.activeElement).toBe(other);
});

it("waits for an accepted pending definition before focusing", async () => {
  const definition = deferred<CustomElementConstructor>();
  const fixture = focusFixture();
  fixture.button.remove();
  const registered: { current: CustomElementConstructor | undefined } = { current: undefined };
  const request = pendingRequest(
    fixture,
    definition.promise,
    () => registered.current,
    () => true
  );
  const settlement = restoreRenderedFocus(request);
  let settled = false;
  void settlement.then(() => {
    settled = true;
  });

  await Promise.resolve();
  expect(settled).toBe(false);
  fixture.element.append(fixture.button);
  registered.current = class extends HTMLElement {};
  definition.resolve(registered.current);

  await expect(settlement).resolves.toBe(FocusRestoreStatus.Focused);
});

it("does not steal focus while a pending definition settles", async () => {
  const definition = deferred<CustomElementConstructor>();
  const fixture = focusFixture();
  const pending = class extends HTMLElement {};
  const request = pendingRequest(
    fixture,
    definition.promise,
    () => undefined,
    () => true
  );
  const settlement = restoreRenderedFocus(request);
  const other = document.createElement("button");
  document.body.append(other);
  other.focus();
  definition.resolve(pending);

  await expect(settlement).resolves.toBe(FocusRestoreStatus.NotFocused);
  expect(document.activeElement).toBe(other);
});

it("rejects an incompatible pending definition", async () => {
  const fixture = focusFixture();
  const definition = class extends HTMLElement {};
  const request = pendingRequest(
    fixture,
    Promise.resolve(definition),
    () => definition,
    () => false
  );

  await expect(restoreRenderedFocus(request)).resolves.toBe(FocusRestoreStatus.NotFocused);
});

function focusFixture(updateComplete?: Promise<boolean>) {
  const element = document.createElement("section") as UnifoldElementHost;
  const button = document.createElement("button");
  element.append(button);
  if (updateComplete !== undefined) Reflect.set(element, "updateComplete", updateComplete);
  document.body.replaceChildren(element);
  let current: UnifoldElementHost | undefined = element;
  const request: RenderedFocusRequest = {
    controlIndex: undefined,
    currentElement: () => current,
    element,
    pendingDefinitions: undefined,
    tagName: "unifold-button"
  };
  return {
    button,
    get current() {
      return current;
    },
    set current(value: UnifoldElementHost | undefined) {
      current = value;
    },
    element,
    request
  };
}

function pendingRequest(
  fixture: ReturnType<typeof focusFixture>,
  whenDefined: Promise<CustomElementConstructor>,
  get: () => CustomElementConstructor | undefined,
  acceptsDefinition: () => boolean
): RenderedFocusRequest {
  return {
    ...fixture.request,
    pendingDefinitions: { acceptsDefinition, registry: { get, whenDefined: () => whenDefined } }
  };
}

function deferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}
