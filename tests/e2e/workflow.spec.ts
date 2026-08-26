import { UnifoldApplicationUpdateStatus } from "@unislang/unifold";
import { ElementEventType } from "@unislang/unifold-elements";
import { expect, test, type UnifoldHarness } from "@unislang/unifold-playwright";

type CapturedEvent = Awaited<ReturnType<UnifoldHarness["events"]>>[number];

test("selects an accessible workflow step through canonical state", async ({ page, unifold }) => {
  await page.goto("/");
  expect((await reviseWorkflow(page, "Stepper", "initial")).status).toBe(
    UnifoldApplicationUpdateStatus.Applied
  );
  const stepper = page.locator("#app unifold-stepper");
  await expect(stepper.getByRole("navigation", { name: "Checkout <progress>" })).toHaveCount(1);
  await expect(stepButton(stepper, 0)).toHaveAttribute("aria-current", "step");
  await expect(stepButton(stepper, 1)).toBeDisabled();
  await expect(stepper).toContainText('<img src=x onerror="alert(1)">');
  expect(await stepper.locator("img").count()).toBe(0);
  await rememberHost(stepper, "Stepper");

  await stepButton(stepper, 0).focus();
  await stepButton(stepper, 0).press("ArrowRight");
  await expect(stepButton(stepper, 2)).toBeFocused();
  await stepButton(stepper, 2).press("Enter");
  await expect(stepButton(stepper, 2)).toHaveAttribute("aria-current", "step");
  await expect.poll(async () => latestValue(await unifold.events(), "Stepper")).toBe("review");
  await unifold.assertAccessibility();

  await assertStepperRecovery(page, stepper);
});

test("navigates a composed wizard through controlled JSON state", async ({ page, unifold }) => {
  await page.goto("/");
  expect((await reviseWorkflow(page, "Wizard", "initial")).status).toBe(
    UnifoldApplicationUpdateStatus.Applied
  );
  const wizard = page.locator("#app unifold-wizard");
  const children = wizard.locator(":scope > unifold-text");
  await expect(children).toHaveCount(3);
  await expect(children.nth(0)).toBeVisible();
  await expect(children.nth(1)).toBeHidden();
  await expect(stepButton(wizard, 2)).toBeDisabled();
  await rememberHost(wizard, "Wizard");
  await rememberFirstPanel(children.first());

  await wizard.locator('[part="next"]').click();
  await expect(children.nth(0)).toBeHidden();
  await expect(children.nth(2)).toBeVisible();
  await expect(wizard.locator('[part="panel"]')).toBeFocused();
  await expect.poll(async () => latestValue(await unifold.events(), "Wizard")).toBe("review");
  await wizard.locator('[part="complete"]').click();
  await expect.poll(async () => completionValue(await unifold.events())).toBe("review");
  await unifold.assertAccessibility();

  await assertWizardRecovery(page, wizard, children);
});

async function assertWizardRecovery(
  page: import("@playwright/test").Page,
  wizard: import("@playwright/test").Locator,
  children: import("@playwright/test").Locator
): Promise<void> {
  expect((await reviseWorkflow(page, "Wizard", "invalid")).status).toBe(
    UnifoldApplicationUpdateStatus.Rejected
  );
  expect(await retainedHost(wizard, "Wizard")).toBe(true);
  expect(await retainedFirstPanel(children.first())).toBe(true);
  expect((await reviseWorkflow(page, "Wizard", "recovered")).status).toBe(
    UnifoldApplicationUpdateStatus.Applied
  );
  await expect(stepButton(wizard, 0)).toContainText("Updated Account");
  expect(await retainedHost(wizard, "Wizard")).toBe(true);
  expect(await retainedFirstPanel(children.first())).toBe(true);
}

function stepButton(host: import("@playwright/test").Locator, index: number) {
  return host.locator(`[data-step-index="${index}"]`);
}

function latestValue(events: readonly CapturedEvent[], type: "Stepper" | "Wizard"): unknown {
  const event = [...events]
    .reverse()
    .find(
      (candidate) =>
        candidate.type === ElementEventType.ControlInput && candidate.data.sourceNode?.type === type
    );
  return recordValue(event?.data.change, "value");
}

function completionValue(events: readonly CapturedEvent[]): unknown {
  const event = [...events]
    .reverse()
    .find(
      (candidate) =>
        candidate.type === ElementEventType.ComponentActivated &&
        candidate.data.sourceNode?.type === "Wizard"
    );
  return recordValue(event?.data.change, "value");
}

function recordValue(value: unknown, key: string): unknown {
  if (Object.prototype.toString.call(value) !== "[object Object]") return undefined;
  return (value as Readonly<Record<string, unknown>>)[key];
}

async function reviseWorkflow(
  page: import("@playwright/test").Page,
  type: "Stepper" | "Wizard",
  revision: RevisionName
): Promise<UpdateResult> {
  return page.evaluate(applyWorkflowUpdate, workflowRevision(type, revision));
}

