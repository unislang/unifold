import { ImageFit, ImageLoading, isSafeResourceUrl } from "@unislang/unifold-catalog";
import { css, html, nothing, type PropertyDeclarations } from "lit";

import { hostDefaults } from "./styles.js";
import { UnifoldElement } from "./unifold-element.js";

/**
 * Renders one native dimensioned image through the catalog resource-URL policy.
 *
 * @tagname unifold-image
 * @csspart image - Native image element.
 */
export class UnifoldImage extends UnifoldElement {
  static override properties: PropertyDeclarations = {
    alt: {},
    fit: { reflect: true },
    height: { type: Number },
    loading: { reflect: true },
    src: {},
    width: { type: Number }
  };

  static override styles = [
    hostDefaults,
    css`
      :host {
        display: block;
      }
      img {
        display: block;
        height: auto;
        max-width: 100%;
        object-fit: var(--unifold-image-fit, cover);
      }
      :host([fit="contain"]) img {
        --unifold-image-fit: contain;
      }
    `
  ];

  declare alt: string;
  declare fit: ImageFit;
  declare height: number;
  declare loading: ImageLoading;
  declare src: string;
  declare width: number;

  constructor() {
    super();
    this.alt = "";
    this.fit = ImageFit.Cover;
    this.height = 1;
    this.loading = ImageLoading.Lazy;
    this.src = "";
    this.width = 1;
  }

  protected override render() {
    return html`<img
      part="image"
      alt=${this.alt}
      decoding="async"
      height=${this.safeDimension(this.height)}
      loading=${this.loading}
      src=${this.safeSource() || nothing}
      width=${this.safeDimension(this.width)}
    />`;
  }

  protected override eventProperties() {
    return {
      ...super.eventProperties(),
      alt: this.alt,
      fit: this.fit,
      height: this.height,
      loading: this.loading,
      src: this.src,
      width: this.width
    };
  }

  private safeDimension(value: number): number {
    return Number.isSafeInteger(value) && value > 0 ? value : 1;
  }

  private safeSource(): string {
    return isSafeResourceUrl(this.src) ? this.src : "";
  }
}
