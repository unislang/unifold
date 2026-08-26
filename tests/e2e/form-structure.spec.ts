import { expect, test } from "@playwright/test";

import { compositionNodeIds } from "./reference.scenarios.js";
import type { DynamicNode, DynamicWindow } from "./reference.types.js";

test("keeps nested fields in native FormData and applies fieldset disablement", async ({
  page
}) => {
  await gotoReady(page);
  await page.getByLabel("Secondary email").fill("backup@example.com");
  expect(await nativeFormValue(page, "secondaryEmail")).toBe("backup@example.com");

  await updateNode(page, "communication-preferences", { disabled: true });

  const host = page.locator(nodeSelector(compositionNodeIds.communicationPreferences));
  expect(await host.evaluate((element) => element.querySelector("fieldset")?.disabled)).toBe(true);
  await expect(page.getByLabel("Secondary email")).toBeDisabled();
  expect(await nativeFormValue(page, "secondaryEmail")).toBeNull();
});

test("announces aggregate errors and focuses their exact control target", async ({ page }) => {
  await gotoReady(page);
  await updateNode(page, "form-errors", {
    errors: [{ message: "Enter your name", targetId: compositionNodeIds.name }]
  });

  const summary = page.locator(nodeSelector(compositionNodeIds.formErrors));
  await expect(summary.getByRole("alert")).toContainText("There is a problem");
  await summary.getByRole("link", { name: "Enter your name" }).click();
  await expect(page.getByLabel("Your name")).toBeFocused();
});

test("projects field label, help, and exactly one stable control", async ({ page }) => {
  await gotoReady(page);
  const field = page.locator(nodeSelector("profile-editor::preferred-name-field"));
  expect(
    await field.evaluate((element) =>
      element.querySelector('[role="group"]')?.getAttribute("aria-describedby")
    )
  ).toBe("profile-editor::preferred-name-field__field-help");
  expect(
    await field.evaluate(
      (element, selector) => element.querySelectorAll(selector).length,
      nodeSelector("profile-editor::preferred-name")
    )
  ).toBe(1);
  await expect(field).toContainText("Optional; used in informal messages.");
});

async function updateNode(
  page: import("@playwright/test").Page,
  localId: string,
  patch: Partial<DynamicNode>
): Promise<void> {
  const result = await page.evaluate(
    ({ localId, patch }) => {
      const target = window as unknown as DynamicWindow;
      const source = structuredClone(target.__unifoldAuthoredDocument);
      source.revision = `form-structure-${localId}`;
      const childrenOf = (node: DynamicNode): readonly DynamicNode[] => {
        return Array.isArray(node.$children) ? node.$children : [];
      };
      const nodes: DynamicNode[] = [source.compositions[0].template];
      for (const current of nodes) {
        nodes.push(...childrenOf(current));
      }
      const node = nodes.find(({ id }) => id === localId);
      if (node === undefined) throw new Error(`Missing form-structure node: ${localId}`);
      Object.assign(node, patch);
      return target.__unifoldUpdateDocument(source);
    },
    { localId, patch }
  );
  expect(result.status).toBe("applied");
}

async function nativeFormValue(
  page: import("@playwright/test").Page,
  name: string
): Promise<FormDataEntryValue | null> {
  return page.locator(nodeSelector(compositionNodeIds.form)).evaluate((host, entryName) => {
    const form = host.shadowRoot?.querySelector("form");
    if (!(form instanceof HTMLFormElement)) throw new Error("Native form is missing.");
    return new FormData(form).get(entryName);
  }, name);
}

function nodeSelector(nodeId: string): string {
  return `[data-unifold-node-id="${nodeId}"]`;
}

async function gotoReady(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/");
  await page.locator("html[data-unifold-readiness=ready]").waitFor();
}
