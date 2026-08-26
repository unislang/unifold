import { DEFAULT_MAXIMUM_FILE_BYTES, type FileMetadata } from "@unislang/unifold-catalog";
import { UiUpdateTrigger, type JsonObject } from "@unislang/unifold-contracts";
import { css, html, nothing, type PropertyDeclarations, type PropertyValues } from "lit";

import { ElementEventType } from "./enums.js";
import { sameFileMetadata, selectBoundedFiles } from "./file-selection.js";
import { focusRing, hostDefaults, validationStyles } from "./styles.js";
import { UnifoldElement } from "./unifold-element.js";

/**
 * Selects bounded local files while exposing only portable metadata to the runtime.
 *
 * @tagname unifold-file-input
 * @fires unifold-event - Canonical input and blur intents containing file metadata, never bytes.
 * @csspart input - Native file input.
 * @csspart selection - Selected metadata list or re-selection notice.
 */
export class UnifoldFileInput extends UnifoldElement {
  static override properties: PropertyDeclarations = {
    accept: {},
    asyncValidators: { attribute: false },
    disabled: { reflect: true, type: Boolean },
    errorMessage: { attribute: "error-message" },
    label: {},
    maximumFileBytes: { attribute: "maximum-file-bytes", type: Number },
    multiple: { reflect: true, type: Boolean },
    name: {},
    required: { reflect: true, type: Boolean },
    updateOn: { attribute: "update-on" },
    validators: { attribute: false },
    value: { attribute: false }
  };

  static override styles = [
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
        color: var(--unifold-color-text, #111827);
        font: inherit;
        min-height: var(--unifold-control-min-height, 2.75rem);
      }
      ul {
        margin-block: var(--unifold-space-1, 0.25rem) 0;
        padding-inline-start: var(--unifold-space-4, 1rem);
      }
      [data-reselect] {
        color: var(--unifold-color-warning, #92400e);
        margin-block: var(--unifold-space-1, 0.25rem) 0;
      }
    `
  ];

  declare accept: string;
  declare asyncValidators: readonly string[];
  declare disabled: boolean;
  declare errorMessage: string;
  declare label: string;
  declare maximumFileBytes: number;
  declare multiple: boolean;
  declare name: string;
  declare required: boolean;
  declare updateOn: UiUpdateTrigger;
  declare validators: readonly string[];
  declare value: readonly FileMetadata[];
  private files: readonly File[] = [];
  private selectedMetadata: readonly FileMetadata[] = [];

  constructor() {
    super();
    this.accept = "";
    this.asyncValidators = [];
    this.disabled = false;
    this.errorMessage = "";
    this.label = "";
    this.maximumFileBytes = DEFAULT_MAXIMUM_FILE_BYTES;
    this.multiple = false;
    this.name = "";
    this.required = false;
    this.updateOn = UiUpdateTrigger.Input;
    this.validators = [];
    this.value = [];
  }

  resolveSelectedFile(id: string): File | undefined {
    const index = this.selectedMetadata.findIndex((metadata) => metadata.id === id);
    return index < 0 ? undefined : this.files[index];
  }

  override disconnectedCallback(): void {
    this.clearFileHandles();
    super.disconnectedCallback();
  }

  protected override render() {
    const errorId = `${this.id}-error`;
    const selectionId = `${this.id}-selection`;
    return html`
      <label>
        <span>${this.label}</span>
        <input
          part="input"
          type="file"
          accept=${this.accept}
          aria-describedby=${`${selectionId} ${errorId}`}
          aria-invalid=${String(Boolean(this.errorMessage))}
          name=${this.name}
          ?disabled=${this.disabled}
          ?multiple=${this.multiple}
          ?required=${this.required}
          @change=${this.onFileChange}
          @blur=${this.onFileBlur}
        />
      </label>
      <div id=${selectionId} part="selection" aria-live="polite">${this.selectionContent()}</div>
      <span id=${errorId} role="alert">${this.errorMessage}</span>
    `;
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    if (changed.has("value") && !this.handlesMatchValue()) this.clearNativeSelection();
  }

  protected override eventProperties(): JsonObject {
    return {
      accept: this.accept,
      asyncValidators: this.asyncValidators,
      disabled: this.disabled,
      errorMessage: this.errorMessage,
      label: this.label,
      maximumFileBytes: this.maximumFileBytes,
      multiple: this.multiple,
      name: this.name,
      required: this.required,
      updateOn: this.updateOn,
      validators: this.validators,
      value: this.value
    };
  }

  protected override eventValue() {
    return this.value;
  }

  private selectionContent() {
    if (this.value.length === 0) return nothing;
    if (this.files.length === 0)
      return html`<p data-reselect>Reselect ${this.value.length} file(s) before upload.</p>`;
    return html`<ul aria-label="Selected files">
      ${this.value.map((file) => html`<li>${fileType(file.type)} (${file.size} bytes)</li>`)}
    </ul>`;
  }

  private readonly onFileChange = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    const selection = selectBoundedFiles(
      Array.from(input.files ?? []),
      this.accept,
      this.maximumFileBytes,
      this.multiple
    );
    this.files = selection.files;
    this.selectedMetadata = selection.metadata;
    this.value = selection.metadata;
    this.emitUiEvent(ElementEventType.ControlInput, {
      rejectedCount: selection.rejectedCount,
      selectedCount: selection.metadata.length,
      value: this.value
    });
  };

  private readonly onFileBlur = (): void => {
    this.emitUiEvent(ElementEventType.ControlBlurred, { value: this.value });
  };

  private handlesMatchValue(): boolean {
    return sameFileMetadata(this.value, this.selectedMetadata);
  }

  private clearNativeSelection(): void {
    this.clearFileHandles();
    const input = this.shadowRoot?.querySelector("input");
    if (input instanceof HTMLInputElement) input.value = "";
  }

  private clearFileHandles(): void {
    this.files = [];
    this.selectedMetadata = [];
  }
}

function fileType(type: string): string {
  return type.length === 0 ? "Unknown file type" : type;
}
