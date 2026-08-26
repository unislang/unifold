import {
  expect,
  readRenderBaseline,
  readRenderUpdates,
  test,
  type UnifoldHarness
} from "@unislang/unifold-playwright";
import { assertSelectiveUpdates } from "@unislang/unifold-testkit";

test("executes rules, semantics, event routing, and selective projection", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  await verifyGuardDenial(page);
  const summary = await enableSummary(page);
  await summary.click();
  await verifySummary(page, unifold);
});

async function verifyGuardDenial(page: Parameters<typeof readRenderBaseline>[0]): Promise<void> {
  await page.locator("[data-unifold-node-id='show-summary']").evaluate((host) => {
    const emit = Reflect.get(host, "emitUiEvent") as (
      type: string,
      change: Readonly<Record<string, string>>
    ) => void;
    emit.call(host, "org.unifold.ui.component.activated.v1", { action: "button" });
  });
  await expect(page.getByTestId("machine-state")).toHaveText("editing");
  await expect(page.getByText("Summary not created", { exact: true })).toBeVisible();
}

async function enableSummary(page: Parameters<typeof readRenderBaseline>[0]) {
  const summary = page.getByRole("button", { name: "Create summary" });
  await expect(summary).toBeDisabled();
  await page.getByLabel("Your name").fill("Ada Lovelace");
  const baseline = await readRenderBaseline(page, [
    "contact-consent",
    "show-summary",
    "contact-name"
  ]);
  await page.getByLabel("I agree to create the summary").check();
  await expect(summary).toBeEnabled();
  assertSelectiveUpdates(await readRenderUpdates(page, baseline), {
    affectedNodeIds: ["contact-consent", "show-summary"],
    unaffectedNodeIds: ["contact-name"]
  });
  return summary;
}

async function verifySummary(
  page: Parameters<typeof readRenderBaseline>[0],
  unifold: UnifoldHarness
): Promise<void> {
  await expect(page.getByText("Summary created", { exact: true })).toBeVisible();
  await expect(page.getByTestId("machine-state")).toHaveText("summarized");
  await expect.poll(() => semanticName(page)).toBe("Ada Lovelace");
  expect((await unifold.events()).map(({ type }) => type)).toEqual(
    expect.arrayContaining([
      "org.unifold.ui.component.activated.v1",
      "org.unifold.ui.command.applied.v1",
      "org.unifold.ui.transaction.committed.v1"
    ])
  );
}

test("has no serious or critical detectable accessibility violations", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  await unifold.assertAccessibility();
});

async function semanticName(page: Parameters<typeof readRenderBaseline>[0]) {
  return page.locator("script[data-unifold-semantics]").evaluate((element) => {
    const graph = JSON.parse(element.textContent ?? "{}") as { "@graph": [{ name: string }] };
    return graph["@graph"][0].name;
  });
}
