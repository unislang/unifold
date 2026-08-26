import type { PropertyDeclarations } from "lit";

import { UnifoldElement } from "./unifold-element.js";

export abstract class UnifoldLayoutElement extends UnifoldElement {
  static override properties: PropertyDeclarations = { label: {} };

  declare label: string;

  constructor() {
    super();
    this.label = "";
  }

  protected groupRole() {
    return this.label === "" ? undefined : "group";
  }

  protected groupLabel() {
    return this.label === "" ? undefined : this.label;
  }

  protected override eventProperties() {
    return { ...super.eventProperties(), label: this.label };
  }
}
