import {
  CoreCatalogName,
  CoreCatalogVersion,
  JsonUiProfileName,
  JsonUiProfileVersion,
  JsonUiUpstreamRevision,
  UiContractSchemaUri,
  UiSchemaVersion,
  type JsonObject
} from "@unislang/unifold-contracts";
import type { UnifoldAuditLog } from "@unislang/unifold-elements";
import {
  mountUnifoldApplication,
  UnifoldApplicationMountStatus,
  type UnifoldApplicationPort
} from "@unislang/unifold";

import { percentile } from "./profile-statistics.js";

const AUDIT_ENTRY_COUNT = 10_000;
export const AUDIT_RENDERED_ENTRY_LIMIT = 200;
const STARTUP_P95_LIMIT_MILLISECONDS = 1_000;
const SCROLL_P95_LIMIT_MILLISECONDS = 100;
const PROFILE_SAMPLES = 20;

interface MountedAuditLog {
  readonly application: UnifoldApplicationPort;
  readonly auditLog: UnifoldAuditLog;
  readonly container: HTMLElement;
}

interface AuditScrollMeasurement {
  readonly firstRenderedId: string;
  readonly renderedEntries: number;
  readonly scrollMilliseconds: number;
}

export async function measureAuditLogPerformance() {
  disposeAuditLog(await mountAuditLog());
  const startupSamples: number[] = [];
  const scrollSamples: AuditScrollMeasurement[] = [];
  for (let sample = 0; sample < PROFILE_SAMPLES; sample += 1) {
    const started = performance.now();
    const mounted = await mountAuditLog();
    startupSamples.push(performance.now() - started);
    scrollSamples.push(await scrollAuditLog(mounted));
    disposeAuditLog(mounted);
  }
  return performanceEvidence(startupSamples, scrollSamples);
}

export async function mountAuditLog(): Promise<MountedAuditLog> {
  const container = document.createElement("main");
  document.body.append(container);
  const mounted = mountUnifoldApplication(auditDocument(), container);
  if (mounted.status !== UnifoldApplicationMountStatus.Mounted) {
    container.remove();
    throw new Error(`AuditLog mount failed: ${JSON.stringify(mounted.diagnostics)}`);
  }
  const auditLog = container.querySelector<UnifoldAuditLog>("unifold-audit-log");
  if (auditLog === null) throw new Error("Mounted AuditLog is missing.");
  await auditLog.updateComplete;
  return { application: mounted.application, auditLog, container };
}

export async function scrollAuditLog(mounted: MountedAuditLog): Promise<AuditScrollMeasurement> {
  const root = mounted.auditLog.shadowRoot;
  if (root === null) throw new Error("AuditLog shadow root is missing.");
  const viewport = root.querySelector<HTMLElement>("[part=viewport]");
  if (viewport === null) throw new Error("AuditLog viewport is missing.");
  const started = performance.now();
  viewport.scrollTop = 9_900 * 72;
  viewport.dispatchEvent(new Event("scroll"));
  await mounted.auditLog.updateComplete;
  const entries = [...root.querySelectorAll<HTMLElement>("[data-entry-id]")];
  return {
    firstRenderedId: entryId(entries[0]),
    renderedEntries: entries.length,
    scrollMilliseconds: performance.now() - started
  };
}

function entryId(entry: HTMLElement | undefined): string {
  if (entry === undefined) return "";
  return entry.dataset["entryId"] ?? "";
}

export function disposeAuditLog(mounted: MountedAuditLog): void {
  mounted.application.dispose();
  mounted.container.remove();
}

function auditDocument(): JsonObject {
  return {
    $schema: UiContractSchemaUri.Version1,
    catalog: { name: CoreCatalogName.UnifoldCore, version: CoreCatalogVersion.Version1 },
    compositions: [],
    id: "audit-log-performance",
    jsonUiProfile: {
      name: JsonUiProfileName.Unifold,
      upstream: JsonUiUpstreamRevision.Version01025,
      version: JsonUiProfileVersion.Version1
    },
    revision: "1",
    schemaVersion: UiSchemaVersion.Version1,
    view: {
      $comp: "AuditLog",
      entries: auditEntries(),
      id: "audit-log",
      itemHeight: 72,
      label: "Account history",
      viewportHeight: 480
    }
  };
}

function auditEntries(): readonly JsonObject[] {
  return Array.from({ length: AUDIT_ENTRY_COUNT }, (_, index) => ({
    action: "updated",
    actor: `Operator ${index}`,
    correlationId: `request-${index}`,
    id: `event-${index}`,
    summary: `Changed record ${index}`,
    timestamp: "2026-08-25T12:00:00Z"
  }));
}

function performanceEvidence(
  startupSamples: readonly number[],
  scrollSamples: readonly AuditScrollMeasurement[]
) {
  const startup = statistics(startupSamples);
  const distantScroll = statistics(
    scrollSamples.map(({ scrollMilliseconds }) => scrollMilliseconds)
  );
  const maximumRenderedEntries = Math.max(
    ...scrollSamples.map(({ renderedEntries }) => renderedEntries)
  );
  const exact = scrollSamples.every(({ firstRenderedId }) => firstRenderedId === "event-9896");
  return {
    distantScroll,
    entryCount: AUDIT_ENTRY_COUNT,
    gates: auditGates(startup, distantScroll, maximumRenderedEntries, exact),
    maximumRenderedEntries,
    renderedEntryLimit: AUDIT_RENDERED_ENTRY_LIMIT,
    sampleCount: PROFILE_SAMPLES,
    startup
  };
}

function auditGates(
  startup: ReturnType<typeof statistics>,
  distantScroll: ReturnType<typeof statistics>,
  maximumRenderedEntries: number,
  exact: boolean
) {
  return [
    gate(
      "10k-entry AuditLog startup",
      startup,
      STARTUP_P95_LIMIT_MILLISECONDS,
      maximumRenderedEntries,
      true
    ),
    gate(
      "10k-entry AuditLog distant scroll",
      distantScroll,
      SCROLL_P95_LIMIT_MILLISECONDS,
      maximumRenderedEntries,
      exact
    )
  ];
}

function gate(
  name: string,
  timing: ReturnType<typeof statistics>,
  limit: number,
  renderedEntries: number,
  exact: boolean
) {
  return {
    actualP95Milliseconds: timing.p95Milliseconds,
    actualRenderedEntries: renderedEntries,
    limitP95Milliseconds: limit,
    name,
    passed:
      timing.p95Milliseconds <= limit && renderedEntries <= AUDIT_RENDERED_ENTRY_LIMIT && exact,
    renderedEntryLimit: AUDIT_RENDERED_ENTRY_LIMIT
  };
}

function statistics(samples: readonly number[]) {
  return {
    maximumMilliseconds: Math.max(...samples),
    p50Milliseconds: percentile(samples, 0.5),
    p95Milliseconds: percentile(samples, 0.95),
    p99Milliseconds: percentile(samples, 0.99)
  };
}
