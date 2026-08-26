import { UiEventType } from "@unislang/unifold-events";
import { expect, test, type UnifoldHarness } from "@unislang/unifold-playwright";

import { compositionNodeIds } from "./reference.scenarios.js";

test("validates and recovers a Standard Schema cross-field rule", async ({ page, unifold }) => {
  await page.goto("/");
  await page.getByLabel("Your name").fill("Ada Lovelace");
  await page.getByLabel("Confirm name").fill("Grace Hopper");
  await page.getByRole("button", { name: "Create greeting" }).click();
  await expect.poll(async () => hasEventType(unifold, UiEventType.FormInvalid)).toBe(true);
  const form = page.getByRole("form", { name: "Profile" });
  const confirm = page.getByLabel("Confirm name");
  await expect(confirm).toHaveAttribute("aria-invalid", "true");
  await expect(form.getByText("Names must match.")).toHaveCount(2);
  expect(await lastEventOfType(unifold, UiEventType.FormInvalid)).toMatchObject({
    data: {
      change: {
        errors: [
          {
            affectedIds: [compositionNodeIds.confirmName],
            code: "names-match",
            parameters: { path: "confirmName" },
            validatorId: "names-match"
          }
        ]
      }
    }
  });
  await confirm.fill("Ada Lovelace");
  await expect(form.getByText("Names must match.")).toHaveCount(0);
  await page.getByRole("button", { name: "Create greeting" }).click();
  await expect.poll(async () => hasEventType(unifold, UiEventType.FormSubmitted)).toBe(true);
});

test("reprojects an unchanged field when an aggregate-owned issue changes", async ({ page }) => {
  await page.goto("/");
  const name = page.getByLabel("Your name");
  const confirm = page.getByLabel("Confirm name");
  await name.fill("Ada");
  await confirm.fill("Grace");
  await page.getByRole("button", { name: "Create greeting" }).click();
  await expect(confirm).toHaveAttribute("aria-invalid", "true");

  await name.fill("Grace");
  await expect(confirm).toHaveAttribute("aria-invalid", "false");
  await name.fill("Ada");
  await expect(confirm).toHaveAttribute("aria-invalid", "true");
});

async function hasEventType(unifold: UnifoldHarness, type: UiEventType): Promise<boolean> {
  return (await unifold.events()).some((event) => event.type === type);
}

async function lastEventOfType(unifold: UnifoldHarness, type: UiEventType) {
  return [...(await unifold.events())].reverse().find((event) => event.type === type);
}
