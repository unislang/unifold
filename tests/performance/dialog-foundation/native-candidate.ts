export function mountNativeDialogCandidate(container: HTMLElement): HTMLElement {
  const host = document.createElement("section");
  const trigger = button("Open account review");
  const dialog = document.createElement("dialog");
  dialog.setAttribute("aria-label", "Account review");
  const dismiss = button("Close account review");
  trigger.addEventListener("click", () => show(dialog));
  dismiss.addEventListener("click", () => close(dialog));
  dialog.append(dismiss, document.createTextNode("Review account changes."));
  host.append(trigger, dialog);
  container.append(host);
  return host;
}

function button(label: string): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = label;
  return element;
}

function show(dialog: HTMLDialogElement): void {
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function close(dialog: HTMLDialogElement): void {
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

Reflect.set(globalThis, "__mountNativeDialogFoundation", mountNativeDialogCandidate);
