import "@spectrum-web-components/dialog/sp-dialog.js";
import "@spectrum-web-components/overlay/sp-overlay.js";

export async function mountSpectrumDialogCandidate(container: HTMLElement): Promise<HTMLElement> {
  const trigger = document.createElement("button");
  trigger.id = "spectrum-dialog-trigger";
  trigger.textContent = "Open account review";
  const overlay = document.createElement("sp-overlay");
  overlay.setAttribute("trigger", `${trigger.id}@click`);
  overlay.setAttribute("type", "modal");
  const dialog = document.createElement("sp-dialog");
  const heading = document.createElement("h2");
  heading.slot = "heading";
  heading.textContent = "Account review";
  const dismiss = document.createElement("button");
  dismiss.slot = "button";
  dismiss.textContent = "Close account review";
  dismiss.addEventListener("click", () => dismissOverlay(dismiss));
  dialog.append(heading, document.createTextNode("Review account changes."), dismiss);
  overlay.append(dialog);
  container.append(trigger, overlay);
  await Promise.all([updateComplete(overlay), updateComplete(dialog)]);
  return overlay;
}

function dismissOverlay(source: HTMLElement): void {
  source.dispatchEvent(new Event("close", { bubbles: true, composed: true }));
}

function updateComplete(element: HTMLElement): Promise<unknown> {
  return (
    (element as HTMLElement & { updateComplete?: Promise<unknown> }).updateComplete ??
    Promise.resolve()
  );
}

Reflect.set(globalThis, "__mountSpectrumDialogFoundation", mountSpectrumDialogCandidate);
