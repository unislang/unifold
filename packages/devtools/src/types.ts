import type { JsonObject, JsonValue } from "@unislang/unifold-contracts";
import type {
  UiEvent,
  UiEventPhase,
  UiEventSourceNode,
  UiNodeSnapshot,
  UiTransactionRecord
} from "@unislang/unifold-events";

export enum DevtoolsProtocolVersion {
  Version1 = "1.0.0"
}

export enum DevtoolsProjectionMode {
  Full = "full",
  MetadataOnly = "metadata-only"
}

export enum DevtoolsReplayStatus {
  Diverged = "diverged",
  Invalid = "invalid",
  Succeeded = "succeeded"
}

export interface DevtoolsTimelineEntry {
  readonly capturedAt: string;
  readonly event: UiEvent;
  readonly transaction?: UiTransactionRecord;
}

export interface DevtoolsTimelineFilter {
  readonly causationId?: string;
  readonly correlationId?: string;
  readonly phase?: UiEventPhase;
  readonly scopeId?: string;
  readonly sourceNodeId?: string;
  readonly transactionId?: string;
  readonly type?: string;
}

export interface DevtoolsTimelineSnapshot {
  readonly dropped: number;
  readonly entries: readonly DevtoolsTimelineEntry[];
  readonly latestSequence: number;
  readonly oldestSequence: number;
}

export interface DevtoolsNodeInspection {
  readonly mode: DevtoolsProjectionMode;
  readonly source: UiEventSourceNode;
  readonly snapshot?: UiNodeSnapshot;
}

export interface DevtoolsNodeFilter {
  readonly limit?: number;
  readonly query?: string;
  readonly scopeId?: string;
}

export interface DevtoolsPatchOperation extends JsonObject {
  readonly from?: string;
  readonly op: "add" | "copy" | "move" | "remove" | "replace" | "test";
  readonly path: string;
  readonly value?: JsonValue;
}

export interface DevtoolsDocumentDiff extends JsonObject {
  readonly afterFingerprint: string;
  readonly beforeFingerprint: string;
  readonly operations: readonly DevtoolsPatchOperation[];
}

export interface DevtoolsReplayFrame extends JsonObject {
  readonly baseFingerprint: string;
  readonly expectedFingerprint: string;
  readonly operations: readonly DevtoolsPatchOperation[];
  readonly sequence: number;
}

export interface DevtoolsReplayPlan extends JsonObject {
  readonly frames: readonly DevtoolsReplayFrame[];
  readonly initialDocument: JsonObject;
  readonly protocolVersion: DevtoolsProtocolVersion;
}

export interface DevtoolsReplayValidationPort {
  validate(document: JsonObject): readonly string[];
}

export interface DevtoolsReplayResult {
  readonly appliedFrames: number;
  readonly diagnostics: readonly string[];
  readonly document?: JsonObject;
  readonly status: DevtoolsReplayStatus;
}