function applyWorkflowUpdate(update: WorkflowRevision): UpdateResult {
  const target = window as unknown as WorkflowWindow;
  const source = structuredClone(target.__unifoldAuthoredDocument);
  source["compositions"] = [];
  source["machines"] = [];
  delete source["semantics"];
  source.revision = update.revision;
  source.view = { ...update.view, id: source.view.id };
  return target.__unifoldUpdateDocument(source);
}

function workflowRevision(type: "Stepper" | "Wizard", revision: RevisionName): WorkflowRevision {
  const steps = [
    {
      description: '<img src=x onerror="alert(1)">',
      id: "account",
      label: `${revisionPrefix(revision)}Account`
    },
    { disabled: true, id: "billing", label: "Billing" },
    { id: finalStepId(type, revision), label: "Review" }
  ];
  const children = workflowChildren(type, revision);
  const common = {
    $comp: type,
    id: "workflow",
    label: workflowLabel(type),
    steps,
    value: revisionValue(revision)
  };
  return {
    revision: `${type}-${revision}`,
    view: workflowView(common, type, children)
  };
}

async function assertStepperRecovery(
  page: import("@playwright/test").Page,
  stepper: import("@playwright/test").Locator
): Promise<void> {
  expect((await reviseWorkflow(page, "Stepper", "invalid")).status).toBe(
    UnifoldApplicationUpdateStatus.Rejected
  );
  expect(await retainedHost(stepper, "Stepper")).toBe(true);
  await expect(stepButton(stepper, 2)).toBeFocused();
  expect((await reviseWorkflow(page, "Stepper", "recovered")).status).toBe(
    UnifoldApplicationUpdateStatus.Applied
  );
  await expect(stepButton(stepper, 0)).toContainText("Updated Account");
  expect(await retainedHost(stepper, "Stepper")).toBe(true);
}

function workflowLabel(type: "Stepper" | "Wizard"): string {
  return type === "Wizard" ? "Create account" : "Checkout <progress>";
}

function revisionValue(revision: RevisionName): string {
  return revision === "initial" ? "account" : "review";
}

function workflowView(
  common: WorkflowView,
  type: "Stepper" | "Wizard",
  children: readonly Record<string, unknown>[]
): WorkflowView {
  return type === "Stepper" ? common : { ...common, $children: children };
}

function revisionPrefix(revision: RevisionName): string {
  return revision === "recovered" ? "Updated " : "";
}

function finalStepId(type: "Stepper" | "Wizard", revision: RevisionName): string {
  return [type, revision].join(":") === "Stepper:invalid" ? "account" : "review";
}

function workflowChildren(
  type: "Stepper" | "Wizard",
  revision: RevisionName
): Record<string, unknown>[] {
  const children = ["Account content", "Billing content", "Review content"].map(
    (content, index) => ({ $comp: "Text", content, id: `workflow-panel-${index}` })
  );
  return [type, revision].join(":") === "Wizard:invalid" ? children.slice(0, -1) : children;
}

async function rememberHost(
  host: import("@playwright/test").Locator,
  type: "Stepper" | "Wizard"
): Promise<void> {
  await host.evaluate((element, key) => {
    const target = window as unknown as WorkflowWindow;
    target.__unifoldStableHosts ??= {};
    target.__unifoldStableHosts[key] = element;
  }, type);
}

async function retainedHost(
  host: import("@playwright/test").Locator,
  type: "Stepper" | "Wizard"
): Promise<boolean> {
  return host.evaluate(
    (element, key) => (window as unknown as WorkflowWindow).__unifoldStableHosts?.[key] === element,
    type
  );
}

async function rememberFirstPanel(panel: import("@playwright/test").Locator): Promise<void> {
  await panel.evaluate((element) => {
    (window as unknown as WorkflowWindow).__unifoldStablePanel = element;
  });
}

async function retainedFirstPanel(panel: import("@playwright/test").Locator): Promise<boolean> {
  return panel.evaluate(
    (element) => (window as unknown as WorkflowWindow).__unifoldStablePanel === element
  );
}

type RevisionName = "initial" | "invalid" | "recovered";

interface WorkflowRevision {
  readonly revision: string;
  readonly view: WorkflowView;
}

interface WorkflowWindow {
  readonly __unifoldAuthoredDocument: WorkflowDocument;
  __unifoldStableHosts?: Record<string, Element>;
  __unifoldStablePanel?: Element;
  readonly __unifoldUpdateDocument: (source: WorkflowDocument) => UpdateResult;
}

interface WorkflowDocument extends Record<string, unknown> {
  revision: string;
  view: WorkflowView;
}

type WorkflowView = Record<string, unknown> & { id: string };

interface UpdateResult {
  readonly diagnostics?: readonly unknown[];
  readonly status: UnifoldApplicationUpdateStatus;
}
