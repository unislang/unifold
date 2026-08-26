import { JsonUI, type JsonUINode } from "@jsonui/react";
import {
  UnifoldApplicationMountStatus,
  createMemoryStoreAdapter,
  mountUnifoldApplication,
  type UnifoldApplicationPort
} from "@unislang/unifold";
import {
  CoreCatalogName,
  CoreCatalogVersion,
  DataClassification,
  JsonUiProfileName,
  JsonUiProfileVersion,
  JsonUiUpstreamRevision,
  UiContractSchemaUri,
  UiSchemaVersion,
  UiStoreAccess,
  UiStoreInitialDataPolicy,
  UiStoreOwnership,
  UiStorePersistence,
  UiStoreSchemaVersion,
  UiStoreSourceKind
} from "@unislang/unifold-contracts";
import { createRoot } from "react-dom/client";

import { oracleComponents } from "./oracle-components.js";
import type { BehaviorParityResult, NormalizedCanonicalEvent } from "./types.js";

export const BEHAVIOR_PARITY_CASE_ID = "binding-validation-canonical-events";

export function mountBehaviorParity(root: HTMLElement): BehaviorParityResult {
  const section = document.createElement("section");
  section.dataset["parityCase"] = BEHAVIOR_PARITY_CASE_ID;
  const upstream = mountPoint(section, "upstream");
  const unifold = mountPoint(section, "unifold");
  root.append(section);
  createRoot(upstream).render(
    <JsonUI
      components={oracleComponents}
      defaultValues={{ data: initialData() }}
      model={upstreamBehaviorView()}
    />
  );
  return mountUnifoldBehavior(unifold);
}

function mountUnifoldBehavior(container: HTMLElement): BehaviorParityResult {
  const adapter = createMemoryStoreAdapter("1.0.0", initialData());
  const mounted = mountUnifoldApplication(unifoldBehaviorDocument(), container, {
    storeAdapters: { data: adapter }
  });
  if (mounted.status !== UnifoldApplicationMountStatus.Mounted) {
    throw new Error(`Behavior parity mount failed: ${JSON.stringify(mounted.diagnostics)}`);
  }
  return captureBehavior(mounted.application, adapter);
}

function captureBehavior(
  application: UnifoldApplicationPort,
  adapter: ReturnType<typeof createMemoryStoreAdapter>
): BehaviorParityResult {
  const result: MutableBehaviorParityResult = {
    canonicalEvents: [],
    unifoldStoreValue: readName(adapter.snapshot())
  };
  application.runtime.events$.subscribe((event) => {
    result.canonicalEvents.push(normalizeEvent(event));
    result.unifoldStoreValue = readName(adapter.snapshot());
  });
  return result;
}

function normalizeEvent(event: RuntimeEventLike): NormalizedCanonicalEvent {
  const sourceNodeId = readSourceNodeId(event);
  const commandType = readCommandType(event.data.change);
  const disclosureMode = readDisclosureMode(event);
  const redactionReason = readRedactionReason(event);
  return {
    correlationId: event.correlationid,
    hasSnapshot: event.data.snapshot !== undefined,
    id: event.id,
    phase: event.data.phase,
    sequence: event.sequence,
    source: event.source,
    stateRevision: event.staterevision,
    transactionId: event.transactionid,
    type: event.type,
    ...optionalStringField("causationId", event.causationid),
    ...optionalStringField("disclosureMode", disclosureMode),
    ...optionalStringField("redactionReason", redactionReason),
    ...optionalStringField("sourceNodeId", sourceNodeId),
    ...optionalStringField("commandType", commandType)
  };
}

function readSourceNodeId(event: RuntimeEventLike): string | undefined {
  return event.data.sourceNode?.id;
}

function readDisclosureMode(event: RuntimeEventLike): string | undefined {
  return event.data.disclosure?.mode;
}

function readRedactionReason(event: RuntimeEventLike): string | undefined {
  return event.data.disclosure?.reason;
}

function readCommandType(value: unknown): unknown {
  if (![typeof value === "object", value !== null, !Array.isArray(value)].every(Boolean)) {
    return undefined;
  }
  return Reflect.get(value as object, "commandType") as unknown;
}

function optionalStringField<Key extends string>(
  key: Key,
  value: unknown
): Partial<Record<Key, string>> {
  return typeof value === "string" ? ({ [key]: value } as Record<Key, string>) : {};
}

function upstreamBehaviorView(): JsonUINode {
  return {
    $children: [
      {
        $comp: "Edit",
        id: "name",
        label: "First name",
        path: "/profile/firstName",
        store: "data"
      }
    ],
    $comp: "View",
    $validations: [
      {
        path: "/profile/firstName",
        schema: { minLength: 1, type: "string" },
        store: "data"
      }
    ],
    id: "form"
  };
}

function unifoldBehaviorDocument() {
  return {
    $schema: UiContractSchemaUri.Version1,
    catalog: { name: CoreCatalogName.UnifoldCore, version: CoreCatalogVersion.Version1 },
    compositions: [],
    id: "jsonui-behavior-parity",
    jsonUiProfile: {
      name: JsonUiProfileName.Unifold,
      upstream: JsonUiUpstreamRevision.Version01025,
      version: JsonUiProfileVersion.Version1
    },
    revision: "1",
    schemaVersion: UiSchemaVersion.Version1,
    stores: [storeDefinition()],
    view: {
      $comp: "TextField",
      id: "name",
      label: "First name",
      name: "firstName",
      path: "/profile/firstName",
      required: true,
      store: "data"
    }
  };
}

function storeDefinition() {
  return {
    access: UiStoreAccess.ReadWriteDraft,
    classification: DataClassification.Internal,
    id: "data",
    initialData: UiStoreInitialDataPolicy.Required,
    maxBytes: 65_536,
    migrations: { maximum: "1.0.0", minimum: "1.0.0" },
    ownership: UiStoreOwnership.Host,
    persistence: UiStorePersistence.Memory,
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      properties: {
        profile: {
          properties: { firstName: { type: "string" } },
          required: ["firstName"],
          type: "object"
        }
      },
      required: ["profile"],
      type: "object"
    },
    schemaVersion: UiStoreSchemaVersion.Version1,
    source: { kind: UiStoreSourceKind.Host }
  };
}

function initialData() {
  return { profile: { firstName: "John" } };
}

function readName(value: unknown): string {
  const profile = (value as { readonly profile?: { readonly firstName?: unknown } }).profile;
  return typeof profile?.firstName === "string" ? profile.firstName : "";
}

function mountPoint(section: HTMLElement, kind: string): HTMLElement {
  const element = document.createElement("div");
  element.dataset["parityRenderer"] = kind;
  section.append(element);
  return element;
}

interface MutableBehaviorParityResult extends BehaviorParityResult {
  canonicalEvents: NormalizedCanonicalEvent[];
  unifoldStoreValue: string;
}

interface RuntimeEventLike {
  readonly causationid?: string;
  readonly correlationid: string;
  readonly data: {
    readonly change?: unknown;
    readonly disclosure?: { readonly mode?: string; readonly reason?: string };
    readonly phase: string;
    readonly snapshot?: unknown;
    readonly sourceNode?: { readonly id: string };
  };
  readonly id: string;
  readonly sequence: number;
  readonly source: string;
  readonly staterevision: number;
  readonly transactionid: string;
  readonly type: string;
}
