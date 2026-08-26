import {
  expect,
  readRenderBaseline,
  readRenderUpdates,
  test,
  type UnifoldHarness
} from "@unislang/unifold-playwright";
import { UiEventType } from "@unislang/unifold-events";
import { ElementEventType } from "@unislang/unifold-elements";
import { assertSelectiveUpdates } from "@unislang/unifold-testkit";

import { compositionNodeIds } from "./reference.scenarios.js";

type ScenarioPage = Parameters<typeof readRenderBaseline>[0];

const editedValues = {
  biography: "Computing pioneer",
  confirmName: "Ada Lovelace",
  contactPreference: "phone",
  country: "ca",
  name: "Ada Lovelace",
  newsletter: true,
  skills: ["ts", "a11y"]
};

const initialValues = {
  biography: "",
  confirmName: "",
  contactPreference: "email",
  country: "us",
  name: "",
  newsletter: false,
  skills: ["ts"]
};

test("submits heterogeneous values, omits disabled controls, and resets atomically", async ({
  page,
  unifold
}) => {
  await page.goto("/");
  await editForm(page);
  await page.getByRole("button", { name: "Create greeting" }).click();
  await expect.poll(async () => hasEventType(unifold, UiEventType.FormSubmitted)).toBe(true);
  expect((await lastEventOfType(unifold, UiEventType.FormSubmitted))?.data.change).toEqual({
    values: editedValues
  });
  const baseline = await readRenderBaseline(page, lifecycleNodeIds());
  await page.getByRole("button", { name: "Reset profile" }).click();
  await expect.poll(async () => hasEventType(unifold, UiEventType.FormReset)).toBe(true);
  await assertResetState(page);
  const resetEvents = resetSequence(await unifold.events());
  expect(resetEvents.at(-1)?.data.change).toEqual({ values: initialValues });
  expect(resetEvents.map(({ type }) => type)).toEqual([
    ElementEventType.ComponentActivated,
    ElementEventType.FormResetRequested,
    UiEventType.CommandApplied,
    UiEventType.TransactionCommitted,
    UiEventType.FormReset
  ]);
  assertSelectiveUpdates(await readRenderUpdates(page, baseline), resetUpdateExpectation());
});

async function editForm(page: ScenarioPage): Promise<void> {
  await page.getByLabel("Your name").fill(editedValues.name);
  await page.getByLabel("Confirm name").fill(editedValues.confirmName);
  await page.getByLabel("Biography").fill(editedValues.biography);
  await page.getByLabel("Receive product updates").check();
  await page.getByLabel("Phone").check();
  await page.getByLabel("Country").selectOption(editedValues.country);
  await page.getByLabel("Skills").selectOption(editedValues.skills);
}

async function assertResetState(page: ScenarioPage): Promise<void> {
  await expect(page.getByLabel("Your name")).toHaveValue(initialValues.name);
  await expect(page.getByLabel("Confirm name")).toHaveValue(initialValues.confirmName);
  await expect(page.getByLabel("Biography")).toHaveValue(initialValues.biography);
  await expect(page.getByLabel("Receive product updates")).not.toBeChecked();
  await expect(page.getByLabel("Email")).toBeChecked();
  await expect(page.getByLabel("Country")).toHaveValue(initialValues.country);
  await expect(page.getByLabel("Skills")).toHaveValues(initialValues.skills);
  await expect(page.getByLabel("Internal note")).toBeDisabled();
  await expect(page.getByTestId("submitted-value")).toHaveText("");
}

function resetUpdateExpectation() {
  return {
    affectedNodeIds: [
      compositionNodeIds.name,
      compositionNodeIds.confirmName,
      compositionNodeIds.biography,
      compositionNodeIds.checkbox,
      compositionNodeIds.radioGroup,
      compositionNodeIds.country,
      compositionNodeIds.multiSelect,
      compositionNodeIds.submit
    ],
    unaffectedNodeIds: [compositionNodeIds.form, compositionNodeIds.internalNote]
  };
}

function lifecycleNodeIds(): readonly string[] {
  return [
    compositionNodeIds.form,
    compositionNodeIds.name,
    compositionNodeIds.confirmName,
    compositionNodeIds.biography,
    compositionNodeIds.checkbox,
    compositionNodeIds.radioGroup,
    compositionNodeIds.country,
    compositionNodeIds.multiSelect,
    compositionNodeIds.internalNote,
    compositionNodeIds.submit
  ];
}

async function hasEventType(unifold: UnifoldHarness, type: UiEventType): Promise<boolean> {
  return (await unifold.events()).some((event) => event.type === type);
}

async function lastEventOfType(unifold: UnifoldHarness, type: UiEventType) {
  return [...(await unifold.events())].reverse().find((event) => event.type === type);
}

function resetSequence(events: Awaited<ReturnType<UnifoldHarness["events"]>>) {
  const index = events.map(({ type }) => type).lastIndexOf(UiEventType.FormReset);
  return events.slice(index - 4, index + 1);
}
