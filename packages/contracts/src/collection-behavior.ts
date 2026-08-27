import type { JsonObject } from "./json.js";

export enum UiCollectionBehaviorVersion {
  Version1 = "1.0.0"
}

export interface UiCollectionBehaviorNode extends JsonObject {
  readonly collectionId: string;
  readonly emptyFocusTargetId: string;
}

export interface UiCollectionBehaviorDefinition extends JsonObject {
  readonly contractVersion: UiCollectionBehaviorVersion;
  readonly nodes: readonly UiCollectionBehaviorNode[];
}
