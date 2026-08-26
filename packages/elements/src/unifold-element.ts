import type { JsonObject, JsonValue } from "@unislang/unifold-contracts";
import {
  UiEventPhase,
  createUiEvent,
  type UiEvent,
  type UiEventSourceNode,
  type UiNodeSnapshot,
  type UiRuntimeContext
} from "@unislang/unifold-events";
import { LitElement, type PropertyDeclarations, type PropertyValues } from "lit";

import { ElementEventName, type ElementEventType } from "./enums.js";

/**
 * Shared runtime bridge for every Unifold custom element.
 *
 * @attr {string} data-testid - Stable host test selector supplied by the renderer.
 * @cssprop --unifold-color-text - Default component text color.
 * @cssprop --unifold-font-sans - Default component font family.
 * @cssprop --unifold-focus-width - Focus-ring width.
 * @cssprop --unifold-color-focus - Focus-ring color.
 */
export abstract class UnifoldElement extends LitElement {
  static override properties: PropertyDeclarations = {
    eventNode: { attribute: false, hasChanged: neverChanged },
    runtimeContext: { attribute: false, hasChanged: neverChanged }
  };

  /** @internal */
  declare eventNode?: UiNodeSnapshot;
  /** @internal */
  declare runtimeContext: UiRuntimeContext;
  private eventSequence = 0;
  private renderCount = 0;

  constructor() {
    super();
    this.runtimeContext = { documentId: "unmounted" };
  }

  protected emitUiEvent(type: ElementEventType, change: JsonObject): UiEvent {
    const event = this.createEvent(type, change);
    this.dispatchEvent(
      new CustomEvent(ElementEventName.UiEvent, {
        bubbles: true,
        composed: true,
        detail: event
      })
    );
    return event;
  }

  protected eventProperties(): JsonObject {
    return this.requireEventNode().properties;
  }

  protected eventValue(): JsonValue | undefined {
    return undefined;
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    this.renderCount += 1;
    this.dataset["unifoldRenderCount"] = String(this.renderCount);
  }

  private createEvent(type: ElementEventType, change: JsonObject): UiEvent {
    const node = this.requireEventNode();
    const eventId = createIdentifier();
    this.eventSequence += 1;
    return createUiEvent({
      id: eventId,
      source: `urn:unifold:component:${node.id}`,
      type,
      subject: node.id,
      time: new Date().toISOString(),
      correlationid: eventId,
      transactionid: createIdentifier(),
      sequence: this.eventSequence,
      staterevision: node.revision,
      data: {
        change,
        phase: UiEventPhase.Intent,
        runtime: this.runtimeContext,
        snapshot: this.createSnapshot(node),
        sourceNode: createSourceNode(node)
      }
    });
  }

  private createSnapshot(node: UiNodeSnapshot): UiNodeSnapshot {
    const snapshot = {
      ...node,
      attributes: readAttributes(this),
      properties: this.eventProperties()
    };
    const value = this.eventValue();
    if (node.control === undefined || value === undefined) return snapshot;
    return { ...snapshot, control: { ...node.control, rawValue: value, value } };
  }

  private requireEventNode(): UiNodeSnapshot {
    if (this.eventNode === undefined) throw new Error("Unifold event metadata is not configured.");
    return this.eventNode;
  }
}

function neverChanged(): boolean {
  return false;
}

function createIdentifier(): string {
  return globalThis.crypto.randomUUID();
}

function readAttributes(element: Element): Readonly<Record<string, string>> {
  return Object.freeze(
    Object.fromEntries([...element.attributes].map(({ name, value }) => [name, value]))
  );
}

export function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function createSourceNode(node: UiNodeSnapshot): UiEventSourceNode {
  const source = {
    id: node.id,
    instanceId: node.instanceId,
    kind: node.kind,
    scopePath: node.scopePath,
    type: node.type,
    version: node.definitionVersion
  };
  return node.parentId === undefined ? source : { ...source, parentId: node.parentId };
}
