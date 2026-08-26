import { css } from "lit";

import { focusRing, hostDefaults, validationStyles } from "./styles.js";

export const searchResultsStyles = [
  hostDefaults,
  focusRing,
  validationStyles,
  css`
    :host {
      display: block;
    }
    label,
    [part="result"] {
      display: grid;
    }
    label {
      gap: var(--unifold-space-1, 0.25rem);
    }
    input {
      border: 1px solid var(--unifold-color-border, #9ca3af);
      border-radius: var(--unifold-radius-md, 0.375rem);
      color: inherit;
      font: inherit;
      padding: var(--unifold-space-2, 0.5rem);
    }
    [part="status"] {
      margin-block: var(--unifold-space-2, 0.5rem);
    }
    [part="viewport"] {
      border: 1px solid var(--unifold-color-border, #d1d5db);
      overflow: auto;
      position: relative;
    }
    [part="spacer"] {
      pointer-events: none;
      width: 1px;
    }
    [part="window"] {
      left: 0;
      position: absolute;
      right: 0;
      top: 0;
    }
    [part="result"] {
      align-content: center;
      gap: var(--unifold-space-1, 0.25rem);
      padding-inline: var(--unifold-space-3, 0.75rem);
    }
    [part="result"][aria-selected="true"] {
      background: var(--unifold-color-surface-subtle, #f3f4f6);
    }
    [part="title"] {
      font-weight: 600;
    }
    [part="description"] {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    [part="empty"] {
      padding: var(--unifold-space-3, 0.75rem);
    }
  `
];
