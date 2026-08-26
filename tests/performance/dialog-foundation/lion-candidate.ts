import "@lion/ui/define/lion-dialog.js";

export async function mountLionDialogCandidate(container: HTMLElement): Promise<HTMLElement> {
  const dialog = document.createElement("lion-dialog");
  const trigger = document.createElement("button");
  trigger.slot = "invoker";
  trigger.textContent = "Open account review";
  const content = document.createElement("section");
  content.slot = "content";
  content.setAttribute("aria-label", "Account review");
  const dismiss = document.createElement("button");
  dismiss.textContent = "Close account review";
  dismiss.addEventListener("click", () => dismissOverlay(dismiss));
  content.append(dismiss, document.createTextNode("Review account changes."));
  dialog.append(trigger, content);
  container.append(dialog);
  await updateComplete(dialog);
  return dialog;
}

function dismissOverlay(source: HTMLElement): void {
  source.dispatchEvent(new Event("close-overlay", { bubbles: true, composed: true }));
}

function updateComplete(element: HTMLElement): Promise<unknown> {
  return (
    (element as HTMLElement & { updateComplete?: Promise<unknown> }).updateComplete ??
    Promise.resolve()
  );
}

Reflect.set(globalThis, "__mountLionDialogFoundation", mountLionDialogCandidate);
