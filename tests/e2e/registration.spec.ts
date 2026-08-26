import {
  ElementRegistrationDiagnosticCode,
  ElementRegistrationStatus,
  UnifoldApplicationMountStatus
} from "@unislang/unifold";
import { expect, test } from "@unislang/unifold-playwright";

test("mounts a second application idempotently in the same native registry", async ({ page }) => {
  await page.goto("/");

  const result = await page.evaluate(() => {
    const target = window as unknown as Partial<RegistrationWindow>;
    if (target.__unifoldMountRealmCopy === undefined) throw new Error("Mount hook is missing.");
    return target.__unifoldMountRealmCopy();
  });

  expect(result).toEqual({ childCount: 1, status: UnifoldApplicationMountStatus.Mounted });
  await expect(page.locator("#app > [data-unifold-node-id='profile-editor']")).toHaveCount(1);
});

test("rejects an incompatible iframe realm without partial definitions", async ({ page }) => {
  await page.goto("/");

  const result = await page.evaluate(() => {
    const target = window as unknown as RegistrationWindow;
    const defineElements = target.__unifoldDefineElements;
    const iframe = document.createElement("iframe");
    document.body.append(iframe);
    const realm = iframe.contentWindow as Window & typeof globalThis;
    realm.customElements.define("unifold-button", class extends realm.HTMLElement {});
    const registration = defineElements(realm.customElements);
    const outcome = {
      code: registration.diagnostics[0].code,
      iframeTextFieldDefined: realm.customElements.get("unifold-text-field") !== undefined,
      parentButtonDefined: customElements.get("unifold-button") !== undefined,
      status: registration.status
    };
    iframe.remove();
    return outcome;
  });

  expect(result).toEqual({
    code: ElementRegistrationDiagnosticCode.ForeignDefinition,
    iframeTextFieldDefined: false,
    parentButtonDefined: true,
    status: ElementRegistrationStatus.Rejected
  });
});

interface RegistrationWindow {
  __unifoldDefineElements(registry: CustomElementRegistry): RegistrationResult;
  __unifoldMountRealmCopy(): { childCount: number; status: UnifoldApplicationMountStatus };
}

interface RegistrationResult {
  readonly diagnostics: readonly [
    { readonly code: ElementRegistrationDiagnosticCode },
    ...{ readonly code: ElementRegistrationDiagnosticCode }[]
  ];
  readonly status: ElementRegistrationStatus;
}
