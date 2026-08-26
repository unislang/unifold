export interface StaticDomFallback {
  restore(): void;
}

export function captureStaticDomFallback(container: HTMLElement): StaticDomFallback {
  const children = [...container.childNodes];
  const focused = focusedElement(container);
  return {
    restore: () => {
      container.replaceChildren(...children);
      focused?.focus();
    }
  };
}

function focusedElement(container: HTMLElement): HTMLElement | undefined {
  const active = container.ownerDocument.activeElement;
  if (active === null) return undefined;
  if (!container.contains(active)) return undefined;
  return active as HTMLElement;
}
