import { expect, test } from "@unislang/unifold-playwright";
import {
  UnifoldApplicationDiagnosticStage,
  UnifoldApplicationUpdateStatus,
  type UnifoldApplicationUpdateResult
} from "@unislang/unifold";
import { UiCommandType, UiEventType, type UiEvent } from "@unislang/unifold-events";
import type { Page } from "@playwright/test";

enum AtomicFailure {
  Renderer = "renderer",
  Semantics = "semantics"
}

for (const failure of [AtomicFailure.Renderer, AtomicFailure.Semantics]) {
  test(`keeps a ${failure} failure private and publishes only the retry`, async ({
    page,
    unifold
  }) => {
    await preparePage(page);
    const result = await observeAtomicUpdate(page, failure);
    expectRejected(result, failure);
    expectRetry(result);
    expectApplied(result);
    await expect(page.getByLabel("Atomic full name")).toBeFocused();
    await unifold.assertAccessibility();
  });
}

async function preparePage(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-unifold-readiness", "ready");
  const input = page.getByLabel("Your name");
  await input.fill("Ada Lovelace");
  await input.focus();
}

function observeAtomicUpdate(page: Page, failure: AtomicFailure): Promise<AtomicObservation> {
  return page.evaluate((kind) => {
    const probe = (window as unknown as AtomicWindow).__unifoldProbeAtomicUpdate;
    if (probe === undefined) throw new Error("Missing atomic update probe.");
    return probe(kind);
  }, failure);
}

function expectRejected(result: AtomicObservation, failure: AtomicFailure): void {
  expect(result.rejected).toMatchObject({
    diagnostics: [{ stage: expectedStage(failure) }],
    revision: result.baselineRevision,
    status: UnifoldApplicationUpdateStatus.Rejected
  });
  expect(result.failedEvents).toEqual([]);
  expect(result.failedState).toMatchObject({
    fieldLabel: "Your name",
    focused: true,
    sameField: true,
    sameInput: true,
    sameStable: true,
    revision: result.baselineRevision,
    semantic: result.baselineSemantic,
    semanticType: "Person",
    value: "Ada Lovelace"
  });
}

function expectRetry(result: AtomicObservation): void {
  expect(result.applied.status).toBe(UnifoldApplicationUpdateStatus.Applied);
  expect(result.retryTypes.slice(0, 2)).toEqual([
    UiEventType.CommandApplied,
    UiEventType.TransactionCommitted
  ]);
  expect(result.retryTypes.slice(2).every(isValidationFact)).toBe(true);
  expect(result.retryCommandTypes).toEqual([UiCommandType.StructureReconcile]);
  expect(result.retrySequences).toEqual(
    result.retrySequences.map((_, index) => result.baselineSequence + index + 1)
  );
  const transactionIndex = result.retryTypes.indexOf(UiEventType.TransactionCommitted);
  expect(result.commitObservation).toEqual({
    fieldLabel: "Atomic full name",
    revision: result.retryRevisions[transactionIndex],
    semantic: result.appliedState.semantic,
    semanticType: "Organization"
  });
  expect(result.appliedState.semantic).toMatchObject({
    count: 1,
    owner: result.baselineSemantic.owner
  });
}

function isValidationFact(type: string): boolean {
  return [
    UiEventType.TransactionCommitted,
    UiEventType.ValidationCancelled,
    UiEventType.ValidationStarted
  ].includes(type as UiEventType);
}

function expectApplied(result: AtomicObservation): void {
  expect(result.appliedState).toMatchObject({
    fieldLabel: "Atomic full name",
    focused: true,
    sameField: true,
    sameInput: true,
    sameStable: true,
    revision: result.applied.revision,
    semanticType: "Organization",
    stableRenderCount: result.failedState.stableRenderCount,
    value: "Ada Lovelace"
  });
  expect(JSON.parse(result.appliedState.semantic.serialized)).toEqual(
    expectedOrganizationGraph(result.baselineSemantic.serialized)
  );
}

function expectedOrganizationGraph(serialized: string): SemanticGraph {
  const baseline = JSON.parse(serialized) as SemanticGraph;
  return {
    ...baseline,
    "@graph": baseline["@graph"].map((entity) =>
      entity["@id"] === "urn:unifold:person:current"
        ? { ...entity, "@type": "Organization" }
        : entity
    )
  };
}

function expectedStage(failure: AtomicFailure): UnifoldApplicationDiagnosticStage {
  return failure === AtomicFailure.Renderer
    ? UnifoldApplicationDiagnosticStage.Renderer
    : UnifoldApplicationDiagnosticStage.Semantics;
}

interface AtomicWindow extends Window {
  __unifoldProbeAtomicUpdate?: (failure: AtomicFailure) => AtomicObservation;
}

interface CommitObservation {
  readonly fieldLabel: string;
  readonly revision: number;
  readonly semantic: SemanticObservation;
  readonly semanticType: string | undefined;
}

interface StateObservation extends CommitObservation {
  readonly focused: boolean;
  readonly sameField: boolean;
  readonly sameInput: boolean;
  readonly sameStable: boolean;
  readonly stableRenderCount: string | undefined;
  readonly value: string;
}

interface AtomicObservation {
  readonly applied: UnifoldApplicationUpdateResult;
  readonly appliedState: StateObservation;
  readonly baselineRevision: number;
  readonly baselineSemantic: SemanticObservation;
  readonly baselineSequence: number;
  readonly commitObservation: CommitObservation | undefined;
  readonly failedEvents: readonly UiEvent[];
  readonly failedState: StateObservation;
  readonly rejected: UnifoldApplicationUpdateResult;
  readonly retryCommandTypes: readonly string[];
  readonly retryRevisions: readonly number[];
  readonly retrySequences: readonly number[];
  readonly retryTypes: readonly string[];
}

interface SemanticObservation {
  readonly count: number;
  readonly owner: string | undefined;
  readonly serialized: string;
}

interface SemanticGraph {
  readonly "@graph": readonly Readonly<Record<string, unknown>>[];
  readonly [property: string]: unknown;
}
