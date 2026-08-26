import { css } from "lit";

export const focusRing = css`
  :focus-visible {
    outline: var(--unifold-focus-width, 3px) solid var(--unifold-color-focus, #7c3aed);
    outline-offset: 2px;
  }
`;

export const hostDefaults = css`
  :host {
    box-sizing: border-box;
    color: var(--unifold-color-text, #111827);
    font-family: var(--unifold-font-sans, ui-sans-serif, system-ui, sans-serif);
  }

  *,
  *::before,
  *::after {
    box-sizing: inherit;
  }
`;

export const validationStyles = css`
  [role="alert"] {
    color: var(--unifold-color-danger, #b91c1c);
    font-size: 0.875rem;
  }
`;

export const layoutGapStyles = css`
  :host([gap="none"]) [part="container"] {
    gap: 0;
  }
  :host([gap="sm"]) [part="container"] {
    gap: var(--unifold-space-1, 0.25rem);
  }
  :host([gap="md"]) [part="container"] {
    gap: var(--unifold-space-2, 0.5rem);
  }
  :host([gap="lg"]) [part="container"] {
    gap: var(--unifold-space-3, 0.75rem);
  }
  :host([gap="xl"]) [part="container"] {
    gap: var(--unifold-space-4, 1rem);
  }
`;

export const comboboxStyles = css`
  .field {
    display: grid;
    gap: var(--unifold-space-1, 0.25rem);
    position: relative;
  }
  label {
    font-weight: 600;
  }
  input,
  [role="listbox"] {
    background: var(--unifold-color-surface, #ffffff);
    border: 1px solid var(--unifold-color-border, #6b7280);
    color: var(--unifold-color-text, #111827);
    font: inherit;
  }
  input {
    border-radius: var(--unifold-radius-sm, 0.375rem);
    min-height: var(--unifold-control-min-height, 2.75rem);
    padding: var(--unifold-space-2, 0.5rem) var(--unifold-space-3, 0.75rem);
  }
  [role="listbox"] {
    border-radius: var(--unifold-radius-sm, 0.375rem);
    box-sizing: border-box;
    max-height: 15rem;
    overflow-y: auto;
    width: 100%;
    z-index: 1;
  }
  [role="option"],
  [part="empty"] {
    font-weight: 400;
    padding: var(--unifold-space-2, 0.5rem) var(--unifold-space-3, 0.75rem);
  }
  [role="option"][data-active] {
    background: var(--unifold-color-primary, #1d4ed8);
    color: var(--unifold-color-on-primary, #ffffff);
  }
  [role="option"][aria-disabled="true"] {
    opacity: 0.55;
  }
  [hidden] {
    display: none;
  }
`;
