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
    biography: [""],
    confirmName: [""],
    contactPreference: ["email"],
    country: ["us"],
    name: ["Ada"],
    newsletter: [],
    skills: ["ts"]
  });
  expect(await verifyReassociation(page.getByLabel("Your name"))).toEqual({
    reassociated: true,
    restored: true
  });
  await setAncestorFieldsetDisabled(page.getByLabel("Your name"), true);
  await expect(page.getByLabel("Your name")).toBeDisabled();
  expect(await formDataFor(page.getByLabel("Your name"))).toEqual(emptyNamedFormData());
  await setAncestorFieldsetDisabled(page.getByLabel("Your name"), false);
  await expect(page.getByLabel("Your name")).toBeEnabled();
});

test("projects boolean and repeated values through one native form owner", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  const checkbox = page.getByLabel("Receive product updates");
  const skills = page.getByLabel("Skills");
  await checkbox.check();
  await skills.selectOption(["ts", "a11y"]);
  expect(await formDataFor(checkbox)).toMatchObject({
    newsletter: ["on"],
    skills: ["ts", "a11y"]
  });
  expect(await verifyReassociation(skills)).toEqual({ reassociated: true, restored: true });
  await setAncestorFieldsetDisabled(checkbox, true);
  await expect(checkbox).toBeDisabled();
  await expect(skills).toBeDisabled();
  expect(await formDataFor(checkbox)).toEqual(emptyNamedFormData());
  await setAncestorFieldsetDisabled(checkbox, false);
  await restoreHostState(checkbox, "false", NativeFormValueOrigin.Restore);
  await restoreHostState(skills, '["a11y"]', NativeFormValueOrigin.Restore);
  await expect(checkbox).not.toBeChecked();
  await expect(skills).toHaveValues(["a11y"]);
  expect(await lastOrigin(unifold, compositionNodeIds.checkbox)).toBe(
    NativeFormValueOrigin.Restore
  );
  expect(await lastOrigin(unifold, compositionNodeIds.multiSelect)).toBe(
    NativeFormValueOrigin.Restore
  );
});

test("submits live Files while canonical state remains metadata-only", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  const fileInput = page.getByLabel("Account attachments");
  const nameInput = page.getByLabel("Your name");
  await moveIntoReferenceForm(page, fileInput, nameInput);
  await selectPrivateFiles(fileInput);
  const selectedId = await selectedFileId(fileInput);
  await expectPrivateFileBoundary(fileInput, selectedId, unifold);
  await expectFileLifecycle(fileInput, selectedId);
});

async function selectPrivateFiles(fileInput: import("@playwright/test").Locator): Promise<void> {
  await fileInput.setInputFiles([
    {
      buffer: Buffer.from("first private payload"),
      mimeType: "application/pdf",
      name: "first.pdf"
    },
    {
      buffer: Buffer.from("second private payload"),
      mimeType: "application/pdf",
      name: "second.pdf"
    }
  ]);
}

async function expectPrivateFileBoundary(
  fileInput: import("@playwright/test").Locator,
  selectedId: string,
  unifold: UnifoldHarness
): Promise<void> {
  expect(await fileEntries(fileInput)).toEqual([
    { name: "first.pdf", size: 21, type: "application/pdf" },
    { name: "second.pdf", size: 22, type: "application/pdf" }
  ]);
  expect(await resolvedFileName(fileInput, selectedId)).toBe("first.pdf");
  const serializedEvents = JSON.stringify(await unifold.events());
  expect(serializedEvents).not.toContain("first.pdf");
  expect(serializedEvents).not.toContain("first private payload");
}

async function expectFileLifecycle(
  fileInput: import("@playwright/test").Locator,
  selectedId: string
): Promise<void> {
  await setAncestorFieldsetDisabled(fileInput, true);
  await expect(fileInput).toBeDisabled();
  expect(await fileEntries(fileInput)).toEqual([]);
  expect(await resolvedFileName(fileInput, selectedId)).toBe("first.pdf");
  await setAncestorFieldsetDisabled(fileInput, false);
  expect(await fileEntries(fileInput)).toHaveLength(2);
  await invokeFormReset(fileInput);
  await expect(fileInput).toHaveValue("");
  expect(await fileEntries(fileInput)).toEqual([]);
  expect(await resolvedFileName(fileInput, selectedId)).toBeUndefined();
}

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
    const data = new FormData(form);
    return Object.fromEntries(
      [
        "biography",
        "confirmName",
        "contactPreference",
        "country",
        "name",
        "newsletter",
        "skills"
      ].map((name) => [name, data.getAll(name).map(String)])
    );
  });
}

function emptyNamedFormData() {
  return {
    biography: [],
    confirmName: [],
    contactPreference: [],
    country: [],
    name: [],
    newsletter: [],
    skills: []
  };
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

async function moveIntoReferenceForm(
  page: import("@playwright/test").Page,
  fileInput: import("@playwright/test").Locator,
  nameInput: import("@playwright/test").Locator
): Promise<void> {
  const fileHost = await shadowHost(fileInput);
  const nameHost = await shadowHost(nameInput);
  const target = await nameHost.evaluateHandle((host) => host.parentElement);
  await page.evaluate(
    ([host, container]) => {
      if (!(host instanceof HTMLElement) || !(container instanceof HTMLElement))
        throw new Error("Native form move target is missing.");
      (host as HTMLElement & { name: string }).name = "attachments";
      container.append(host);
    },
    [fileHost, target]
  );
}

async function fileEntries(input: import("@playwright/test").Locator) {
  const host = await shadowHost(input);
  return host.evaluate((candidate) => {
    const form = (candidate as NativeScalarHost).form;
    if (form === null) throw new Error("File form association is missing.");
    return new FormData(form).getAll("attachments").map((entry) => {
      if (!(entry instanceof File)) throw new Error("Trusted File contribution is missing.");
      return { name: entry.name, size: entry.size, type: entry.type };
    });
  });
}

async function selectedFileId(input: import("@playwright/test").Locator): Promise<string> {
  const host = await shadowHost(input);
  return host.evaluate((candidate) => {
    const fileHost = candidate as HTMLElement & {
      readonly value: readonly { readonly id: string }[];
    };
    const id = fileHost.value[0]?.id;
    if (id === undefined) throw new Error("Selected file metadata is missing.");
    return id;
  });
}

async function resolvedFileName(
  input: import("@playwright/test").Locator,
  id: string
): Promise<string | undefined> {
  const host = await shadowHost(input);
  return host.evaluate((candidate, fileId) => {
    const fileHost = candidate as HTMLElement & {
      resolveSelectedFile(id: string): File | undefined;
    };
    return fileHost.resolveSelectedFile(fileId)?.name;
  }, id);
}

async function invokeFormReset(input: import("@playwright/test").Locator): Promise<void> {
  const host = await shadowHost(input);
  await host.evaluate((candidate) => {
    (candidate as NativeScalarHost & { formResetCallback(): void }).formResetCallback();
  });
}

async function shadowHost(input: import("@playwright/test").Locator) {
  return input.evaluateHandle((control) => {
    const root = control.getRootNode();
    if (!(root instanceof ShadowRoot)) throw new Error("Native control shadow root is missing.");
    return root.host as HTMLElement;
  });
}
