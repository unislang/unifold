// @vitest-environment happy-dom
import type { UiEvent } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { ElementEventName, ElementEventType } from "./enums.js";
import { controlNode } from "./elements.test-data.js";
import { UnifoldFileInput } from "./file-input.js";

it("emits bounded metadata, retains trusted handles, and clears them on rollback", async () => {
  const input = await mount();
  configure(input);
  const events: UiEvent[] = [];
  input.addEventListener(ElementEventName.UiEvent, (event) => events.push(detail(event)));
  await input.updateComplete;
  const accepted = file("invoice.pdf", 4, "application/pdf");
  select(nativeInput(input), [accepted, file("large.pdf", 11, "application/pdf")]);
  nativeInput(input).dispatchEvent(new FocusEvent("blur"));
  const selectedId = assertMetadata(input);
  expect(input.resolveSelectedFile(selectedId)).toBe(accepted);
  expect(input.resolveSelectedFile("untrusted-id")).toBeUndefined();
  expect(events.map(({ type }) => type)).toEqual([
    ElementEventType.ControlInput,
    ElementEventType.ControlBlurred
  ]);
  expect(firstEvent(events).data.change).toMatchObject({
    rejectedCount: 1,
    selectedCount: 1,
    value: input.value
  });
  expect(JSON.stringify(events)).not.toContain("invoice.pdf");
  expect(shadowText(input)).not.toContain("invoice.pdf");
  input.value = [];
  await input.updateComplete;
  expect(input.resolveSelectedFile(selectedId)).toBeUndefined();
  expect(nativeInput(input).value).toBe("");
});

it("renders persisted metadata as requiring reselection without fabricating handles", async () => {
  const input = await mount();
  input.label = "Attachments";
  input.required = true;
  input.errorMessage = "Choose a file";
  input.value = [{ id: "00000000-0000-4000-8000-000000000001", size: 2, type: "application/pdf" }];
  await input.updateComplete;
  expect(nativeInput(input)).toMatchObject({ required: true, type: "file" });
  expect(nativeInput(input).getAttribute("aria-invalid")).toBe("true");
  expect(shadowText(input)).toContain("Reselect 1 file(s) before upload.");
  expect(input.resolveSelectedFile(firstMetadata(input).id)).toBeUndefined();
});

function configure(input: UnifoldFileInput): void {
  input.accept = ".pdf";
  input.maximumFileBytes = 10;
  input.multiple = true;
}

function assertMetadata(input: UnifoldFileInput): string {
  expect(input.value).toEqual([
    expect.objectContaining({ id: expect.any(String), size: 4, type: "application/pdf" })
  ]);
  return firstMetadata(input).id;
}

function firstMetadata(input: UnifoldFileInput) {
  const metadata = input.value[0];
  if (metadata === undefined) throw new Error("Selected metadata is missing.");
  return metadata;
}

function firstEvent(events: readonly UiEvent[]): UiEvent {
  const event = events[0];
  if (event === undefined) throw new Error("Canonical input event is missing.");
  return event;
}

function shadowText(input: UnifoldFileInput): string {
  return input.shadowRoot?.textContent ?? "";
}

async function mount(): Promise<UnifoldFileInput> {
  if (!customElements.get("unifold-file-input"))
    customElements.define("unifold-file-input", UnifoldFileInput);
  const input = document.createElement("unifold-file-input") as UnifoldFileInput;
  input.id = "files";
  input.eventNode = controlNode("files", []);
  document.body.append(input);
  await input.updateComplete;
  return input;
}

function nativeInput(input: UnifoldFileInput): HTMLInputElement {
  const native = input.shadowRoot?.querySelector("input");
  if (!(native instanceof HTMLInputElement)) throw new Error("File input is missing.");
  return native;
}

function select(input: HTMLInputElement, files: readonly File[]): void {
  Object.defineProperty(input, "files", { configurable: true, value: files });
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function file(name: string, size: number, type: string): File {
  return new File([new Uint8Array(size)], name, { lastModified: 10, type });
}

function detail(event: Event): UiEvent {
  return (event as CustomEvent<UiEvent>).detail;
}
