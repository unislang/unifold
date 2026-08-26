import { UnifoldApplicationUpdateStatus } from "@unislang/unifold";
import { expect, test } from "@unislang/unifold-playwright";

test("renders and safely revises a bounded authorized audit timeline", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  const initial = await reviseAuditLog(page, "initial");
  expect(initial.status, JSON.stringify(initial.diagnostics)).toBe(
    UnifoldApplicationUpdateStatus.Applied
  );
  const audit = page.locator("#app unifold-audit-log");
  await assertInitialAudit(audit, unifold);
  await rememberAuditLog(audit);
  await assertRevisions(page, audit, unifold);
});

async function assertInitialAudit(
  audit: import("@playwright/test").Locator,
  unifold: { assertAccessibility(): Promise<void> }
): Promise<void> {
  const region = audit.getByRole("region", { name: "Account history <script>" });
  const viewport = audit.locator('[part="viewport"]');
  await expect(audit).toHaveCount(1);
  await expect(region).toHaveCount(1);
  expect(await audit.getByRole("listitem").count()).toBeLessThanOrEqual(200);
  await expect(audit.getByRole("listitem").first()).toHaveAttribute("aria-setsize", "10000");
  await expect(audit.locator("time").first()).toHaveAttribute("datetime", "2026-08-25T12:00:00Z");
  await expect(audit).toContainText('<img src=x onerror="alert(1)">');
  await expect(audit.locator("img")).toHaveCount(0);
  await viewport.focus();
  await expect(viewport).toBeFocused();
  await unifold.assertAccessibility();
}

async function assertRevisions(
  page: import("@playwright/test").Page,
  audit: import("@playwright/test").Locator,
  unifold: { assertAccessibility(): Promise<void> }
): Promise<void> {
  const viewport = audit.locator('[part="viewport"]');
  const rejected = await reviseAuditLog(page, "invalid");
  expect(rejected.status).toBe(UnifoldApplicationUpdateStatus.Rejected);
  await expect(audit.getByRole("listitem").first()).toContainText("change 0");
  expect(await retainedAuditLog(audit)).toBe(true);
  await expect(viewport).toBeFocused();

  expect((await reviseAuditLog(page, "recovered")).status).toBe(
    UnifoldApplicationUpdateStatus.Applied
  );
  await expect(audit.getByRole("listitem")).toHaveCount(1);
  await expect(audit.getByRole("listitem")).toContainText("Recovered change");
  expect(await retainedAuditLog(audit)).toBe(true);
  await expect(viewport).toBeFocused();
  await unifold.assertAccessibility();
}

async function reviseAuditLog(
  page: import("@playwright/test").Page,
  revision: AuditRevisionName
): Promise<AuditUpdateResult> {
  return page.evaluate(applyAuditUpdate, auditRevision(revision));
}

function applyAuditUpdate(update: AuditRevision): AuditUpdateResult {
  const target = window as unknown as AuditWindow;
  const source = structuredClone(target.__unifoldAuthoredDocument);
  source["compositions"] = [];
  source["machines"] = [];
  delete source["semantics"];
  source.revision = update.revision;
  source.view = {
    $comp: "AuditLog",
    entries: update.entries,
    id: source.view.id,
    itemHeight: 72,
    label: "Account history <script>",
    viewportHeight: 360
  };
  return target.__unifoldUpdateDocument(source);
}

function auditRevision(revision: AuditRevisionName): AuditRevision {
  if (revision === "recovered") {
    return { entries: [entry(10_001, "Recovered change")], revision };
  }
  const entries = Array.from({ length: 10_000 }, (_, index) => entry(index, `change ${index}`));
  if (revision === "invalid") entries[1] = { ...entry(1, "invalid"), id: "event-0" };
  return { entries, revision };
}

function entry(index: number, summary: string): Record<string, string> {
  return {
    action: "updated",
    actor: `Operator ${index}`,
    correlationId: `request-${index}`,
    id: `event-${index}`,
    summary: `${summary} <img src=x onerror="alert(1)">`,
    timestamp: "2026-08-25T12:00:00Z"
  };
}

async function rememberAuditLog(audit: import("@playwright/test").Locator): Promise<void> {
  await audit.evaluate((element) => {
    (window as unknown as AuditWindow).__unifoldStableAuditLog = element;
  });
}

async function retainedAuditLog(audit: import("@playwright/test").Locator): Promise<boolean> {
  return audit.evaluate(
    (element) => (window as unknown as AuditWindow).__unifoldStableAuditLog === element
  );
}

type AuditRevisionName = "initial" | "invalid" | "recovered";

interface AuditRevision {
  readonly entries: readonly Readonly<Record<string, string>>[];
  readonly revision: AuditRevisionName;
}

interface AuditWindow {
  readonly __unifoldAuthoredDocument: AuditDocument;
  __unifoldStableAuditLog?: Element;
  readonly __unifoldUpdateDocument: (source: AuditDocument) => AuditUpdateResult;
}

interface AuditDocument extends Record<string, unknown> {
  revision: string;
  view: Record<string, unknown> & { id: string };
}

interface AuditUpdateResult {
  readonly diagnostics?: readonly unknown[];
  readonly status: UnifoldApplicationUpdateStatus;
}
