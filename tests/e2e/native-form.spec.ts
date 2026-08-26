import { ElementEventType, NativeFormValueOrigin } from "@unislang/unifold-elements";
import { expect, test, type UnifoldHarness } from "@unislang/unifold-playwright";

import { compositionNodeIds } from "./reference.scenarios.js";

test("projects committed scalar values into native FormData and form ownership", async ({
  page
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  expect(errors).toEqual([]);
  await page.getByLabel("Your name").fill("Ada");
  expect(await formDataFor(page.getByLabel("Your name"))).toEqual({
    biography: "",
    confirmName: "",
    contactPreference: "email",
    country: "us",
    name: "Ada"
  });
  expect(await verifyReassociation(page.getByLabel("Your name"))).toEqual({
    reassociated: true,
    restored: true
  });
  await setAncestorFieldsetDisabled(page.getByLabel("Your name"), true);
  await expect(page.getByLabel("Your name")).toBeDisabled();
  expect(await formDataFor(page.getByLabel("Your name"))).toEqual({});
  await setAncestorFieldsetDisabled(page.getByLabel("Your name"), false);
  await expect(page.getByLabel("Your name")).toBeEnabled();
});

test("commits one IME value and normalizes browser state restoration", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  const input = page.getByLabel("Confirm name");
  const before = await scalarInputCount(unifold, compositionNodeIds.confirmName);
  await dispatchImeSequence(input, "あ");
  await expect
    .poll(() => scalarInputCount(unifold, compositionNodeIds.confirmName))
    .toBe(before + 1);
  expect(await lastOrigin(unifold, compositionNodeIds.confirmName)).toBe(
    NativeFormValueOrigin.Input
  );
  await restoreHostState(input, "Ada", NativeFormValueOrigin.Restore);
  await expect(input).toHaveValue("Ada");
  expect(await lastOrigin(unifold, compositionNodeIds.confirmName)).toBe(
    NativeFormValueOrigin.Restore
  );
});

async function formDataFor(input: import("@playwright/test").Locator) {
  return input.evaluate((control) => {
    const root = control.getRootNode();
    if (!(root instanceof ShadowRoot)) throw new Error("Native control shadow root is missing.");
    const form = (root.host as NativeScalarHost).form;
    if (form === null) throw new Error("Native form association is missing.");
    return Object.fromEntries(new FormData(form).entries());
  });
}

async function verifyReassociation(input: import("@playwright/test").Locator) {
  return input.evaluate((control) => {
    const root = control.getRootNode();
    if (!(root instanceof ShadowRoot)) throw new Error("Native control shadow root is missing.");
    const host = root.host as NativeScalarHost;
    const initial = host.form;
    if (initial === null) throw new Error("Native form association is missing.");
    const alternate = control.ownerDocument.createElement("form");
    alternate.id = "alternate-native-form";
    initial.after(alternate);
    host.setAttribute("form", alternate.id);
    const reassociated = host.form === alternate;
    host.removeAttribute("form");
    const restored = host.form === initial;
    alternate.remove();
    return { reassociated, restored };
  });
}

async function setAncestorFieldsetDisabled(
  input: import("@playwright/test").Locator,
  disabled: boolean
): Promise<void> {
  await input.evaluate((control, value) => {
    const root = control.getRootNode();
    if (!(root instanceof ShadowRoot)) throw new Error("Native control shadow root is missing.");
    const fieldset = root.host.closest("fieldset");
    if (!(fieldset instanceof HTMLFieldSetElement)) throw new Error("Native fieldset is missing.");
    fieldset.disabled = value;
  }, disabled);
}

async function dispatchImeSequence(
  input: import("@playwright/test").Locator,
  value: string
): Promise<void> {
  await input.evaluate((control, next) => {
    if (!(control instanceof HTMLInputElement)) throw new Error("Native text input is missing.");
    control.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    control.value = next;
    control.dispatchEvent(new InputEvent("input", { bubbles: true, isComposing: true }));
    control.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: next }));
    control.dispatchEvent(new InputEvent("input", { bubbles: true }));
  }, value);
}

async function restoreHostState(
  input: import("@playwright/test").Locator,
  value: string,
  origin: NativeFormValueOrigin
): Promise<void> {
  await input.evaluate(
    (control, state) => {
      const root = control.getRootNode();
      if (!(root instanceof ShadowRoot)) throw new Error("Native control shadow root is missing.");
      (root.host as NativeScalarHost).formStateRestoreCallback(state.value, state.origin);
    },
    { origin, value }
  );
}

async function scalarInputCount(unifold: UnifoldHarness, id: string): Promise<number> {
  return (await unifold.events()).filter((event) => isScalarInput(event, id)).length;
}

async function lastOrigin(unifold: UnifoldHarness, id: string): Promise<unknown> {
  const event = [...(await unifold.events())]
    .reverse()
    .find((candidate) => isScalarInput(candidate, id));
  const change = event?.data.change;
  return isJsonObject(change) ? change["origin"] : undefined;
}

function isJsonObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function isScalarInput(
  event: Awaited<ReturnType<UnifoldHarness["events"]>>[number],
  id: string
): boolean {
  return event.type === ElementEventType.ControlInput && event.data.sourceNode?.id === id;
}

interface NativeScalarHost extends HTMLElement {
  readonly form: HTMLFormElement | null;
  formStateRestoreCallback(state: string, mode: string): void;
}
