import { ElementEventType } from "@unislang/unifold-elements";
import {
  expect,
  readRenderBaseline,
  test,
  type UnifoldHarness
} from "@unislang/unifold-playwright";

import { compositionNodeIds } from "./reference.scenarios.js";

type ScenarioPage = Parameters<typeof readRenderBaseline>[0];

test("renders semantic content and publishes Link activation", async ({ page, unifold }) => {
  await page.goto("/");
  await page.getByText("Help and support").click();
  await expect(page.getByRole("img", { name: "Support information" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Support resources" })).toBeVisible();
  await expect(
    page.getByText("Choose a support path or review the framework documentation.")
  ).toBeVisible();
  await expect(nodeHost(page, compositionNodeIds.supportAlert).getByRole("status")).toContainText(
    "Context preserved"
  );
  const link = page.getByRole("link", { name: "Framework documentation" });
  await expect(link).toHaveAttribute("href", "#support-resources");
  await link.click();
  await expect(page).toHaveURL(/#support-resources$/);
  await expect.poll(async () => linkActivationCount(unifold)).toBe(1);
  expect(requireLinkActivation(await unifold.events()).data).toMatchObject({
    change: { href: "#support-resources", target: "_self" },
    snapshot: {
      properties: { href: "#support-resources", label: "Framework documentation", target: "_self" }
    },
    sourceNode: { id: compositionNodeIds.supportLink }
  });
});

function nodeHost(page: ScenarioPage, id: string) {
  return page.locator(`[data-unifold-node-id="${id}"]`);
}

async function linkActivationCount(unifold: UnifoldHarness): Promise<number> {
  return (await unifold.events()).filter(isLinkActivation).length;
}

function requireLinkActivation(events: Awaited<ReturnType<UnifoldHarness["events"]>>) {
  const activation = events.find(isLinkActivation);
  if (activation === undefined) throw new Error("Link activation event is missing.");
  return activation;
}

function isLinkActivation(event: Awaited<ReturnType<UnifoldHarness["events"]>>[number]): boolean {
  if (event.type !== ElementEventType.ComponentActivated) return false;
  return event.data.sourceNode?.id === compositionNodeIds.supportLink;
}
