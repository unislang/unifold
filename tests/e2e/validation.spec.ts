import { ElementEventType } from "@unislang/unifold-elements";
import { UiEventPhase, UiEventType } from "@unislang/unifold-events";
import { expect, test } from "@unislang/unifold-playwright";
import {
  AccessibilityImpact,
  ColorMode,
  InputModality,
  ScenarioActionType,
  ScenarioSelectorKind,
  ScenarioVersion,
  defineScenario
} from "@unislang/unifold-testkit";

import { compositionNodeIds } from "./reference.scenarios.js";

const invalidFormScenario = defineScenario({
  scenarioVersion: ScenarioVersion.Version1,
  id: "reference-invalid-form-accessibility",
  title: "Invalid required form accessibility",
  route: "/",
  environment: {
    colorMode: ColorMode.Light,
    inputModality: InputModality.Keyboard,
    locale: "en-US",
    viewport: { width: 1280, height: 720 }
  },
  actions: [
    {
      type: ScenarioActionType.Click,
      target: {
        kind: ScenarioSelectorKind.Role,
        name: "Create greeting",
        value: "button"
      }
    }
  ],
  expectedEvents: [
    {
      phase: UiEventPhase.Intent,
      sourceNodeId: compositionNodeIds.submit,
      type: ElementEventType.ComponentActivated
    },
    {
      phase: UiEventPhase.Intent,
      sourceNodeId: compositionNodeIds.form,
      type: ElementEventType.FormSubmitRequested
    },
    { phase: UiEventPhase.State, type: UiEventType.CommandApplied },
    { phase: UiEventPhase.State, type: UiEventType.TransactionCommitted },
    {
      phase: UiEventPhase.State,
      sourceNodeId: compositionNodeIds.form,
      type: UiEventType.FormInvalid
    }
  ],
  expectedUpdates: {
    affectedNodeIds: [compositionNodeIds.name, compositionNodeIds.form],
    unaffectedNodeIds: [compositionNodeIds.checkbox, compositionNodeIds.internalNote]
  },
  accessibility: {
    forbiddenImpacts: [AccessibilityImpact.Critical, AccessibilityImpact.Serious],
    keyboardOnly: true
  }
});

test("projects required errors accessibly and emits a canonical invalid fact", async ({
  page,
  unifold
}) => {
  await unifold.run(invalidFormScenario);
  const name = page.getByLabel("Your name");
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("This field is required.")).toHaveCount(2);
  const invalid = (await unifold.events()).at(-1);
  expect(invalid?.type).toBe(UiEventType.FormInvalid);
  expect(invalid?.data.change).toMatchObject({
    errors: [{ code: "required", validatorId: "required" }]
  });
});

test("clears validation projection and submits after correction", async ({ page, unifold }) => {
  await page.goto("/");
  const submit = page.getByRole("button", { name: "Create greeting" });
  const name = page.getByLabel("Your name");
  await submit.click();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await name.fill("Ada Lovelace");
  await expect(name).toHaveAttribute("aria-invalid", "false");
  await expect(page.getByText("This field is required.")).toHaveCount(0);
  await submit.click();
  await expect(page.getByTestId("submitted-value")).toHaveText("Ada Lovelace");
  expect((await unifold.events()).some(({ type }) => type === UiEventType.FormSubmitted)).toBe(
    true
  );
});
