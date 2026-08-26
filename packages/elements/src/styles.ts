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
