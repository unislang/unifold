import type { DataClassification, JsonObject, JsonValue } from "@unislang/unifold-contracts";
import type { UiNodeId, UiNodeSnapshot } from "./node.js";
import {
  CloudEventsSpecVersion,
  UiEventContentType,
  UiEventDisclosureMode,
  UiEventPhase,
  UiEventRedactionReason,
  UiEventType
} from "./enums.js";

export interface UiRuntimeContext {
  readonly documentId: string;
  readonly documentRevision?: string;
  readonly locale?: string;
  readonly surfaceId?: string;
}

export interface UiEventData<
  TChange extends JsonValue = JsonValue,
  TProperties extends JsonObject = JsonObject
> {
  readonly disclosure?: UiEventDisclosure;
  readonly phase: UiEventPhase;
  readonly sourceNode?: UiEventSourceNode;
  readonly snapshot?: UiNodeSnapshot<TProperties>;
  readonly change?: TChange;
  readonly runtime: UiRuntimeContext;
}

export interface UiEventDisclosure {
  readonly classification: DataClassification;
  readonly reason?: UiEventRedactionReason;
  readonly snapshotRevision: number;
  readonly mode: UiEventDisclosureMode;
}

export interface UiEventSourceNode {
  readonly id: UiNodeId;
  readonly instanceId: string;
  readonly kind: string;
  readonly parentId?: UiNodeId;
  readonly scopePath: readonly UiNodeId[];
  readonly type: string;
  readonly version: string;
}

export interface UiEvent<TData extends UiEventData = UiEventData> {
  readonly specversion: CloudEventsSpecVersion;
  readonly id: string;
  readonly source: string;
  readonly type: UiEventType | string;
  readonly subject?: string;
  readonly time: string;
  readonly datacontenttype: UiEventContentType;
  readonly dataschema?: string;
  readonly correlationid: string;
  readonly causationid?: string;
  readonly transactionid: string;
  readonly sequence: number;
  readonly staterevision: number;
  readonly traceparent?: string;
  readonly data: TData;
}

export interface UiEventInput<TData extends UiEventData = UiEventData> {
  readonly id: string;
  readonly source: string;
  readonly type: UiEventType | string;
  readonly subject?: string;
  readonly time: string;
  readonly dataschema?: string;
  readonly correlationid: string;
  readonly causationid?: string;
  readonly transactionid: string;
  readonly sequence: number;
  readonly staterevision: number;
  readonly traceparent?: string;
  readonly data: TData;
}

export function createUiEvent<TData extends UiEventData>(
  input: UiEventInput<TData>
): UiEvent<TData> {
  return Object.freeze({
    ...input,
    specversion: CloudEventsSpecVersion.V1,
    datacontenttype: UiEventContentType.Json
  });
}
