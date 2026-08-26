import { ElementEventType, type UnifoldFileInput } from "@unislang/unifold-elements";
import { expect, test } from "@unislang/unifold-playwright";

import { compositionNodeIds } from "./reference.scenarios.js";

const PDF_BYTES = Buffer.from("private customer evidence");

test("selects bounded files without admitting bytes into canonical JSON state", async ({
  page,
  unifold
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/");
  await expect.poll(() => definitionStatus(page, pageErrors)).toBe(true);
  expect(pageErrors).toEqual([]);
  const picker = page.getByLabel("Account attachments");
  await picker.setInputFiles([
    filePayload("evidence.pdf", "application/pdf", PDF_BYTES),
    filePayload("wrong.txt", "text/plain", Buffer.from("reject me"))
  ]);

  const input = await lastFileInput(unifold);
  await assertSelectionEvidence(page, input);
  await unifold.assertAccessibility();
});

async function assertSelectionEvidence(
  page: import("@playwright/test").Page,
  input: Awaited<ReturnType<typeof lastFileInput>>
): Promise<void> {
  expect(input?.data.change).toEqual({
    origin: "input",
    rejectedCount: 1,
    value: [
      {
        id: expect.stringMatching(/^[0-9a-f-]{36}$/u),
        size: PDF_BYTES.byteLength,
        type: "application/pdf"
      }
    ],
    selectedCount: 1
  });
  expect(JSON.stringify(input)).not.toContain("private customer evidence");
  expect(JSON.stringify(input)).not.toContain("evidence.pdf");
  expect(JSON.stringify(input)).not.toContain("lastModified");
  await expect(page.getByRole("list", { name: "Selected files" })).toContainText(
    `application/pdf (${PDF_BYTES.byteLength} bytes)`
  );
  await expect(page.getByRole("list", { name: "Selected files" })).not.toContainText(
    "evidence.pdf"
  );
  expect(await selectedHandleEvidence(page)).toEqual({ count: 1 });
}

async function definitionStatus(
  page: import("@playwright/test").Page,
  pageErrors: readonly string[]
) {
  if (pageErrors.length > 0) throw new Error(pageErrors.join("\n"));
  return page.evaluate(() => customElements.get("unifold-file-input") !== undefined);
}

function filePayload(name: string, mimeType: string, buffer: Buffer) {
  return { buffer, mimeType, name };
}

async function lastFileInput(unifold: import("@unislang/unifold-playwright").UnifoldHarness) {
  return [...(await unifold.events())]
    .reverse()
    .find(
      (event) =>
        event.type === ElementEventType.ControlInput &&
        event.data.sourceNode?.id === compositionNodeIds.accountAttachments
    );
}

function selectedHandleEvidence(page: import("@playwright/test").Page) {
  return page
    .locator(`[data-unifold-node-id="${compositionNodeIds.accountAttachments}"]`)
    .evaluate((element) => {
      const input = element as UnifoldFileInput;
      const count = input.value.filter(
        ({ id }) => input.resolveSelectedFile(id) !== undefined
      ).length;
      return { count };
    });
}
