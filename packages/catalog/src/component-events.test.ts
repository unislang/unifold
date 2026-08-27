import { CoreComponentType, UiComponentEventBinding } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { getCoreComponentEvents } from "./component-events.js";

it("declares supported workflow signals for every component", () => {
  expect(Object.values(CoreComponentType).map(getCoreComponentEvents)).toHaveLength(
    Object.values(CoreComponentType).length
  );
  expect(getCoreComponentEvents(CoreComponentType.Button)).toEqual([
    UiComponentEventBinding.Activated
  ]);
  expect(getCoreComponentEvents(CoreComponentType.TextField)).toEqual([
    UiComponentEventBinding.Input,
    UiComponentEventBinding.Blurred
  ]);
  expect(getCoreComponentEvents(CoreComponentType.Popover)).toEqual([
    UiComponentEventBinding.Activated
  ]);
  expectActivated(CoreComponentType.Pagination);
  expect(getCoreComponentEvents(CoreComponentType.Breadcrumb)).toEqual([
    UiComponentEventBinding.Activated
  ]);
  expect(getCoreComponentEvents(CoreComponentType.Dialog)).toEqual([
    UiComponentEventBinding.Activated
  ]);
  expectActivated(CoreComponentType.Toast);
  expect(getCoreComponentEvents(CoreComponentType.FileInput)).toEqual([
    UiComponentEventBinding.Input,
    UiComponentEventBinding.Blurred
  ]);
  expect(getCoreComponentEvents("Unknown")).toEqual([]);
});

function expectActivated(type: CoreComponentType): void {
  expect(getCoreComponentEvents(type)).toEqual([UiComponentEventBinding.Activated]);
}
