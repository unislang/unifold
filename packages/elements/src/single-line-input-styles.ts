import { css } from "lit";

import { focusRing, hostDefaults, validationStyles } from "./styles.js";

export const singleLineInputStyles = [
  hostDefaults,
  focusRing,
  validationStyles,
  css`
    label {
      display: grid;
      font-weight: 600;
      gap: var(--unifold-space-1, 0.25rem);
    }
    input {
      background: var(--unifold-color-surface, #ffffff);
      border: 1px solid var(--unifold-color-border, #6b7280);
      border-radius: var(--unifold-radius-sm, 0.375rem);
      color: var(--unifold-color-text, #111827);
      font: inherit;
      min-height: var(--unifold-control-min-height, 2.75rem);
      padding: var(--unifold-space-2, 0.5rem) var(--unifold-space-3, 0.75rem);
    }
    input[aria-invalid="true"] {
      border-color: var(--unifold-color-danger, #b91c1c);
    }
  `
];
